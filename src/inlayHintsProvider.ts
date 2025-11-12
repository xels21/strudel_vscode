import * as vscode from 'vscode';

// ============================================================
// INLAY HINTS PROVIDER
// ============================================================

/**
 * Provides parameter name hints for function calls in the editor
 */
export class InlayHintsProvider implements vscode.InlayHintsProvider {
    private docMap: Map<string, any>;

    constructor(docMap: Map<string, any>) {
        this.docMap = docMap;
    }

    // ============================================================
    // MAIN PROVIDER INTERFACE
    // ============================================================

    /**
     * Provides inlay hints for the given document and range
     */
    provideInlayHints(
        document: vscode.TextDocument,
        range: vscode.Range,
        token: vscode.CancellationToken
    ): vscode.InlayHint[] {
        // Check if parameter hints are enabled
        if (!this.areParameterHintsEnabled()) {
            return [];
        }
        
        const hints: vscode.InlayHint[] = [];
        const text = document.getText(range);
        
        // Recursively find all function calls (including nested)
        this.findFunctionCalls(text, range.start.character, document, hints);
        return hints;
    }

    // ============================================================
    // CONFIGURATION
    // ============================================================

    /**
     * Checks if parameter hints are enabled in settings
     */
    private areParameterHintsEnabled(): boolean {
        const config = vscode.workspace.getConfiguration('strudel');
        return config.get('showParameterHints', true);
    }

    // ============================================================
    // FUNCTION CALL PARSING
    // ============================================================

    /**
     * Finds all function calls in the text and generates hints
     */
    private findFunctionCalls(
        text: string,
        offset: number,
        document: vscode.TextDocument,
        hints: vscode.InlayHint[],
        processedPositions: Set<number> = new Set()
    ): void {
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
            
            // Generate hints for this function's arguments
            this.generateHintsForArguments(
                docItem,
                argsString,
                offset + openParenPos + 1,
                document,
                hints
            );
            
            // Recursively check for nested function calls
            this.findFunctionCalls(argsString, offset + openParenPos + 1, document, hints, processedPositions);
        }
    }

    /**
     * Generates inlay hints for function arguments
     */
    private generateHintsForArguments(
        docItem: any,
        argsString: string,
        argsStartOffset: number,
        document: vscode.TextDocument,
        hints: vscode.InlayHint[]
    ): void {
        const args = this.parseArguments(argsString);
        
        args.forEach((arg, index) => {
            if (index < docItem.params.length) {
                const param = docItem.params[index];
                const argPosition = document.positionAt(argsStartOffset + arg.start);
                const hint = new vscode.InlayHint(
                    argPosition,
                    `${param.name}:`,
                    vscode.InlayHintKind.Parameter
                );
                hint.paddingRight = true;
                hints.push(hint);
            }
        });
    }

    // ============================================================
    // PARENTHESES & ARGUMENT PARSING
    // ============================================================

    /**
     * Extracts the content between balanced parentheses
     */
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
    
    /**
     * Parses function arguments, handling nested calls and strings
     */
    private parseArguments(argsString: string): { text: string; start: number }[] {
        if (!argsString.trim()) return [];
        
        const args: { text: string; start: number }[] = [];
        let currentArg = '';
        let start = 0;
        
        const state = {
            parenDepth: 0,
            bracketDepth: 0,
            braceDepth: 0,
            inString: false,
            stringChar: ''
        };
        
        for (let i = 0; i < argsString.length; i++) {
            const char = argsString[i];
            const prevChar = i > 0 ? argsString[i - 1] : '';
            
            this.updateParsingState(char, prevChar, state);
            
            if (this.isTopLevelComma(char, state)) {
                args.push({ text: currentArg.trim(), start });
                currentArg = '';
                start = i + 1;
                continue;
            }
            
            currentArg += char;
        }
        
        // Add last argument
        if (currentArg.trim()) {
            args.push({ text: currentArg.trim(), start });
        }
        
        return args;
    }

    /**
     * Updates the parsing state based on current character
     */
    private updateParsingState(char: string, prevChar: string, state: any): void {
        // Handle string boundaries
        if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
            if (!state.inString) {
                state.inString = true;
                state.stringChar = char;
            } else if (char === state.stringChar) {
                state.inString = false;
            }
        }
        
        if (!state.inString) {
            // Track nesting depth
            if (char === '(') state.parenDepth++;
            if (char === ')') state.parenDepth--;
            if (char === '[') state.bracketDepth++;
            if (char === ']') state.bracketDepth--;
            if (char === '{') state.braceDepth++;
            if (char === '}') state.braceDepth--;
        }
    }

    /**
     * Checks if a comma is at the top level (not nested)
     */
    private isTopLevelComma(char: string, state: any): boolean {
        return char === ',' && 
               !state.inString && 
               state.parenDepth === 0 && 
               state.bracketDepth === 0 && 
               state.braceDepth === 0;
    }
}
