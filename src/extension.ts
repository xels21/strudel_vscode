import * as vscode from 'vscode';
import { StrudelController } from './strudelController';
import { HydraController } from './hydraController';
import { CombinedCompletionProvider } from './combinedCompletionProvider';
import { CombinedHoverProvider } from './combinedHoverProvider';
import { InlayHintsProvider } from './inlayHintsProvider';

// ============================================================================
// Module-level Variables
// ============================================================================

let strudelController: StrudelController;
let hydraController: HydraController;
let completionProvider: vscode.Disposable;
let hoverProvider: vscode.Disposable;
let inlayHintsProvider: vscode.Disposable;

// ============================================================================
// Extension Activation
// ============================================================================

export function activate(context: vscode.ExtensionContext): void {
    console.log('Strudel extension is now active');

    // Initialize controllers
    strudelController = new StrudelController(context);
    hydraController = new HydraController(context);

    // Register commands
    registerCommands(context);

    // Register language providers
    registerLanguageProviders(context);

    // Register event listeners
    registerEventListeners(context);

    // Setup status bar
    setupStatusBar(context);

    console.log('Strudel extension activation complete');
}

// ============================================================================
// Extension Deactivation
// ============================================================================

export function deactivate(): void {
    // Dispose controllers
    strudelController?.dispose();
    hydraController?.dispose();

    // Dispose language providers
    completionProvider?.dispose();
    hoverProvider?.dispose();
    inlayHintsProvider?.dispose();
}

// ============================================================================
// Command Registration
// ============================================================================

function registerCommands(context: vscode.ExtensionContext): void {
    const commands = [
        // Strudel commands
        vscode.commands.registerCommand('strudel.launch', () => strudelController.launch()),
        vscode.commands.registerCommand('strudel.quit', () => strudelController.quit()),
        vscode.commands.registerCommand('strudel.toggle', () => strudelController.toggle()),
        vscode.commands.registerCommand('strudel.update', () => strudelController.update()),
        vscode.commands.registerCommand('strudel.stop', () => strudelController.stop()),
        vscode.commands.registerCommand('strudel.setActiveEditor', () => strudelController.setActiveEditor()),
        vscode.commands.registerCommand('strudel.execute', () => strudelController.execute()),
        vscode.commands.registerCommand('strudel.launchFromEditor', () => strudelController.launch()),
        
        // Hydra commands
        vscode.commands.registerCommand('hydra.evalDocument', () => hydraController.evalDocument()),
    ];

    commands.forEach(cmd => context.subscriptions.push(cmd));
}

// ============================================================================
// Language Provider Registration
// ============================================================================

function registerLanguageProviders(context: vscode.ExtensionContext): void {
    // Define file selector for Strudel and Hydra files
    const selector: vscode.DocumentSelector = [
        { scheme: 'file', language: 'strudel' },
        { scheme: 'file', pattern: '**/*.str' },
        { scheme: 'file', pattern: '**/*.std' },
        { scheme: 'file', pattern: '**/*.strudel' },
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'hydra' },
        { scheme: 'file', pattern: '**/*.hydra' },
    ];

    // Register completion provider
    const combinedCompletionProvider = new CombinedCompletionProvider();
    completionProvider = vscode.languages.registerCompletionItemProvider(
        selector,
        combinedCompletionProvider,
        '.', '(', '"', "'", ' '
    );
    context.subscriptions.push(completionProvider);

    // Register hover provider
    const combinedHoverProvider = new CombinedHoverProvider(
        combinedCompletionProvider.getDocMap()
    );
    hoverProvider = vscode.languages.registerHoverProvider(selector, combinedHoverProvider);
    context.subscriptions.push(hoverProvider);

    // Register inlay hints provider
    const inlayHints = new InlayHintsProvider(combinedCompletionProvider.getDocMap());
    inlayHintsProvider = vscode.languages.registerInlayHintsProvider(selector, inlayHints);
    context.subscriptions.push(inlayHintsProvider);
}

// ============================================================================
// Event Listener Registration
// ============================================================================

function registerEventListeners(context: vscode.ExtensionContext): void {
    // Document change events
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            strudelController?.onDocumentChanged(event);
        })
    );

    // Cursor position change events
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(event => {
            strudelController?.onCursorPositionChanged(event);
        })
    );

    // Document save events
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(document => {
            strudelController?.onDocumentSaved(document);
        })
    );

    // Active editor change events
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            strudelController?.onActiveEditorChanged(editor);
        })
    );
}

// ============================================================================
// Status Bar Setup
// ============================================================================

function setupStatusBar(context: vscode.ExtensionContext): void {
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
    
    statusBarItem.text = '$(play) Strudel';
    statusBarItem.tooltip = 'Launch Strudel';
    statusBarItem.command = 'strudel.launch';
    
    context.subscriptions.push(statusBarItem);
    statusBarItem.show();
}