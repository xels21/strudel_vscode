import * as vscode from 'vscode';
import { HydraPanel } from './hydraPanel';

// ============================================================
// HYDRA CONTROLLER
// ============================================================

/**
 * Controller for managing Hydra visual live coding sessions
 */
export class HydraController {
    private panel: HydraPanel;
    private isActive = false;

    constructor(private context: vscode.ExtensionContext) {
        this.panel = new HydraPanel(context);
        this.setupEventListeners();
    }

    // ============================================================
    // EVENT LISTENERS
    // ============================================================

    /**
     * Sets up event listeners for editor and document changes
     */
    private setupEventListeners(): void {
        // Listen for file changes to detect when .hydra files are opened
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && this.isHydraFile(editor.document)) {
                this.activate();
            }
        });

        // Listen for file saves to auto-execute on save
        vscode.workspace.onDidSaveTextDocument(document => {
            if (this.isHydraFile(document) && this.isActive) {
                this.evalDocument();
            }
        });
    }

    // ============================================================
    // FILE TYPE CHECKING
    // ============================================================

    /**
     * Checks if a document is a Hydra file
     */
    private isHydraFile(document: vscode.TextDocument): boolean {
        return document.languageId === 'hydra' || 
               document.fileName.endsWith('.hydra');
    }

    // ============================================================
    // HYDRA MODE MANAGEMENT
    // ============================================================

    /**
     * Activates Hydra mode when a .hydra file is opened
     */
    activate(): void {
        if (!this.isActive) {
            this.isActive = true;
            vscode.window.showInformationMessage('Hydra mode activated!');
        }
    }

    /**
     * Evaluates the current Hydra document
     */
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

    /**
     * Clears the Hydra output
     */
    clear(): void {
        this.panel.clear();
        vscode.window.showInformationMessage('Hydra output cleared');
    }

    // ============================================================
    // CLEANUP
    // ============================================================

    /**
     * Disposes of resources
     */
    dispose(): void {
        this.panel.dispose();
        this.isActive = false;
    }
}