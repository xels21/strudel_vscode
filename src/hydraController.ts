import * as vscode from 'vscode';
import { HydraPanel } from './hydraPanel';

export class HydraController {
    private panel: HydraPanel;
    private isActive = false;

    constructor(private context: vscode.ExtensionContext) {
        this.panel = new HydraPanel(context);
        this.setupEventListeners();
    }

    private setupEventListeners() {
        // Listen for file changes to detect when .hydra files are opened
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && this.isHydraFile(editor.document)) {
                this.activate();
            }
        });

        // Listen for file saves
        vscode.workspace.onDidSaveTextDocument(document => {
            if (this.isHydraFile(document) && this.isActive) {
                this.evalDocument();
            }
        });
    }

    private isHydraFile(document: vscode.TextDocument): boolean {
        return document.languageId === 'hydra' || 
               document.fileName.endsWith('.hydra');
    }

    activate() {
        if (!this.isActive) {
            this.isActive = true;
            vscode.window.showInformationMessage('Hydra mode activated!');
        }
    }

    evalDocument(): void {
        const activeEditor = vscode.window.activeTextEditor;
        
        if (!activeEditor) {
            vscode.window.showErrorMessage('No active text editor');
            return;
        }

        if (!this.isHydraFile(activeEditor.document)) {
            vscode.window.showWarningMessage('This is not a Hydra file (.hydra)');
            return;
        }

        const code = activeEditor.document.getText();
        if (code.trim()) {
            this.panel.evalCode(code);
            vscode.window.showInformationMessage('Hydra code executed');
        } else {
            vscode.window.showWarningMessage('No code to execute');
        }
    }

    clear(): void {
        this.panel.clear();
        vscode.window.showInformationMessage('Hydra output cleared');
    }

    dispose(): void {
        this.panel.dispose();
        this.isActive = false;
    }
}