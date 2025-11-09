import * as vscode from 'vscode';
import { StrudelDoc, StrudelDocEntry } from './completionProvider';

export class StrudelHoverProvider implements vscode.HoverProvider {
    private docMap: Map<string, StrudelDocEntry> = new Map();

    constructor(docData: StrudelDoc | null) {
        if (docData) {
            this.buildDocMap(docData);
        }
    }

    private buildDocMap(docData: StrudelDoc): void {
        for (const doc of docData.docs) {
            if (!this.isValidDoc(doc)) continue;

            // Map the main name
            this.docMap.set(doc.name, doc);

            // Map synonyms
            if (doc.synonyms) {
                for (const synonym of doc.synonyms) {
                    this.docMap.set(synonym, doc);
                }
            }
        }
    }

    private isValidDoc(doc: StrudelDocEntry): boolean {
        return Boolean(doc.name) && 
               !doc.name.startsWith('_') && 
               doc.kind !== 'package' &&
               doc.kind !== 'module';
    }

    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        const range = document.getWordRangeAtPosition(position);
        if (!range) return null;

        const word = document.getText(range);
        const doc = this.docMap.get(word);
        
        if (!doc) return null;

        const markdownDoc = this.buildMarkdownDocumentation(doc, word);
        return new vscode.Hover(new vscode.MarkdownString(markdownDoc), range);
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
}