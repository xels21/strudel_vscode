import * as vscode from 'vscode';
import * as path from 'path';

// Import completion data
import * as strudelCompletionData from './strudelCompletions.json';
import * as hydraCompletionData from './hydraCompletions.json';

// ============================================================
// TYPES & INTERFACES
// ============================================================

/**
 * Function completion metadata
 */
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

/**
 * Combined completion data structure
 */
export interface CombinedCompletionData {
    functions: CompletionFunction[];
    lastGenerated: string;
}

// ============================================================
// COMBINED COMPLETION PROVIDER
// ============================================================

/**
 * Provides intelligent completions for both Strudel and Hydra functions
 */
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

    // ============================================================
    // INITIALIZATION
    // ============================================================

    /**
     * Generates completion items from both Strudel and Hydra data
     */
    private generateCompletionItems(): void {
        this.addFunctionsFromData(this.strudelData.functions, 'strudel');
        this.addFunctionsFromData(this.hydraData.functions, 'hydra');
    }

    /**
     * Adds function completions from a data source
     */
    private addFunctionsFromData(functions: any[], category: 'strudel' | 'hydra'): void {
        for (const func of functions) {
            const item = this.createCompletionItem(func, category);
            this.completionItems.push(item);
        }
    }

    /**
     * Creates a completion item from function metadata
     */
    private createCompletionItem(func: any, category: 'strudel' | 'hydra'): vscode.CompletionItem {
        const item = new vscode.CompletionItem(func.name, vscode.CompletionItemKind.Function);
        
        // Set up documentation
        const description = `[${category.toUpperCase()}] ${func.description}`;
        item.detail = description;

        // Build markdown documentation
        const markdownDoc = this.buildMarkdownDocumentation(func, category);
        item.documentation = new vscode.MarkdownString(markdownDoc);

        // Set up snippet with parameters if available
        item.insertText = this.createInsertText(func);

        // Set filter text and sort order
        item.filterText = func.name;
        item.sortText = `${category === 'strudel' ? 'a' : 'b'}_${func.name}`; // Prioritize Strudel

        return item;
    }

    /**
     * Creates the insert text (snippet) for a function
     */
    private createInsertText(func: any): vscode.SnippetString | string {
        if (func.params && func.params.length > 0) {
            const paramSnippet = func.params
                .map((param: any, index: number) => `\${${index + 1}:${param.name}}`)
                .join(', ');
            return new vscode.SnippetString(`${func.name}(${paramSnippet})`);
        }
        return `${func.name}()`;
    }

    /**
     * Builds the documentation map for quick lookups
     */
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

    /**
     * Returns the documentation map (used by other providers)
     */
    getDocMap(): Map<string, CompletionFunction> {
        return this.docMap;
    }

    // ============================================================
    // MARKDOWN DOCUMENTATION
    // ============================================================

    /**
     * Builds rich markdown documentation for a function
     */
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
            parts.push(this.buildParametersSection(func.params));
        }

        // Examples
        if (func.examples && func.examples.length > 0) {
            parts.push(this.buildExamplesSection(func.examples));
        }

        // Synonyms (for Strudel functions)
        if (category === 'strudel' && func.synonyms) {
            parts.push(this.buildSynonymsSection(func));
        }

        return parts.join('\n');
    }

    /**
     * Builds the parameters section of documentation
     */
    private buildParametersSection(params: any[]): string {
        const lines = ['\n**Parameters:**'];
        for (const param of params) {
            const defaultValue = param.default !== undefined ? ` (default: ${param.default})` : '';
            lines.push(`- \`${param.name}\` (${param.type}): ${param.description}${defaultValue}`);
        }
        return lines.join('\n');
    }

    /**
     * Builds the examples section of documentation
     */
    private buildExamplesSection(examples: string[]): string {
        const lines = ['\n**Examples:**'];
        for (const example of examples) {
            lines.push('```javascript\n' + example + '\n```');
        }
        return lines.join('\n');
    }

    /**
     * Builds the synonyms section of documentation
     */
    private buildSynonymsSection(func: any): string {
        if (func.synonyms && func.synonyms.length > 0 && func.name !== func.originalName) {
            const otherSynonyms = [func.originalName, ...func.synonyms].filter(s => s !== func.name);
            if (otherSynonyms.length > 0) {
                return `\n**Synonyms:** ${otherSynonyms.join(', ')}`;
            }
        }
        return '';
    }

    // ============================================================
    // COMPLETION PROVIDER INTERFACE
    // ============================================================

    /**
     * Provides completion items for the given context
     */
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        if (!this.isRelevantContext(document)) {
            return [];
        }

        return this.filterCompletionsByContext(document, position);
    }

    /**
     * Filters completions based on file and content context
     */
    private filterCompletionsByContext(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] {
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

    /**
     * Resolves additional completion item details
     */
    resolveCompletionItem(
        item: vscode.CompletionItem,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CompletionItem> {
        return item;
    }

    // ============================================================
    // CONTEXT DETECTION
    // ============================================================

    /**
     * Checks if completions are relevant for this document
     */
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

    /**
     * Detects if current context is Hydra-specific
     */
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

    /**
     * Detects if current context is Strudel-specific
     */
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
}