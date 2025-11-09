import * as vscode from 'vscode';
import * as path from 'path';

// Import the optimized completion data
import * as completionData from './strudelCompletions.json';

export interface StrudelFunction {
    name: string;
    description: string;
    params: Array<{
        name: string;
        type: string;
        description: string;
    }>;
    examples: string[];
    synonyms: string[];
    originalName: string;
}

export interface StrudelCompletionData {
    functions: StrudelFunction[];
    lastGenerated: string;
}

export class StrudelCompletionProviderOptimized implements vscode.CompletionItemProvider {
    private completionItems: vscode.CompletionItem[] = [];
    private docMap: Map<string, StrudelFunction> = new Map();
    private data: StrudelCompletionData;

    constructor() {
        this.data = completionData as StrudelCompletionData;
        this.generateCompletionItems();
        this.buildDocMap();
    }

    private generateCompletionItems(): void {
        for (const func of this.data.functions) {
            const item = new vscode.CompletionItem(func.name, vscode.CompletionItemKind.Function);
            
            // Set up documentation
            if (func.description) {
                item.detail = func.description;
            }

            // Build markdown documentation
            const markdownDoc = this.buildMarkdownDocumentation(func);
            item.documentation = new vscode.MarkdownString(markdownDoc);

            // Set up snippet with parameters if available
            if (func.params && func.params.length > 0) {
                const paramSnippet = func.params
                    .map((param, index) => `\${${index + 1}:${param.name}}`)
                    .join(', ');
                item.insertText = new vscode.SnippetString(`${func.name}(${paramSnippet})`);
            } else {
                item.insertText = `${func.name}()`;
            }

            // Set filter text for better matching
            item.filterText = func.name;
            item.sortText = func.name;

            this.completionItems.push(item);
        }
    }

    private buildDocMap(): void {
        for (const func of this.data.functions) {
            this.docMap.set(func.name, func);
        }
    }

    getDocMap(): Map<string, StrudelFunction> {
        return this.docMap;
    }

    private buildMarkdownDocumentation(func: StrudelFunction): string {
        const parts: string[] = [];

        // Function name and description
        if (func.description) {
            parts.push(`**${func.name}**\n\n${func.description}`);
        } else {
            parts.push(`**${func.name}**`);
        }

        // Parameters
        if (func.params && func.params.length > 0) {
            parts.push('\n**Parameters:**');
            for (const param of func.params) {
                parts.push(`- \`${param.name}\` (${param.type}): ${param.description}`);
            }
        }

        // Examples
        if (func.examples && func.examples.length > 0) {
            parts.push('\n**Examples:**');
            for (const example of func.examples) {
                parts.push('```javascript\n' + example + '\n```');
            }
        }

        // Synonyms
        if (func.synonyms && func.synonyms.length > 0 && func.name !== func.originalName) {
            const otherSynonyms = [func.originalName, ...func.synonyms].filter(s => s !== func.name);
            if (otherSynonyms.length > 0) {
                parts.push(`\n**Synonyms:** ${otherSynonyms.join(', ')}`);
            }
        }

        return parts.join('\n');
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