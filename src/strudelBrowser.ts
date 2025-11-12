import * as vscode from 'vscode';
import * as puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

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

export class StrudelBrowser {
    private browser: puppeteer.Browser | null = null;
    private page: puppeteer.Page | null = null;
    private isReady = false;
    private lastContent: string = '';
    private eventHandlers: {
        onReady?: () => void;
        onContentChanged?: (content: string) => void;
        onCursorChanged?: (position: { row: number; col: number }) => void;
        onEvalError?: (error: string) => void;
        onClosed?: () => void;
    } = {};

    constructor(
        private config: StrudelConfig,
        private context: vscode.ExtensionContext
    ) {}

    // Event handler setters
    onReady(handler: () => void): void {
        this.eventHandlers.onReady = handler;
    }

    onContentChanged(handler: (content: string) => void): void {
        this.eventHandlers.onContentChanged = handler;
    }

    onCursorChanged(handler: (position: { row: number; col: number }) => void): void {
        this.eventHandlers.onCursorChanged = handler;
    }

    onEvalError(handler: (error: string) => void): void {
        this.eventHandlers.onEvalError = handler;
    }

    onClosed(handler: () => void): void {
        this.eventHandlers.onClosed = handler;
    }

    async launch(): Promise<void> {
        try {
            // Setup browser launch options
            const launchOptions: puppeteer.LaunchOptions = {
                headless: this.config.headless,
                defaultViewport: null,
                ignoreDefaultArgs: [
                    '--mute-audio',
                    '--enable-automation',
                ],
                args: [
                    '--app=https://strudel.cc',
                    '--autoplay-policy=no-user-gesture-required',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                ],
            };

            // Set user data directory
            if (this.config.browserDataDir) {
                launchOptions.userDataDir = this.config.browserDataDir;
            } else {
                launchOptions.userDataDir = path.join(os.homedir(), '.cache', 'strudel-vscode');
            }

            // Set custom browser executable
            if (this.config.browserExecutablePath) {
                launchOptions.executablePath = this.config.browserExecutablePath;
            }

            // Launch browser
            this.browser = await puppeteer.launch(launchOptions);

            // Get the first page (app page)
            const pages = await this.browser.pages();
            this.page = pages[0];

            // Wait for Strudel to load
            await this.page.waitForSelector('.cm-content', { timeout: 30000 });

            // Setup event handlers
            this.browser.on('disconnected', () => {
                this.cleanup();
                this.eventHandlers.onClosed?.();
            });

            this.page.on('close', () => {
                this.cleanup();
                this.eventHandlers.onClosed?.();
            });

            // Apply custom styling
            await this.applyCustomStyling();

            // Setup content synchronization
            await this.setupContentSync();

            // Setup error monitoring
            await this.setupErrorMonitoring();

            // Setup cursor synchronization
            if (this.config.syncCursor) {
                await this.setupCursorSync();
            }

            this.isReady = true;
            this.eventHandlers.onReady?.();

        } catch (error) {
            throw new Error(`Failed to launch browser: ${error}`);
        }
    }

    async quit(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.cleanup();
        }
    }

    async toggle(): Promise<void> {
        if (!this.page) return;
        await this.page.evaluate(() => {
            (window as any).strudelMirror.toggle();
        });
    }

    async update(): Promise<void> {
        if (!this.page) return;
        await this.page.evaluate(() => {
            (window as any).strudelMirror.evaluate();
        });
    }

    async refresh(): Promise<void> {
        if (!this.page) return;
        await this.page.evaluate(() => {
            if ((window as any).strudelMirror.repl.state.started) {
                (window as any).strudelMirror.evaluate();
            }
        });
    }

    async stop(): Promise<void> {
        if (!this.page) return;
        await this.page.evaluate(() => {
            (window as any).strudelMirror.stop();
        });
    }

    async sendContent(content: string): Promise<void> {
        if (!this.page || !this.isReady) return;

        if (content === this.lastContent) return;
        this.lastContent = content;

        await this.page.evaluate((newContent: string) => {
            const view = (window as any).strudelMirror.editor;
            const oldContent = view.state.doc.toString();

            // Find the first position where the content differs
            let start = 0;
            while (
                start < oldContent.length &&
                start < newContent.length &&
                oldContent[start] === newContent[start]
            ) {
                start++;
            }

            // Find the last position where the content differs
            let endOld = oldContent.length - 1;
            let endNew = newContent.length - 1;
            while (
                endOld >= start &&
                endNew >= start &&
                oldContent[endOld] === newContent[endNew]
            ) {
                endOld--;
                endNew--;
            }

            // If there is a change, apply it
            if (start <= endOld || start <= endNew) {
                view.dispatch({
                    changes: {
                        from: start,
                        to: endOld + 1,
                        insert: newContent.slice(start, endNew + 1)
                    }
                });
            }

            // Emulate interaction for audio playback
            (window as any).strudelMirror.root.click();
        }, content);
    }

    async sendCursorPosition(row: number, col: number): Promise<void> {
        if (!this.page || !this.isReady) return;

        await this.page.evaluate(({ row, col }: { row: number, col: number }) => {
            const view = (window as any).strudelMirror.editor;
            const lineCount = view.state.doc.lines;
            const clampedRow = Math.max(1, Math.min(row, lineCount));
            const lineInfo = view.state.doc.line(clampedRow);
            const clampedCol = Math.max(0, Math.min(col, lineInfo.length));
            const pos = Math.min(lineInfo.from + clampedCol, lineInfo.to);
            view.dispatch({
                selection: { anchor: pos },
                scrollIntoView: true,
            });
        }, { row, col });
    }

    private async applyCustomStyling(): Promise<void> {
        if (!this.page) return;

        // Base styles
        await this.page.addStyleTag({
            content: `
            /*
                .cm-scroller {
                    scrollbar-width: none;
                }
            */
                .cm-line:not(.cm-activeLine):has(> span) {
                    background: var(--lineBackground) !important;
                    width: fit-content;
                }
                .cm-line.cm-activeLine {
                    background: linear-gradient(var(--lineHighlight), var(--lineHighlight)), var(--lineBackground) !important;
                }
                .cm-line > *, .cm-line span[style*="background-color"] {
                    background-color: transparent !important;
                    filter: none !important;
                }
            `
        });

        // Apply UI configuration
        if (this.config.ui.hideTopBar) {
            await this.page.addStyleTag({
                content: 'header { display: none !important; }'
            });
        }

        if (this.config.ui.maximizeMenuPanel) {
            await this.page.addStyleTag({
                content: `
                    nav:not(:has(> button:first-child)) {
                        position: absolute;
                        z-index: 99;
                        height: 100%;
                        width: 100vw;
                        max-width: 100vw;
                        background: linear-gradient(var(--lineHighlight), var(--lineHighlight)), var(--background);
                    }
                `
            });
        }

        if (this.config.ui.hideMenuPanel) {
            await this.page.addStyleTag({
                content: 'nav { display: none !important; }'
            });
        }

        if (this.config.ui.hideCodeEditor) {
            await this.page.addStyleTag({
                content: '.cm-editor { display: none !important; }'
            });
        }

        if (this.config.ui.hideErrorDisplay) {
            await this.page.addStyleTag({
                content: 'header + div + div { display: none !important; }'
            });
        }

        // Apply custom CSS file if specified
        if (this.config.customCssFile && fs.existsSync(this.config.customCssFile)) {
            try {
                const customCss = fs.readFileSync(this.config.customCssFile, 'utf8');
                await this.page.addStyleTag({ content: customCss });
            } catch (error) {
                console.error('Failed to load custom CSS:', error);
            }
        }
    }

    private async setupContentSync(): Promise<void> {
        if (!this.page) return;

        // Expose function to send content changes from browser to VS Code
        await this.page.exposeFunction('sendEditorContent', async () => {
            if (!this.page) return;

            const content = await this.page.evaluate(() => {
                return (window as any).strudelMirror.code;
            });

            if (content !== this.lastContent) {
                this.lastContent = content;
                this.eventHandlers.onContentChanged?.(content);
            }
        });

        // Setup content change monitoring (only if not headless)
        if (!this.config.headless) {
            await this.page.evaluate(() => {
                const editor = document.querySelector('.cm-content');
                if (!editor) return;

                // Listen for content changes
                const observer = new MutationObserver(() => {
                    editor.dispatchEvent(new CustomEvent('strudel-content-changed'));
                });
                observer.observe(editor, {
                    childList: true,
                    characterData: true,
                    subtree: true
                });

                editor.addEventListener('strudel-content-changed', (window as any).sendEditorContent);
            });
        }
    }

    private async setupErrorMonitoring(): Promise<void> {
        if (!this.page) return;

        // Expose function to send eval errors
        await this.page.exposeFunction('notifyEvalError', (evalErrorMessage: string) => {
            if (evalErrorMessage) {
                this.eventHandlers.onEvalError?.(evalErrorMessage);
            }
        });

        // Setup error monitoring
        await this.page.evaluate(() => {
            let lastError: string | null = null;
            setInterval(() => {
                try {
                    const currentError = (window as any).strudelMirror.repl.state.evalError.message;
                    if (currentError !== lastError) {
                        lastError = currentError;
                        (window as any).notifyEvalError(currentError);
                    }
                } catch (e) {
                    // Ignore errors (e.g., page not ready)
                }
            }, 300);
        });
    }

    private async setupCursorSync(): Promise<void> {
        if (!this.page) return;

        // Expose function to send cursor position changes
        await this.page.exposeFunction('sendEditorCursor', async () => {
            if (!this.page) return;

            const cursor = await this.page.evaluate(() => {
                const view = (window as any).strudelMirror.editor;
                const pos = view.state.selection.main.head;
                const lineInfo = view.state.doc.lineAt(pos);
                const row = lineInfo.number; // 1-based
                const col = pos - lineInfo.from; // 0-based
                return { row, col };
            });

            this.eventHandlers.onCursorChanged?.(cursor);
        });

        // Setup cursor change monitoring (only if not headless)
        if (!this.config.headless) {
            await this.page.evaluate(() => {
                const editor = document.querySelector('.cm-content');
                if (!editor) return;

                // Listen for cursor changes
                editor.addEventListener('keyup', (window as any).sendEditorCursor);
                editor.addEventListener('keydown', (window as any).sendEditorCursor);
                editor.addEventListener('mouseup', (window as any).sendEditorCursor);
                editor.addEventListener('mousedown', (window as any).sendEditorCursor);
            });
        }
    }

    private cleanup(): void {
        this.browser = null;
        this.page = null;
        this.isReady = false;
        this.lastContent = '';
    }
}