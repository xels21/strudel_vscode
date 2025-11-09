import * as vscode from 'vscode';
import { CompletionFunction } from './combinedCompletionProvider';

export class CombinedHoverProvider implements vscode.HoverProvider {
    private docMap: Map<string, CompletionFunction>;

    constructor(docMap: Map<string, CompletionFunction>) {
        this.docMap = docMap;
    }

    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        const range = document.getWordRangeAtPosition(position);
        if (!range) return null;

        const word = document.getText(range);
        const func = this.docMap.get(word);
        
        if (!func) return null;

        const markdownDoc = this.buildMarkdownDocumentation(func);
        return new vscode.Hover(new vscode.MarkdownString(markdownDoc), range);
    }

    private buildMarkdownDocumentation(func: CompletionFunction): string {
        const parts: string[] = [];

        // Function name and description with category badge
        const categoryBadge = func.category === 'strudel' ? '🌀 **STRUDEL**' : '🌊 **HYDRA**';
        if (func.description) {
            parts.push(`${categoryBadge} **${func.name}**\n\n${func.description}`);
        } else {
            parts.push(`${categoryBadge} **${func.name}**`);
        }

        // Add function type for Hydra
        if (func.category === 'hydra' && func.type) {
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
        if (func.category === 'strudel' && func.synonyms && func.synonyms.length > 0 && func.name !== func.originalName) {
            const otherSynonyms = [func.originalName, ...func.synonyms].filter(s => s !== func.name);
            if (otherSynonyms.length > 0) {
                parts.push(`\n**Synonyms:** ${otherSynonyms.join(', ')}`);
            }
        }

        return parts.join('\n');
    }
}