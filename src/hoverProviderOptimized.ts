import * as vscode from 'vscode';
import { StrudelFunction } from './completionProviderOptimized';

export class StrudelHoverProviderOptimized implements vscode.HoverProvider {
    private docMap: Map<string, StrudelFunction>;

    constructor(docMap: Map<string, StrudelFunction>) {
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
}