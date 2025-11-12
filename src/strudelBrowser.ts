import * as vscode from 'vscode';
import * as puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// ============================================================================
// Configuration Interface
// ============================================================================

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

// ============================================================================
// Event Handlers Interface
// ============================================================================

interface EventHandlers {
    onReady?: () => void;
    onContentChanged?: (content: string) => void;
    onCursorChanged?: (position: { row: number; col: number }) => void;
    onEvalError?: (error: string) => void;
    onClosed?: () => void;
}

// ============================================================================
// StrudelBrowser Class
// ============================================================================

export class StrudelBrowser {
    // Browser state
    private browser: puppeteer.Browser | null = null;
    private page: puppeteer.Page | null = null;
    private isReady = false;
    private lastContent = '';
    
    // Event handlers
    private eventHandlers: EventHandlers = {};

    constructor(
        private config: StrudelConfig,
        private context: vscode.ExtensionContext
    ) {}

    // ========================================================================
    // Public API - Event Handler Registration
    // ========================================================================

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

    // ========================================================================
    // Public API - Browser Control
    // ========================================================================

    // ========================================================================
    // Public API - Browser Control
    // ========================================================================

    /**
     * Launch the Strudel browser instance
     */
    async launch(): Promise<void> {
        try {
            await this.launchBrowser();
            await this.setupBrowserPage();
            await this.initializeStrudel();
            
            this.isReady = true;
            this.eventHandlers.onReady?.();
        } catch (error) {
            throw new Error(`Failed to launch browser: ${error}`);
        }
    }

    /**
     * Quit and cleanup the browser instance
     */
    async quit(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.cleanup();
        }
    }

    /**
     * Toggle play/pause in Strudel
     */
    async toggle(): Promise<void> {
        if (!this.page) return;
        
        await this.page.evaluate(() => {
            (window as any).strudelMirror.toggle();
        });
    }

    /**
     * Evaluate/update the current code
     */
    async update(): Promise<void> {
        if (!this.page) return;
        
        await this.page.evaluate(() => {
            (window as any).strudelMirror.evaluate();
        });
    }

    /**
     * Refresh and re-evaluate if already playing
     */
    async refresh(): Promise<void> {
        if (!this.page) return;
        
        await this.page.evaluate(() => {
            if ((window as any).strudelMirror.repl.state.started) {
                (window as any).strudelMirror.evaluate();
            }
        });
    }

    /**
     * Stop playback
     */
    async stop(): Promise<void> {
        if (!this.page) return;
        
        await this.page.evaluate(() => {
            (window as any).strudelMirror.stop();
        });
    }

    /**
     * Send code content to the Strudel editor
     */
    async sendContent(content: string): Promise<void> {
        if (!this.page || !this.isReady) return;
        if (content === this.lastContent) return;
        
        this.lastContent = content;
        await this.updateEditorContent(content);
    }

    /**
     * Send cursor position to the Strudel editor
     */
    async sendCursorPosition(row: number, col: number): Promise<void> {
        if (!this.page || !this.isReady) return;
        
        await this.page.evaluate(
            ({ row, col }: { row: number; col: number }) => {
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
            },
            { row, col }
        );
    }

    // ========================================================================
    // Private Methods - Browser Setup
    // ========================================================================

    /**
     * Launch the Puppeteer browser with configured options
     */
    private async launchBrowser(): Promise<void> {
        const launchOptions: puppeteer.LaunchOptions = {
            headless: this.config.headless,
            defaultViewport: null,
            ignoreDefaultArgs: ['--mute-audio', '--enable-automation'],
            args: [
                '--app=https://strudel.cc',
                '--autoplay-policy=no-user-gesture-required',
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ],
        };

        // Configure user data directory
        launchOptions.userDataDir = this.config.browserDataDir || 
            path.join(os.homedir(), '.cache', 'strudel-vscode');

        // Configure custom browser executable if specified
        if (this.config.browserExecutablePath) {
            launchOptions.executablePath = this.config.browserExecutablePath;
        }

        this.browser = await puppeteer.launch(launchOptions);
    }

    /**
     * Setup the browser page and wait for Strudel to load
     */
    private async setupBrowserPage(): Promise<void> {
        if (!this.browser) {
            throw new Error('Browser not initialized');
        }

        // Get the first page (app page)
        const pages = await this.browser.pages();
        this.page = pages[0];

        // Wait for Strudel to load
        await this.page.waitForSelector('.cm-content', { timeout: 30000 });

        // Setup browser event handlers
        this.browser.on('disconnected', () => {
            this.cleanup();
            this.eventHandlers.onClosed?.();
        });

        this.page.on('close', () => {
            this.cleanup();
            this.eventHandlers.onClosed?.();
        });
    }

    /**
     * Initialize Strudel with styling and synchronization
     */
    private async initializeStrudel(): Promise<void> {
        await this.applyCustomStyling();
        await this.setupContentSync();
        await this.setupErrorMonitoring();
        
        if (this.config.syncCursor) {
            await this.setupCursorSync();
        }
    }

    /**
     * Update the editor content with diff-based approach
     */
    private async updateEditorContent(newContent: string): Promise<void> {
        if (!this.page) return;

        await this.page.evaluate((content: string) => {
            const view = (window as any).strudelMirror.editor;
            const oldContent = view.state.doc.toString();

            // Find the first position where content differs
            let start = 0;
            while (
                start < oldContent.length &&
                start < content.length &&
                oldContent[start] === content[start]
            ) {
                start++;
            }

            // Find the last position where content differs
            let endOld = oldContent.length - 1;
            let endNew = content.length - 1;
            while (
                endOld >= start &&
                endNew >= start &&
                oldContent[endOld] === content[endNew]
            ) {
                endOld--;
                endNew--;
            }

            // Apply changes if there are any
            if (start <= endOld || start <= endNew) {
                view.dispatch({
                    changes: {
                        from: start,
                        to: endOld + 1,
                        insert: content.slice(start, endNew + 1),
                    },
                });
            }

            // Emulate interaction for audio playback
            (window as any).strudelMirror.root.click();
        }, newContent);
    }

    /**
     * Cleanup browser resources
     */
    private cleanup(): void {
        this.browser = null;
        this.page = null;
        this.isReady = false;
        this.lastContent = '';
    }

    // ========================================================================
    // Private Methods - Styling
    // ========================================================================

    /**
     * Apply custom styling to the Strudel editor
     */
    private async applyCustomStyling(): Promise<void> {
        if (!this.page) return;

        // Apply base editor styles
        await this.applyBaseStyles();
        
        // Apply UI configuration styles
        await this.applyUIConfigStyles();
        
        // Apply custom CSS file if specified
        await this.applyCustomCSSFile();
    }

    /**
     * Apply base editor styles
     */
    private async applyBaseStyles(): Promise<void> {
        if (!this.page) return;

        await this.page.addStyleTag({
            content: `
                .cm-line:not(.cm-activeLine):has(> span) {
                    background: var(--lineBackground) !important;
                    width: fit-content;
                }
                .cm-line.cm-activeLine {
                    background: linear-gradient(var(--lineHighlight), var(--lineHighlight)), 
                                var(--lineBackground) !important;
                }
                .cm-line > *, 
                .cm-line span[style*="background-color"] {
                    background-color: transparent !important;
                    filter: none !important;
                }
            `,
        });
    }

    /**
     * Apply UI configuration styles based on settings
     */
    private async applyUIConfigStyles(): Promise<void> {
        if (!this.page) return;

        const styleMap: Record<string, string> = {
            hideTopBar: 'header { display: none !important; }',
            hideMenuPanel: 'nav { display: none !important; }',
            hideCodeEditor: '.cm-editor { display: none !important; }',
            hideErrorDisplay: 'header + div + div { display: none !important; }',
        };

        // Apply individual UI hide styles
        for (const [key, css] of Object.entries(styleMap)) {
            if (this.config.ui[key as keyof typeof this.config.ui]) {
                await this.page.addStyleTag({ content: css });
            }
        }

        // Apply maximize menu panel style
        if (this.config.ui.maximizeMenuPanel) {
            await this.page.addStyleTag({
                content: `
                    nav:not(:has(> button:first-child)) {
                        position: absolute;
                        z-index: 99;
                        height: 100%;
                        width: 100vw;
                        max-width: 100vw;
                        background: linear-gradient(var(--lineHighlight), var(--lineHighlight)), 
                                    var(--background);
                    }
                `,
            });
        }
    }

    /**
     * Load and apply custom CSS file if configured
     */
    private async applyCustomCSSFile(): Promise<void> {
        if (!this.page || !this.config.customCssFile) return;
        
        if (fs.existsSync(this.config.customCssFile)) {
            try {
                const customCss = fs.readFileSync(this.config.customCssFile, 'utf8');
                await this.page.addStyleTag({ content: customCss });
            } catch (error) {
                console.error('Failed to load custom CSS:', error);
            }
        }
    }

    // ========================================================================
    // Private Methods - Synchronization
    // ========================================================================

    /**
     * Setup bidirectional content synchronization
     */
    private async setupContentSync(): Promise<void> {
        if (!this.page) return;

        // Expose function for browser to send content changes to VS Code
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

                // Monitor content changes using MutationObserver
                const observer = new MutationObserver(() => {
                    editor.dispatchEvent(new CustomEvent('strudel-content-changed'));
                });
                
                observer.observe(editor, {
                    childList: true,
                    characterData: true,
                    subtree: true,
                });

                editor.addEventListener('strudel-content-changed', (window as any).sendEditorContent);
            });
        }
    }

    /**
     * Setup error monitoring and reporting
     */
    private async setupErrorMonitoring(): Promise<void> {
        if (!this.page) return;

        // Expose function for browser to send eval errors to VS Code
        await this.page.exposeFunction('notifyEvalError', (evalErrorMessage: string) => {
            if (evalErrorMessage) {
                this.eventHandlers.onEvalError?.(evalErrorMessage);
            }
        });

        // Poll for errors periodically
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
                    // Ignore errors when page isn't ready
                }
            }, 300);
        });
    }

    /**
     * Setup cursor position synchronization
     */
    private async setupCursorSync(): Promise<void> {
        if (!this.page) return;

        // Expose function for browser to send cursor position to VS Code
        await this.page.exposeFunction('sendEditorCursor', async () => {
            if (!this.page) return;

            const cursor = await this.page.evaluate(() => {
                const view = (window as any).strudelMirror.editor;
                const pos = view.state.selection.main.head;
                const lineInfo = view.state.doc.lineAt(pos);
                
                return {
                    row: lineInfo.number, // 1-based
                    col: pos - lineInfo.from, // 0-based
                };
            });

            this.eventHandlers.onCursorChanged?.(cursor);
        });

        // Setup cursor change event listeners (only if not headless)
        if (!this.config.headless) {
            await this.page.evaluate(() => {
                const editor = document.querySelector('.cm-content');
                if (!editor) return;

                // Listen for all cursor-changing events
                const events = ['keyup', 'keydown', 'mouseup', 'mousedown'];
                events.forEach(event => {
                    editor.addEventListener(event, (window as any).sendEditorCursor);
                });
            });
        }
    }
}