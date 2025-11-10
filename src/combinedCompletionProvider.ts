import * as vscode from 'vscode';
import * as path from 'path';

// Import completion data
import * as strudelCompletionData from './strudelCompletions.json';
import * as hydraCompletionData from './hydraCompletions.json';

export interface CompletionFunction {
    name: string;
    description: string;
    params: Array<{
        name: string;
        type: string;
        description: string;
        default?: any;
    }>;
    examples: string[];
    category: 'strudel' | 'hydra';
    type?: string;
    synonyms?: string[];
    originalName?: string;
}

export interface CombinedCompletionData {
    functions: CompletionFunction[];
    lastGenerated: string;
}

export class CombinedCompletionProvider implements vscode.CompletionItemProvider {
    private completionItems: vscode.CompletionItem[] = [];
    private docMap: Map<string, CompletionFunction> = new Map();
    private strudelData: any;
    private hydraData: any;

    constructor() {
        this.strudelData = strudelCompletionData;
        this.hydraData = hydraCompletionData;
        this.generateCompletionItems();
        this.buildDocMap();
    }

    private generateCompletionItems(): void {
        // Add Strudel functions
        this.addFunctionsFromData(this.strudelData.functions, 'strudel');
        
        // Add Hydra functions
        this.addFunctionsFromData(this.hydraData.functions, 'hydra');
    }

    private addFunctionsFromData(functions: any[], category: 'strudel' | 'hydra'): void {
        for (const func of functions) {
            const item = new vscode.CompletionItem(func.name, vscode.CompletionItemKind.Function);
            
            // Set up documentation
            const description = `[${category.toUpperCase()}] ${func.description}`;
            item.detail = description;

            // Build markdown documentation
            const markdownDoc = this.buildMarkdownDocumentation(func, category);
            item.documentation = new vscode.MarkdownString(markdownDoc);

            // Set up snippet with parameters if available
            if (func.params && func.params.length > 0) {
                const paramSnippet = func.params
                    .map((param: any, index: number) => `\${${index + 1}:${param.name}}`)
                    .join(', ');
                item.insertText = new vscode.SnippetString(`${func.name}(${paramSnippet})`);
            } else {
                item.insertText = `${func.name}()`;
            }

            // Set filter text for better matching
            item.filterText = func.name;
            item.sortText = `${category === 'strudel' ? 'a' : 'b'}_${func.name}`; // Prioritize Strudel functions

            // Don't add deprecated tag - we use badges in documentation instead

            this.completionItems.push(item);
        }
    }

    private buildDocMap(): void {
        // Add Strudel functions to map
        for (const func of this.strudelData.functions) {
            this.docMap.set(func.name, { ...func, category: 'strudel' });
        }

        // Add Hydra functions to map
        for (const func of this.hydraData.functions) {
            this.docMap.set(func.name, { ...func, category: 'hydra' });
        }
    }

    getDocMap(): Map<string, CompletionFunction> {
        return this.docMap;
    }

    private buildMarkdownDocumentation(func: any, category: 'strudel' | 'hydra'): string {
        const parts: string[] = [];

        // Function name and description with category badge
        const categoryBadge = category === 'strudel' ? '🌀 **STRUDEL**' : '🌊 **HYDRA**';
        if (func.description) {
            parts.push(`${categoryBadge} **${func.name}**\n\n${func.description}`);
        } else {
            parts.push(`${categoryBadge} **${func.name}**`);
        }

        // Add function type for Hydra
        if (category === 'hydra' && func.type) {
            parts.push(`\n**Type:** ${func.type}`);
        }

        // Parameters
        if (func.params && func.params.length > 0) {
            parts.push('\n**Parameters:**');
            for (const param of func.params) {
                const defaultValue = param.default !== undefined ? ` (default: ${param.default})` : '';
                parts.push(`- \`${param.name}\` (${param.type}): ${param.description}${defaultValue}`);
            }
        }

        // Examples
        if (func.examples && func.examples.length > 0) {
            parts.push('\n**Examples:**');
            for (const example of func.examples) {
                parts.push('```javascript\n' + example + '\n```');
            }
        }

        // Synonyms (for Strudel functions)
        if (category === 'strudel' && func.synonyms && func.synonyms.length > 0 && func.name !== func.originalName) {
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
        // Check if we're in a relevant context
        if (!this.isRelevantContext(document)) {
            return [];
        }

        // Filter completions based on context
        const currentLine = document.lineAt(position.line).text;
        const isHydraContext = this.isHydraContext(document, currentLine);
        const isStrudelContext = this.isStrudelContext(document, currentLine);

        if (!isHydraContext && !isStrudelContext) {
            return this.completionItems; // Return all if context is ambiguous
        }

        // Filter based on context
        return this.completionItems.filter(item => {
            const isStrudelItem = item.sortText?.startsWith('a_');
            const isHydraItem = item.sortText?.startsWith('b_');
            
            if (isHydraContext && isHydraItem) return true;
            if (isStrudelContext && isStrudelItem) return true;
            
            return false;
        });
    }

    private isRelevantContext(document: vscode.TextDocument): boolean {
        const languageId = document.languageId;
        const fileName = path.basename(document.fileName);
        
        return languageId === 'strudel' ||
               languageId === 'javascript' ||
               fileName.endsWith('.str') ||
               fileName.endsWith('.std') ||
               fileName.endsWith('.strudel') ||
               fileName.includes('strudel') ||
               fileName.includes('hydra');
    }

    private isHydraContext(document: vscode.TextDocument, currentLine: string): boolean {
        const fileName = path.basename(document.fileName);
        const content = document.getText();
        
        // Check if file name suggests Hydra
        if (fileName.includes('hydra') || fileName.endsWith('.hydra')) {
            return true;
        }

        // Check for Hydra-specific patterns in content
        const hydraPatterns = [
            /osc\(/,
            /noise\(/,
            /gradient\(/,
            /shape\(/,
            /voronoi\(/,
            /\.out\(o[0-3]\)/,
            /render\(\)/,
            /hush\(\)/
        ];

        return hydraPatterns.some(pattern => pattern.test(content));
    }

    private isStrudelContext(document: vscode.TextDocument, currentLine: string): boolean {
        const fileName = path.basename(document.fileName);
        const content = document.getText();
        
        // Check if file name suggests Strudel
        if (fileName.includes('strudel') || fileName.endsWith('.str') || fileName.endsWith('.std')) {
            return true;
        }

        // Check for Strudel-specific patterns in content
        const strudelPatterns = [
            /note\(/,
            /sound\(/,
            /stack\(/,
            /sequence\(/,
            /fastcat\(/,
            /scale\(/,
            /chord\(/,
            /\.gain\(/,
            /\.fast\(/,
            /\.slow\(/
        ];

        return strudelPatterns.some(pattern => pattern.test(content));
    }

    resolveCompletionItem(
        item: vscode.CompletionItem,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CompletionItem> {
        return item;
    }
}