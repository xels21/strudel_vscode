import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface StrudelDocEntry {
    name: string;
    description?: string;
    params?: Array<{
        name: string;
        type: { names: string[] };
        description?: string;
    }>;
    examples?: string[];
    synonyms?: string[];
    kind?: string;
    tags?: Array<{ title: string; value: string }>;
}

export interface StrudelDoc {
    docs: StrudelDocEntry[];
}

export class StrudelCompletionProvider implements vscode.CompletionItemProvider {
    private completionItems: vscode.CompletionItem[] = [];
    private docData: StrudelDoc | null = null;

    constructor(private extensionPath: string) {
        this.loadDocumentation();
    }

    getDocData(): StrudelDoc | null {
        return this.docData;
    }

    private async loadDocumentation(): Promise<void> {
        try {
            // Try to load the documentation from the strudel folder
            const docPath = path.join(this.extensionPath, 'assets', 'strudel_doc.json');
            
            if (fs.existsSync(docPath)) {
                const docContent = fs.readFileSync(docPath, 'utf8');
                this.docData = JSON.parse(docContent) as StrudelDoc;
                this.generateCompletionItems();
            } else {
                console.warn('Strudel documentation not found at:', docPath);
                // Generate basic completion items without full documentation
                this.generateBasicCompletionItems();
            }
        } catch (error) {
            console.error('Failed to load Strudel documentation:', error);
            this.generateBasicCompletionItems();
        }
    }

    private generateCompletionItems(): void {
        if (!this.docData) return;

        const seen = new Set<string>();

        for (const doc of this.docData.docs) {
            // Skip invalid or private functions
            if (!this.isValidDoc(doc) || this.hasExcludedTags(doc)) {
                continue;
            }

            const names = [doc.name];
            if (doc.synonyms) {
                names.push(...doc.synonyms);
            }

            for (const name of names) {
                if (name && !seen.has(name)) {
                    seen.add(name);
                    
                    const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Function);
                    
                    // Set up documentation
                    if (doc.description) {
                        item.detail = doc.description;
                    }

                    // Build markdown documentation
                    const markdownDoc = this.buildMarkdownDocumentation(doc, name);
                    item.documentation = new vscode.MarkdownString(markdownDoc);

                    // Set up snippet with parameters if available
                    if (doc.params && doc.params.length > 0) {
                        const paramSnippet = doc.params
                            .map((param, index) => `\${${index + 1}:${param.name}}`)
                            .join(', ');
                        item.insertText = new vscode.SnippetString(`${name}(${paramSnippet})`);
                    } else {
                        item.insertText = `${name}()`;
                    }

                    // Set filter text for better matching
                    item.filterText = name;
                    item.sortText = name;

                    this.completionItems.push(item);
                }
            }
        }
    }

    private generateBasicCompletionItems(): void {
        // Basic Strudel functions for fallback when documentation isn't available
        const basicFunctions = [
            'stack', 'cat', 'seq', 'sequence', 'fastcat', 'slowcat',
            'note', 'sound', 's', 'n', 'scale', 'chord',
            'fast', 'slow', 'rev', 'jux', 'every', 'sometimes',
            'add', 'sub', 'mul', 'div', 'mod', 'set', 'keep',
            'gain', 'pan', 'lpf', 'hpf', 'delay', 'room',
            'pure', 'silence', 'rest', 'saw', 'sine', 'square', 'tri',
            'rand', 'choose', 'chooseWith', 'shuffle', 'scramble',
            'struct', 'mask', 'euclid', 'euclidRot'
        ];

        for (const func of basicFunctions) {
            const item = new vscode.CompletionItem(func, vscode.CompletionItemKind.Function);
            item.detail = `Strudel function: ${func}`;
            item.insertText = `${func}()`;
            this.completionItems.push(item);
        }
    }

    private buildMarkdownDocumentation(doc: StrudelDocEntry, name: string): string {
        const parts: string[] = [];

        // Function name and description
        if (doc.description) {
            parts.push(`**${name}**\n\n${doc.description}`);
        } else {
            parts.push(`**${name}**`);
        }

        // Parameters
        if (doc.params && doc.params.length > 0) {
            parts.push('\n**Parameters:**');
            for (const param of doc.params) {
                const types = param.type?.names?.join(' | ') || 'any';
                const description = param.description || '';
                parts.push(`- \`${param.name}\` (${types}): ${description}`);
            }
        }

        // Examples
        if (doc.examples && doc.examples.length > 0) {
            parts.push('\n**Examples:**');
            for (const example of doc.examples) {
                parts.push('```javascript\n' + example + '\n```');
            }
        }

        // Synonyms
        if (doc.synonyms && doc.synonyms.length > 0 && name !== doc.name) {
            const otherSynonyms = [doc.name, ...doc.synonyms].filter(s => s !== name);
            if (otherSynonyms.length > 0) {
                parts.push(`\n**Synonyms:** ${otherSynonyms.join(', ')}`);
            }
        }

        return parts.join('\n');
    }

    private isValidDoc(doc: StrudelDocEntry): boolean {
        return Boolean(doc.name) && 
               !doc.name.startsWith('_') && 
               doc.kind !== 'package' &&
               doc.kind !== 'module';
    }

    private hasExcludedTags(doc: StrudelDocEntry): boolean {
        const excludedTags = ['superdirtOnly', 'noAutocomplete'];
        return excludedTags.some(tag => 
            doc.tags?.some(t => t.title === tag)
        );
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        // Check if we're in a Strudel context
        if (!this.isStrudelContext(document)) {
            return [];
        }

        return this.completionItems;
    }

    private isStrudelContext(document: vscode.TextDocument): boolean {
        const languageId = document.languageId;
        const fileName = path.basename(document.fileName);
        
        // Check for Strudel file extensions or language ID
        return languageId === 'strudel' ||
               languageId === 'javascript' ||
               fileName.endsWith('.str') ||
               fileName.endsWith('.std') ||
               fileName.endsWith('.strudel') ||
               fileName.includes('strudel');
    }

    resolveCompletionItem(
        item: vscode.CompletionItem,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CompletionItem> {
        return item;
    }
}