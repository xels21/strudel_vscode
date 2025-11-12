import * as vscode from 'vscode';
import { StrudelController } from './strudelController';
import { HydraController } from './hydraController';
import { CombinedCompletionProvider } from './combinedCompletionProvider';
import { CombinedHoverProvider } from './combinedHoverProvider';
import { InlayHintsProvider } from './inlayHintsProvider';

let strudelController: StrudelController;
let hydraController: HydraController;
let completionProvider: vscode.Disposable;
let hoverProvider: vscode.Disposable;
let inlayHintsProvider: vscode.Disposable;

export function activate(context: vscode.ExtensionContext) {
    console.log('Strudel extension is now active');

    // Initialize the Strudel controller
    strudelController = new StrudelController(context);

    // Initialize the Hydra controller
    hydraController = new HydraController(context);

    // Register all commands
    const commands = [
        vscode.commands.registerCommand('strudel.launch', () => strudelController.launch()),
        vscode.commands.registerCommand('strudel.quit', () => strudelController.quit()),
        vscode.commands.registerCommand('strudel.toggle', () => strudelController.toggle()),
        vscode.commands.registerCommand('strudel.update', () => strudelController.update()),
        vscode.commands.registerCommand('strudel.stop', () => strudelController.stop()),
        vscode.commands.registerCommand('strudel.setActiveEditor', () => strudelController.setActiveEditor()),
        vscode.commands.registerCommand('strudel.execute', () => strudelController.execute()),
        vscode.commands.registerCommand('strudel.launchFromEditor', () => strudelController.launch()),
        vscode.commands.registerCommand('hydra.evalDocument', () => hydraController.evalDocument())
    ];

    // Add commands to subscription so they are disposed when extension is deactivated
    commands.forEach(cmd => context.subscriptions.push(cmd));

    // Setup file associations
    const selector: vscode.DocumentSelector = [
        { scheme: 'file', language: 'strudel' },
        { scheme: 'file', pattern: '**/*.str' },
        { scheme: 'file', pattern: '**/*.std' },
        { scheme: 'file', pattern: '**/*.strudel' },
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'hydra' },
        { scheme: 'file', pattern: '**/*.hydra' }
    ];

    // Register completion provider
    const combinedCompletionProvider = new CombinedCompletionProvider();
    completionProvider = vscode.languages.registerCompletionItemProvider(
        selector,
        combinedCompletionProvider,
        '.', '(', '"', "'", ' ' // trigger on various characters
    );
    context.subscriptions.push(completionProvider);

    // Register hover provider
    const combinedHoverProvider = new CombinedHoverProvider(combinedCompletionProvider.getDocMap());
    hoverProvider = vscode.languages.registerHoverProvider(
        selector,
        combinedHoverProvider
    );
    context.subscriptions.push(hoverProvider);

    // Register inlay hints provider
    const inlayHints = new InlayHintsProvider(combinedCompletionProvider.getDocMap());
    inlayHintsProvider = vscode.languages.registerInlayHintsProvider(
        selector,
        inlayHints
    );
    context.subscriptions.push(inlayHintsProvider);

    // Register document change listeners
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (strudelController) {
                strudelController.onDocumentChanged(event);
            }
        })
    );

    // Register cursor position changes
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(event => {
            if (strudelController) {
                strudelController.onCursorPositionChanged(event);
            }
        })
    );

    // Register save events
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(document => {
            if (strudelController) {
                strudelController.onDocumentSaved(document);
            }
        })
    );

    // Register active editor changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (strudelController) {
                strudelController.onActiveEditorChanged(editor);
            }
        })
    );

    // Status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = "$(play) Strudel";
    statusBarItem.tooltip = "Launch Strudel";
    statusBarItem.command = 'strudel.launch';
    context.subscriptions.push(statusBarItem);
    statusBarItem.show();

    console.log('Strudel extension activation complete');
}

export function deactivate() {
    if (strudelController) {
        strudelController.dispose();
    }
    if (hydraController) {
        hydraController.dispose();
    }
    if (completionProvider) {
        completionProvider.dispose();
    }
    if (hoverProvider) {
        hoverProvider.dispose();
    }
    if (inlayHintsProvider) {
        inlayHintsProvider.dispose();
    }
}