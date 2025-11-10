import * as vscode from 'vscode';

export class HydraPanel {
    private panel?: vscode.WebviewPanel;
    private code = '';

    constructor(private readonly context: vscode.ExtensionContext) {}

    private get html(): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Permissions-Policy" content="display-capture=self">
                <title>Hydra Live Coding</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background: black;
                        overflow: hidden;
                    }
                    canvas {
                        display: block;
                        width: 100vw;
                        height: 100vh;
                    }
                </style>
            </head>
            <body>
                <script type="module">
                    import HydraSynth from 'https://cdn.skypack.dev/hydra-synth@^1.3.29';
                    
                    let hydra;
                    let isReady = false;
                    
                    // Initialize Hydra
                    function initHydra() {
                        try {
                            hydra = new HydraSynth({
                                canvas: null,
                                enableStreamCapture: false,
                                detectAudio: false
                            });
                            
                            // Make hydra functions global
                            Object.assign(window, hydra.generator);
                            Object.assign(window, hydra.synth);
                            
                            isReady = true;
                            console.log('Hydra initialized successfully');
                            
                            // Send ready message to extension
                            window.postMessage({ type: 'hydraReady' }, '*');
                            
                        } catch (error) {
                            console.error('Failed to initialize Hydra:', error);
                        }
                    }
                    
                    // Handle messages from the extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        switch (message.type) {
                            case 'evalCode':
                                if (isReady && message.value) {
                                    try {
                                        eval(message.value);
                                        console.log('Code executed successfully');
                                    } catch (error) {
                                        console.error('Hydra execution error:', error);
                                    }
                                }
                                break;
                                
                            case 'clear':
                                if (isReady && window.hush) {
                                    window.hush();
                                }
                                break;
                        }
                    });
                    
                    // Initialize when page loads
                    window.addEventListener('load', initHydra);
                </script>
            </body>
            </html>
        `;
    }

    evalCode(code: string) {
        this.code = code;
        if (this.panel) {
            this.panel.webview.postMessage({ type: 'evalCode', value: this.code });
        } else {
            this.createPanel();
        }
    }

    clear() {
        if (this.panel) {
            this.panel.webview.postMessage({ type: 'clear' });
        }
    }

    private createPanel() {
        this.panel = vscode.window.createWebviewPanel(
            'hydra-panel',
            'Hydra Live Coding',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this.context.extensionUri]
            }
        );

        this.panel.webview.html = this.html;

        // Handle disposal
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });

        // If we have code waiting, send it
        if (this.code) {
            setTimeout(() => {
                this.panel?.webview.postMessage({ type: 'evalCode', value: this.code });
            }, 1000); // Give Hydra time to initialize
        }
    }

    dispose() {
        this.panel?.dispose();
    }
}