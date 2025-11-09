import * as vscode from 'vscode';
import { StrudelController } from './strudelController';
import { StrudelCompletionProviderOptimized } from './completionProviderOptimized';
import { StrudelHoverProviderOptimized } from './hoverProviderOptimized';

let strudelController: StrudelController;
let completionProvider: vscode.Disposable;
let hoverProvider: vscode.Disposable;

export function activate(context: vscode.ExtensionContext) {
    console.log('Strudel extension is now active');

    // Initialize the Strudel controller
    strudelController = new StrudelController(context);

    // Register all commands
    const commands = [
        vscode.commands.registerCommand('strudel.launch', () => strudelController.launch()),
        vscode.commands.registerCommand('strudel.quit', () => strudelController.quit()),
        vscode.commands.registerCommand('strudel.toggle', () => strudelController.toggle()),
        vscode.commands.registerCommand('strudel.update', () => strudelController.update()),
        vscode.commands.registerCommand('strudel.stop', () => strudelController.stop()),
        vscode.commands.registerCommand('strudel.setActiveEditor', () => strudelController.setActiveEditor()),
        vscode.commands.registerCommand('strudel.execute', () => strudelController.execute())
    ];

    // Add commands to subscription so they are disposed when extension is deactivated
    commands.forEach(cmd => context.subscriptions.push(cmd));

    // Setup file associations
    const selector: vscode.DocumentSelector = [
        { scheme: 'file', language: 'strudel' },
        { scheme: 'file', pattern: '**/*.str' },
        { scheme: 'file', pattern: '**/*.std' },
        { scheme: 'file', pattern: '**/*.strudel' },
        { scheme: 'file', language: 'javascript' }
    ];

    // Register completion provider
    const strudelCompletionProvider = new StrudelCompletionProviderOptimized();
    completionProvider = vscode.languages.registerCompletionItemProvider(
        selector,
        strudelCompletionProvider,
        '.', '(', '"', "'", ' ' // trigger on various characters
    );
    context.subscriptions.push(completionProvider);

    // Register hover provider
    const strudelHoverProvider = new StrudelHoverProviderOptimized(strudelCompletionProvider.getDocMap());
    hoverProvider = vscode.languages.registerHoverProvider(
        selector,
        strudelHoverProvider
    );
    context.subscriptions.push(hoverProvider);

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
    if (completionProvider) {
        completionProvider.dispose();
    }
    if (hoverProvider) {
        hoverProvider.dispose();
    }
}