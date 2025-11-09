import * as vscode from 'vscode';
import * as path from 'path';
import { StrudelBrowser } from './strudelBrowser';

export interface StrudelConfig {
    ui: {
        maximizeMenuPanel: boolean;
        hideMenuPanel: boolean;
        hideTopBar: boolean;
        hideCodeEditor: boolean;
        hideErrorDisplay: boolean;
    };
    updateOnSave: boolean;
    syncCursor: boolean;
    reportEvalErrors: boolean;
    customCssFile: string;
    headless: boolean;
    browserDataDir: string;
    browserExecutablePath: string;
}

export class StrudelController {
    private browser: StrudelBrowser | null = null;
    private activeDocument: vscode.TextDocument | null = null;
    private config: StrudelConfig;
    private isProcessingChange = false;
    private disposables: vscode.Disposable[] = [];

    constructor(private context: vscode.ExtensionContext) {
        this.config = this.loadConfig();
        
        // Watch for configuration changes
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('strudel')) {
                    this.config = this.loadConfig();
                }
            })
        );
    }

    private loadConfig(): StrudelConfig {
        const config = vscode.workspace.getConfiguration('strudel');
        
        return {
            ui: {
                maximizeMenuPanel: config.get('ui.maximizeMenuPanel', false),
                hideMenuPanel: config.get('ui.hideMenuPanel', false),
                hideTopBar: config.get('ui.hideTopBar', false),
                hideCodeEditor: config.get('ui.hideCodeEditor', false),
                hideErrorDisplay: config.get('ui.hideErrorDisplay', false),
            },
            updateOnSave: config.get('updateOnSave', true),
            syncCursor: config.get('syncCursor', true),
            reportEvalErrors: config.get('reportEvalErrors', true),
            customCssFile: config.get('customCssFile', ''),
            headless: config.get('headless', false),
            browserDataDir: config.get('browserDataDir', ''),
            browserExecutablePath: config.get('browserExecutablePath', ''),
        };
    }

    async launch(): Promise<void> {
        if (this.browser) {
            vscode.window.showWarningMessage('Strudel is already running. Use "Quit Strudel" to close it first.');
            return;
        }

        try {
            this.browser = new StrudelBrowser(this.config, this.context);
            
            // Setup event handlers
            this.browser.onReady(() => {
                vscode.window.showInformationMessage('Strudel browser is ready!');
                this.setActiveEditor(); // Automatically sync current editor
            });

            this.browser.onContentChanged((content: string) => {
                this.handleContentFromBrowser(content);
            });

            this.browser.onCursorChanged((position: { row: number; col: number }) => {
                this.handleCursorFromBrowser(position);
            });

            this.browser.onEvalError((error: string) => {
                if (this.config.reportEvalErrors) {
                    vscode.window.showErrorMessage(`Strudel Error: ${error}`);
                }
            });

            this.browser.onClosed(() => {
                this.browser = null;
                vscode.window.showInformationMessage('Strudel session closed');
            });

            await this.browser.launch();
            vscode.window.showInformationMessage('Launching Strudel browser...');
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to launch Strudel: ${error}`);
        }
    }

    async quit(): Promise<void> {
        if (!this.browser) {
            vscode.window.showWarningMessage('No active Strudel session');
            return;
        }

        try {
            await this.browser.quit();
            this.browser = null;
        } catch (error) {
            vscode.window.showErrorMessage(`Error quitting Strudel: ${error}`);
        }
    }

    async toggle(): Promise<void> {
        if (!this.browser) {
            vscode.window.showWarningMessage('No active Strudel session');
            return;
        }

        try {
            await this.browser.toggle();
        } catch (error) {
            vscode.window.showErrorMessage(`Error toggling playback: ${error}`);
        }
    }

    async update(): Promise<void> {
        if (!this.browser) {
            vscode.window.showWarningMessage('No active Strudel session');
            return;
        }

        try {
            await this.browser.update();
        } catch (error) {
            vscode.window.showErrorMessage(`Error updating code: ${error}`);
        }
    }

    async stop(): Promise<void> {
        if (!this.browser) {
            vscode.window.showWarningMessage('No active Strudel session');
            return;
        }

        try {
            await this.browser.stop();
        } catch (error) {
            vscode.window.showErrorMessage(`Error stopping playback: ${error}`);
        }
    }

    setActiveEditor(): boolean {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return false;
        }

        if (!this.isStrudelDocument(editor.document)) {
            vscode.window.showWarningMessage('Current document is not a Strudel file (.str or .std) or JavaScript file');
            return false;
        }

        this.activeDocument = editor.document;
        this.sendCurrentDocumentContent();

        const fileName = path.basename(editor.document.fileName);
        vscode.window.showInformationMessage(`Strudel is now syncing with: ${fileName}`);
        return true;
    }

    async execute(): Promise<void> {
        if (this.setActiveEditor()) {
            // Small delay to ensure content is synced before updating
            setTimeout(() => {
                this.update();
            }, 50);
        }
    }

    onDocumentChanged(event: vscode.TextDocumentChangeEvent): void {
        if (!this.browser || this.isProcessingChange || !this.activeDocument) {
            return;
        }

        if (event.document.uri.toString() === this.activeDocument.uri.toString()) {
            this.sendCurrentDocumentContent();
        }
    }

    onCursorPositionChanged(event: vscode.TextEditorSelectionChangeEvent): void {
        if (!this.browser || !this.config.syncCursor || !this.activeDocument || this.isProcessingChange) {
            return;
        }

        if (event.textEditor.document.uri.toString() === this.activeDocument.uri.toString()) {
            const selection = event.selections[0];
            if (selection) {
                this.browser.sendCursorPosition(selection.active.line + 1, selection.active.character);
            }
        }
    }

    onDocumentSaved(document: vscode.TextDocument): void {
        if (!this.browser || !this.config.updateOnSave || !this.activeDocument) {
            return;
        }

        if (document.uri.toString() === this.activeDocument.uri.toString()) {
            // Use refresh instead of update to only update if already playing
            this.browser.refresh();
        }
    }

    onActiveEditorChanged(editor: vscode.TextEditor | undefined): void {
        if (!editor || !this.browser) {
            return;
        }

        // Auto-sync when switching to a Strudel document
        if (this.isStrudelDocument(editor.document)) {
            this.activeDocument = editor.document;
            this.sendCurrentDocumentContent();
        }
    }

    private isStrudelDocument(document: vscode.TextDocument): boolean {
        const fileName = document.fileName.toLowerCase();
        return fileName.endsWith('.str') || 
               fileName.endsWith('.std') || 
               document.languageId === 'javascript' ||
               document.languageId === 'strudel';
    }

    private sendCurrentDocumentContent(): void {
        if (!this.browser || !this.activeDocument) {
            return;
        }

        const content = this.activeDocument.getText();
        this.browser.sendContent(content);

        // Send cursor position after content
        const editor = vscode.window.activeTextEditor;
        if (editor && this.config.syncCursor) {
            const selection = editor.selection;
            setTimeout(() => {
                this.browser?.sendCursorPosition(selection.active.line + 1, selection.active.character);
            }, 50);
        }
    }

    private handleContentFromBrowser(content: string): void {
        if (!this.activeDocument) {
            return;
        }

        // Prevent infinite loops
        if (this.activeDocument.getText() === content) {
            return;
        }

        this.isProcessingChange = true;

        // Find and apply the minimal change
        const currentContent = this.activeDocument.getText();
        this.applyContentChange(currentContent, content);

        // Reset the flag after a short delay
        setTimeout(() => {
            this.isProcessingChange = false;
        }, 100);
    }

    private async applyContentChange(oldContent: string, newContent: string): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.uri.toString() !== this.activeDocument?.uri.toString()) {
            return;
        }

        // Find the range that needs to be replaced
        let start = 0;
        let endOld = oldContent.length;
        let endNew = newContent.length;

        // Find first difference
        while (start < oldContent.length && start < newContent.length && 
               oldContent[start] === newContent[start]) {
            start++;
        }

        // Find last difference
        while (endOld > start && endNew > start && 
               oldContent[endOld - 1] === newContent[endNew - 1]) {
            endOld--;
            endNew--;
        }

        if (start < endOld || start < endNew) {
            const startPos = editor.document.positionAt(start);
            const endPos = editor.document.positionAt(endOld);
            const range = new vscode.Range(startPos, endPos);
            const replacement = newContent.substring(start, endNew);

            await editor.edit(editBuilder => {
                editBuilder.replace(range, replacement);
            });
        }
    }

    private handleCursorFromBrowser(position: { row: number; col: number }): void {
        if (!this.config.syncCursor || !this.activeDocument || this.isProcessingChange) {
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.uri.toString() !== this.activeDocument.uri.toString()) {
            return;
        }

        this.isProcessingChange = true;

        // Convert 1-based row to 0-based and clamp to valid range
        const line = Math.max(0, Math.min(position.row - 1, editor.document.lineCount - 1));
        const lineText = editor.document.lineAt(line).text;
        const character = Math.max(0, Math.min(position.col, lineText.length));

        const newPosition = new vscode.Position(line, character);
        editor.selection = new vscode.Selection(newPosition, newPosition);
        editor.revealRange(new vscode.Range(newPosition, newPosition));

        setTimeout(() => {
            this.isProcessingChange = false;
        }, 100);
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        if (this.browser) {
            this.browser.quit();
        }
    }
}