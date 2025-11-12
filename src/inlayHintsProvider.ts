import * as vscode from 'vscode';

export class InlayHintsProvider implements vscode.InlayHintsProvider {
    private docMap: Map<string, any>;

    constructor(docMap: Map<string, any>) {
        this.docMap = docMap;
    }

    provideInlayHints(
        document: vscode.TextDocument,
        range: vscode.Range,
        token: vscode.CancellationToken
    ): vscode.InlayHint[] {
        // Check if parameter hints are enabled
        const config = vscode.workspace.getConfiguration('strudel');
        const showParameterHints = config.get('showParameterHints', true);
        
        if (!showParameterHints) {
            return [];
        }
        
        const hints: vscode.InlayHint[] = [];
        const text = document.getText(range);
        
        // Recursively find all function calls (including nested)
        this.findFunctionCalls(text, range.start.character, document, hints);
        return hints;
    }

    private findFunctionCalls(
        text: string,
        offset: number,
        document: vscode.TextDocument,
        hints: vscode.InlayHint[],
        processedPositions: Set<number> = new Set()
    ) {
        // Find function calls with proper parentheses matching
        const functionCallRegex = /(\w+)\s*\(/g;
        let match: RegExpExecArray | null;
        
        while ((match = functionCallRegex.exec(text)) !== null) {
            const functionName = match[1];
            const openParenPos = match.index + match[0].length - 1;
            const absolutePos = offset + match.index;
            
            // Skip if already processed
            if (processedPositions.has(absolutePos)) continue;
            processedPositions.add(absolutePos);
            
            // Find matching closing parenthesis
            const argsString = this.extractBalancedParentheses(text, openParenPos);
            if (argsString === null) continue;
            
            const docItem = this.docMap.get(functionName);
            if (!docItem || !docItem.params) {
                // Still recurse even if no docs for this function
                this.findFunctionCalls(argsString, offset + openParenPos + 1, document, hints, processedPositions);
                continue;
            }
            
            const args = this.parseArguments(argsString);
            const argsStartOffset = openParenPos + 1; // +1 to skip opening paren
            
            args.forEach((arg, index) => {
                if (index < docItem.params.length) {
                    const param = docItem.params[index];
                    const argPosition = document.positionAt(offset + argsStartOffset + arg.start);
                    const hint = new vscode.InlayHint(
                        argPosition,
                        `${param.name}:`,
                        vscode.InlayHintKind.Parameter
                    );
                    hint.paddingRight = true;
                    hints.push(hint);
                }
            });
            
            // Recursively check for nested function calls in the arguments
            this.findFunctionCalls(argsString, offset + argsStartOffset, document, hints, processedPositions);
        }
    }
    
    private extractBalancedParentheses(text: string, openPos: number): string | null {
        let depth = 1;
        let i = openPos + 1;
        
        while (i < text.length && depth > 0) {
            if (text[i] === '(') depth++;
            if (text[i] === ')') depth--;
            i++;
        }
        
        if (depth !== 0) return null;
        return text.substring(openPos + 1, i - 1);
    }
    
    private parseArguments(argsString: string): { text: string; start: number }[] {
        if (!argsString.trim()) return [];
        
        const args: { text: string; start: number }[] = [];
        let currentArg = '';
        let parenDepth = 0;
        let bracketDepth = 0;
        let braceDepth = 0;
        let inString = false;
        let stringChar = '';
        let start = 0;
        
        for (let i = 0; i < argsString.length; i++) {
            const char = argsString[i];
            const prevChar = i > 0 ? argsString[i - 1] : '';
            
            // Handle string boundaries
            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                }
            }
            
            if (!inString) {
                // Track nesting depth
                if (char === '(') parenDepth++;
                if (char === ')') parenDepth--;
                if (char === '[') bracketDepth++;
                if (char === ']') bracketDepth--;
                if (char === '{') braceDepth++;
                if (char === '}') braceDepth--;
                
                // Split on commas only at top level
                if (char === ',' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
                    args.push({ text: currentArg.trim(), start });
                    currentArg = '';
                    start = i + 1;
                    continue;
                }
            }
            
            currentArg += char;
        }
        
        // Add last argument
        if (currentArg.trim()) {
            args.push({ text: currentArg.trim(), start });
        }
        
        return args;
    }
}
