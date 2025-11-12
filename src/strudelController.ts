import * as vscode from 'vscode';
import * as path from 'path';
import { StrudelBrowser } from './strudelBrowser';

// ============================================================
// TYPES & INTERFACES
// ============================================================

/**
 * Configuration interface for Strudel settings
 */
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

/**
 * Position in the editor (1-based row, 0-based column)
 */
interface CursorPosition {
    row: number;
    col: number;
}

// ============================================================
// STRUDEL CONTROLLER
// ============================================================

/**
 * Controller for managing Strudel browser sessions and document synchronization
 */
export class StrudelController {
    private browser: StrudelBrowser | null = null;
    private activeDocument: vscode.TextDocument | null = null;
    private config: StrudelConfig;
    private isProcessingChange = false;
    private disposables: vscode.Disposable[] = [];

    constructor(private context: vscode.ExtensionContext) {
        this.config = this.loadConfig();
        this.watchConfigurationChanges();
    }

    // ============================================================
    // CONFIGURATION
    // ============================================================

    /**
     * Watches for configuration changes and reloads config when needed
     */
    private watchConfigurationChanges(): void {
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('strudel')) {
                    this.config = this.loadConfig();
                }
            })
        );
    }

    /**
     * Loads the Strudel configuration from VS Code settings
     */
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

    // ============================================================
    // BROWSER LIFECYCLE
    // ============================================================

    /**
     * Launches a new Strudel browser session
     */
    async launch(): Promise<void> {
        if (this.browser) {
            vscode.window.showWarningMessage('Strudel is already running. Use "Quit Strudel" to close it first.');
            return;
        }

        try {
            this.browser = new StrudelBrowser(this.config, this.context);
            this.setupBrowserEventHandlers();
            
            await this.browser.launch();
            vscode.window.showInformationMessage('Launching Strudel browser...');
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to launch Strudel: ${error}`);
        }
    }

    /**
     * Sets up event handlers for browser events
     */
    private setupBrowserEventHandlers(): void {
        if (!this.browser) return;

        this.browser.onReady(() => {
            vscode.window.showInformationMessage('Strudel browser is ready!');
            this.setActiveEditor(); // Automatically sync current editor
        });

        this.browser.onContentChanged((content: string) => {
            this.handleContentFromBrowser(content);
        });

        this.browser.onCursorChanged((position: CursorPosition) => {
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
    }

    /**
     * Quits the active Strudel browser session
     */
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

    // ============================================================
    // PLAYBACK CONTROL
    // ============================================================

    /**
     * Toggles playback (play/pause)
     */
    async toggle(): Promise<void> {
        if (!this.validateBrowserSession()) return;

        try {
            await this.browser!.toggle();
        } catch (error) {
            vscode.window.showErrorMessage(`Error toggling playback: ${error}`);
        }
    }

    /**
     * Updates the code in the browser (evaluates current document)
     */
    async update(): Promise<void> {
        if (!this.validateBrowserSession()) return;

        try {
            await this.browser!.update();
        } catch (error) {
            vscode.window.showErrorMessage(`Error updating code: ${error}`);
        }
    }

    /**
     * Stops playback
     */
    async stop(): Promise<void> {
        if (!this.validateBrowserSession()) return;

        try {
            await this.browser!.stop();
        } catch (error) {
            vscode.window.showErrorMessage(`Error stopping playback: ${error}`);
        }
    }

    /**
     * Validates that a browser session exists
     */
    private validateBrowserSession(): boolean {
        if (!this.browser) {
            vscode.window.showWarningMessage('No active Strudel session');
            return false;
        }
        return true;
    }

    // ============================================================
    // DOCUMENT MANAGEMENT
    // ============================================================

    /**
     * Sets the active editor as the source for Strudel synchronization
     */
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

    /**
     * Executes the current document (sets as active and updates)
     */
    async execute(): Promise<void> {
        if (this.setActiveEditor()) {
            // Small delay to ensure content is synced before updating
            setTimeout(() => {
                this.update();
            }, 50);
        }
    }

    /**
     * Checks if a document is a Strudel-compatible file
     */
    private isStrudelDocument(document: vscode.TextDocument): boolean {
        const fileName = document.fileName.toLowerCase();
        return fileName.endsWith('.str') || 
               fileName.endsWith('.std') || 
               document.languageId === 'javascript' ||
               document.languageId === 'strudel';
    }

    // ============================================================
    // EDITOR EVENT HANDLERS
    // ============================================================

    /**
     * Handles document content changes
     */
    onDocumentChanged(event: vscode.TextDocumentChangeEvent): void {
        if (!this.shouldSyncDocument(event.document)) return;
        this.sendCurrentDocumentContent();
    }

    /**
     * Handles cursor position changes in the editor
     */
    onCursorPositionChanged(event: vscode.TextEditorSelectionChangeEvent): void {
        if (!this.shouldSyncCursor(event.textEditor.document)) return;

        const selection = event.selections[0];
        if (selection) {
            // Convert to 1-based row for browser
            this.browser!.sendCursorPosition(selection.active.line + 1, selection.active.character);
        }
    }

    /**
     * Handles document save events
     */
    onDocumentSaved(document: vscode.TextDocument): void {
        if (!this.browser || !this.config.updateOnSave || !this.activeDocument) {
            return;
        }

        if (this.isActiveDocument(document)) {
            // Use refresh instead of update to only update if already playing
            this.browser.refresh();
        }
    }

    /**
     * Handles active editor changes (switching between files)
     */
    onActiveEditorChanged(editor: vscode.TextEditor | undefined): void {
        if (!editor || !this.browser) return;

        // Auto-sync when switching to a Strudel document
        if (this.isStrudelDocument(editor.document)) {
            this.activeDocument = editor.document;
            this.sendCurrentDocumentContent();
        }
    }

    // ============================================================
    // SYNCHRONIZATION HELPERS
    // ============================================================

    /**
     * Checks if document changes should be synced
     */
    private shouldSyncDocument(document: vscode.TextDocument): boolean {
        return !!(this.browser && !this.isProcessingChange && this.activeDocument && 
                  this.isActiveDocument(document));
    }

    /**
     * Checks if cursor changes should be synced
     */
    private shouldSyncCursor(document: vscode.TextDocument): boolean {
        return !!(this.browser && this.config.syncCursor && this.activeDocument && 
                  !this.isProcessingChange && this.isActiveDocument(document));
    }

    /**
     * Checks if the given document is the active synced document
     */
    private isActiveDocument(document: vscode.TextDocument): boolean {
        return document.uri.toString() === this.activeDocument?.uri.toString();
    }

    /**
     * Sends the current document content to the browser
     */
    private sendCurrentDocumentContent(): void {
        if (!this.browser || !this.activeDocument) return;

        const content = this.activeDocument.getText().replace(/\r\n/g, '\n');
        this.browser.sendContent(content);

        // Send cursor position after content
        this.sendCurrentCursorPosition();
    }

    /**
     * Sends the current cursor position to the browser
     */
    private sendCurrentCursorPosition(): void {
        const editor = vscode.window.activeTextEditor;
        if (editor && this.config.syncCursor) {
            const selection = editor.selection;
            setTimeout(() => {
                this.browser?.sendCursorPosition(selection.active.line + 1, selection.active.character);
            }, 50);
        }
    }

    // ============================================================
    // BROWSER-TO-EDITOR SYNCHRONIZATION
    // ============================================================

    /**
     * Handles content changes from the browser
     */
    private handleContentFromBrowser(content: string): void {
        if (!this.activeDocument) return;

        // Prevent infinite loops
        if (this.activeDocument.getText() === content) return;

        this.isProcessingChange = true;

        // Find and apply the minimal change
        const currentContent = this.activeDocument.getText();
        this.applyContentChange(currentContent, content);

        // Reset the flag after a short delay
        setTimeout(() => {
            this.isProcessingChange = false;
        }, 100);
    }

    /**
     * Applies content changes using minimal diff to avoid disrupting cursor position
     */
    private async applyContentChange(oldContent: string, newContent: string): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !this.isActiveDocument(editor.document)) return;

        const diffRange = this.findDiffRange(oldContent, newContent);
        if (diffRange) {
            await editor.edit(editBuilder => {
                editBuilder.replace(diffRange.range, diffRange.replacement);
            });
        }
    }

    /**
     * Finds the minimal range that differs between old and new content
     */
    private findDiffRange(oldContent: string, newContent: string): { range: vscode.Range; replacement: string } | null {
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

        if (start >= endOld && start >= endNew) {
            return null; // No changes
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) return null;

        const startPos = editor.document.positionAt(start);
        const endPos = editor.document.positionAt(endOld);
        const range = new vscode.Range(startPos, endPos);
        const replacement = newContent.substring(start, endNew);

        return { range, replacement };
    }

    /**
     * Handles cursor position changes from the browser
     */
    private handleCursorFromBrowser(position: CursorPosition): void {
        if (!this.config.syncCursor || !this.activeDocument || this.isProcessingChange) return;

        const editor = vscode.window.activeTextEditor;
        if (!editor || !this.isActiveDocument(editor.document)) return;

        this.isProcessingChange = true;

        const newPosition = this.calculateEditorPosition(editor, position);
        this.updateEditorCursor(editor, newPosition);

        setTimeout(() => {
            this.isProcessingChange = false;
        }, 100);
    }

    /**
     * Calculates the editor position from browser position (with bounds checking)
     */
    private calculateEditorPosition(editor: vscode.TextEditor, position: CursorPosition): vscode.Position {
        // Convert 1-based row to 0-based and clamp to valid range
        const line = Math.max(0, Math.min(position.row - 1, editor.document.lineCount - 1));
        const lineText = editor.document.lineAt(line).text;
        const character = Math.max(0, Math.min(position.col, lineText.length));

        return new vscode.Position(line, character);
    }

    /**
     * Updates the editor cursor position and reveals it
     */
    private updateEditorCursor(editor: vscode.TextEditor, position: vscode.Position): void {
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position));
    }

    // ============================================================
    // CLEANUP
    // ============================================================

    /**
     * Disposes of resources
     */
    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.browser?.quit();
    }
}