"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuarkdownWorkspaceSymbolProvider = exports.QuarkdownDocumentSymbolProvider = void 0;
const vscode = require("vscode");
class QuarkdownDocumentSymbolProvider {
    provideDocumentSymbols(document, token) {
        const symbols = [];
        const text = document.getText();
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineRange = new vscode.Range(i, 0, i, line.length);
            // Parse headings
            const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const title = headingMatch[2];
                const symbol = new vscode.DocumentSymbol(title, `H${level}`, vscode.SymbolKind.String, lineRange, lineRange);
                this.addToHierarchy(symbols, symbol, level);
                continue;
            }
            // Parse function definitions
            const functionMatch = line.match(/\.function\s*\{([^}]+)\}/);
            if (functionMatch) {
                const funcName = functionMatch[1];
                const funcRange = this.getFunctionRange(document, i);
                const symbol = new vscode.DocumentSymbol(funcName, 'function', vscode.SymbolKind.Function, funcRange, lineRange);
                // Parse function parameters
                const paramMatch = line.match(/\.function\s*\{[^}]+\}\s*(.*):/);
                if (paramMatch) {
                    const params = paramMatch[1].trim();
                    if (params) {
                        symbol.detail = `(${params})`;
                    }
                }
                symbols.push(symbol);
                continue;
            }
            // Parse variable definitions
            const varMatch = line.match(/\.var\s*\{([^}]+)\}\s*(.*)/);
            if (varMatch) {
                const varName = varMatch[1];
                const varValue = varMatch[2];
                const symbol = new vscode.DocumentSymbol(varName, varValue || 'variable', vscode.SymbolKind.Variable, lineRange, lineRange);
                symbols.push(symbol);
                continue;
            }
            // Parse control structures
            const controlMatch = line.match(/\.(if|ifnot|foreach|repeat)\s*\{([^}]+)\}/);
            if (controlMatch) {
                const controlType = controlMatch[1];
                const condition = controlMatch[2];
                const controlRange = this.getControlRange(document, i);
                const symbol = new vscode.DocumentSymbol(`${controlType}: ${condition}`, 'control', vscode.SymbolKind.Operator, controlRange, lineRange);
                symbols.push(symbol);
                continue;
            }
            // Parse file operations
            const includeMatch = line.match(/\.include\s*\{([^}]+)\}/);
            if (includeMatch) {
                const filename = includeMatch[1];
                const symbol = new vscode.DocumentSymbol(`include: ${filename}`, 'import', vscode.SymbolKind.Module, lineRange, lineRange);
                symbols.push(symbol);
                continue;
            }
            // Parse theme and document settings
            const themeMatch = line.match(/\.theme\s*\{([^}]+)\}/);
            if (themeMatch) {
                const themeName = themeMatch[1];
                const symbol = new vscode.DocumentSymbol(`theme: ${themeName}`, 'setting', vscode.SymbolKind.Property, lineRange, lineRange);
                symbols.push(symbol);
                continue;
            }
            const doctypeMatch = line.match(/\.doctype\s*\{([^}]+)\}/);
            if (doctypeMatch) {
                const doctype = doctypeMatch[1];
                const symbol = new vscode.DocumentSymbol(`doctype: ${doctype}`, 'setting', vscode.SymbolKind.Property, lineRange, lineRange);
                symbols.push(symbol);
                continue;
            }
        }
        return symbols;
    }
    addToHierarchy(symbols, newSymbol, level) {
        if (level === 1 || symbols.length === 0) {
            symbols.push(newSymbol);
            return;
        }
        // Find the appropriate parent heading
        for (let i = symbols.length - 1; i >= 0; i--) {
            const symbol = symbols[i];
            if (symbol.kind === vscode.SymbolKind.String) { // Heading
                const parentLevel = this.getHeadingLevel(symbol.detail);
                if (parentLevel < level) {
                    symbol.children.push(newSymbol);
                    return;
                }
            }
        }
        // No appropriate parent found, add to root
        symbols.push(newSymbol);
    }
    getHeadingLevel(detail) {
        const match = detail.match(/H(\d+)/);
        return match ? parseInt(match[1]) : 1;
    }
    getFunctionRange(document, startLine) {
        const lines = document.getText().split('\n');
        let endLine = startLine;
        // Find the end of the function (next empty line or next directive)
        for (let i = startLine + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '' || line.startsWith('.')) {
                break;
            }
            endLine = i;
        }
        return new vscode.Range(startLine, 0, endLine, lines[endLine]?.length || 0);
    }
    getControlRange(document, startLine) {
        const lines = document.getText().split('\n');
        let endLine = startLine;
        // For control structures, find the content that belongs to them
        const startIndent = this.getIndentLevel(lines[startLine]);
        for (let i = startLine + 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim() === '') {
                continue; // Skip empty lines
            }
            const currentIndent = this.getIndentLevel(line);
            // If we hit a line with same or less indentation that starts with '.', end here
            if (currentIndent <= startIndent && line.trim().startsWith('.')) {
                break;
            }
            endLine = i;
        }
        return new vscode.Range(startLine, 0, endLine, lines[endLine]?.length || 0);
    }
    getIndentLevel(line) {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
    }
}
exports.QuarkdownDocumentSymbolProvider = QuarkdownDocumentSymbolProvider;
class QuarkdownWorkspaceSymbolProvider {
    async provideWorkspaceSymbols(query, token) {
        const symbols = [];
        // Find all .qmd files in the workspace
        const files = await vscode.workspace.findFiles('**/*.qmd', '**/node_modules/**');
        for (const file of files) {
            if (token.isCancellationRequested) {
                break;
            }
            try {
                const document = await vscode.workspace.openTextDocument(file);
                const documentSymbols = await this.getDocumentSymbols(document);
                // Convert document symbols to workspace symbols
                for (const docSymbol of documentSymbols) {
                    if (this.matchesQuery(docSymbol.name, query)) {
                        const location = new vscode.Location(file, docSymbol.range);
                        const workspaceSymbol = new vscode.SymbolInformation(docSymbol.name, docSymbol.kind, docSymbol.detail || '', location);
                        symbols.push(workspaceSymbol);
                    }
                    // Also check children
                    this.addChildSymbols(docSymbol.children, file, query, symbols);
                }
            }
            catch (error) {
                // Skip files that can't be read
                continue;
            }
        }
        return symbols;
    }
    async getDocumentSymbols(document) {
        const provider = new QuarkdownDocumentSymbolProvider();
        const result = await provider.provideDocumentSymbols(document, new vscode.CancellationTokenSource().token);
        return result || [];
    }
    addChildSymbols(children, file, query, symbols) {
        for (const child of children) {
            if (this.matchesQuery(child.name, query)) {
                const location = new vscode.Location(file, child.range);
                const workspaceSymbol = new vscode.SymbolInformation(child.name, child.kind, child.detail || '', location);
                symbols.push(workspaceSymbol);
            }
            // Recursively check children
            this.addChildSymbols(child.children, file, query, symbols);
        }
    }
    matchesQuery(symbolName, query) {
        if (!query) {
            return true;
        }
        return symbolName.toLowerCase().includes(query.toLowerCase());
    }
}
exports.QuarkdownWorkspaceSymbolProvider = QuarkdownWorkspaceSymbolProvider;
//# sourceMappingURL=documentSymbolProvider.js.map