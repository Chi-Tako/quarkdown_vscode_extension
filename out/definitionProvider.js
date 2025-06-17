"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuarkdownRenameProvider = exports.QuarkdownReferenceProvider = exports.QuarkdownDefinitionProvider = void 0;
const vscode = require("vscode");
const path = require("path");
class QuarkdownDefinitionProvider {
    async provideDefinition(document, position, token) {
        const range = document.getWordRangeAtPosition(position, /\.(\w+)/);
        if (!range) {
            return;
        }
        const word = document.getText(range);
        const identifier = word.substring(1); // Remove the dot
        // Look for function definitions
        const functionDef = await this.findFunctionDefinition(document, identifier);
        if (functionDef) {
            return functionDef;
        }
        // Look for variable definitions
        const variableDef = await this.findVariableDefinition(document, identifier);
        if (variableDef) {
            return variableDef;
        }
        return undefined;
    }
    async findFunctionDefinition(document, functionName) {
        // Search in current document first
        const currentDocDef = this.searchFunctionInDocument(document, functionName);
        if (currentDocDef) {
            return currentDocDef;
        }
        // Search in included files
        const includedFiles = await this.getIncludedFiles(document);
        for (const filePath of includedFiles) {
            try {
                const includedDoc = await vscode.workspace.openTextDocument(filePath);
                const includedDef = this.searchFunctionInDocument(includedDoc, functionName);
                if (includedDef) {
                    return includedDef;
                }
            }
            catch (error) {
                // File might not exist or be accessible
                continue;
            }
        }
        return undefined;
    }
    async findVariableDefinition(document, variableName) {
        // Search in current document first
        const currentDocDef = this.searchVariableInDocument(document, variableName);
        if (currentDocDef) {
            return currentDocDef;
        }
        // Search in included files
        const includedFiles = await this.getIncludedFiles(document);
        for (const filePath of includedFiles) {
            try {
                const includedDoc = await vscode.workspace.openTextDocument(filePath);
                const includedDef = this.searchVariableInDocument(includedDoc, variableName);
                if (includedDef) {
                    return includedDef;
                }
            }
            catch (error) {
                continue;
            }
        }
        return undefined;
    }
    searchFunctionInDocument(document, functionName) {
        const text = document.getText();
        const functionRegex = new RegExp(`\\.function\\s*\\{${functionName}\\}`, 'g');
        const match = functionRegex.exec(text);
        if (match) {
            const position = document.positionAt(match.index);
            const range = new vscode.Range(position, position);
            return new vscode.Location(document.uri, range);
        }
        return undefined;
    }
    searchVariableInDocument(document, variableName) {
        const text = document.getText();
        const variableRegex = new RegExp(`\\.var\\s*\\{${variableName}\\}`, 'g');
        const match = variableRegex.exec(text);
        if (match) {
            const position = document.positionAt(match.index);
            const range = new vscode.Range(position, position);
            return new vscode.Location(document.uri, range);
        }
        return undefined;
    }
    async getIncludedFiles(document) {
        const text = document.getText();
        const includeRegex = /\.include\s*\{([^}]+)\}/g;
        const includes = [];
        let match;
        while ((match = includeRegex.exec(text)) !== null) {
            const includePath = match[1];
            const fullPath = this.resolveIncludePath(document.uri.fsPath, includePath);
            includes.push(fullPath);
        }
        return includes;
    }
    resolveIncludePath(currentFile, includePath) {
        const currentDir = path.dirname(currentFile);
        return path.resolve(currentDir, includePath);
    }
}
exports.QuarkdownDefinitionProvider = QuarkdownDefinitionProvider;
class QuarkdownReferenceProvider {
    async provideReferences(document, position, context, token) {
        const range = document.getWordRangeAtPosition(position, /\.(\w+)/);
        if (!range) {
            return [];
        }
        const word = document.getText(range);
        const identifier = word.substring(1); // Remove the dot
        const references = [];
        // Check if this is a function or variable definition
        const lineText = document.lineAt(position.line).text;
        const isDefinition = lineText.includes('.function') || lineText.includes('.var');
        if (isDefinition) {
            // Find all references to this definition
            await this.findAllReferences(document, identifier, references);
            // Search in included files
            const includedFiles = await this.getIncludedFiles(document);
            for (const filePath of includedFiles) {
                try {
                    const includedDoc = await vscode.workspace.openTextDocument(filePath);
                    await this.findAllReferences(includedDoc, identifier, references);
                }
                catch (error) {
                    continue;
                }
            }
        }
        else {
            // This is a reference, find the definition and all other references
            await this.findAllReferences(document, identifier, references);
        }
        return references;
    }
    async findAllReferences(document, identifier, references) {
        const text = document.getText();
        // Find function definition
        const functionDefRegex = new RegExp(`\\.function\\s*\\{${identifier}\\}`, 'g');
        let match;
        while ((match = functionDefRegex.exec(text)) !== null) {
            const position = document.positionAt(match.index);
            const range = new vscode.Range(position, document.positionAt(match.index + match[0].length));
            references.push(new vscode.Location(document.uri, range));
        }
        // Find variable definition
        const variableDefRegex = new RegExp(`\\.var\\s*\\{${identifier}\\}`, 'g');
        while ((match = variableDefRegex.exec(text)) !== null) {
            const position = document.positionAt(match.index);
            const range = new vscode.Range(position, document.positionAt(match.index + match[0].length));
            references.push(new vscode.Location(document.uri, range));
        }
        // Find all usages (calls/references)
        const usageRegex = new RegExp(`\\.${identifier}\\b`, 'g');
        while ((match = usageRegex.exec(text)) !== null) {
            // Skip definitions we already found
            const beforeMatch = text.substring(Math.max(0, match.index - 20), match.index);
            if (beforeMatch.includes('.function') || beforeMatch.includes('.var')) {
                continue;
            }
            const position = document.positionAt(match.index);
            const range = new vscode.Range(position, document.positionAt(match.index + match[0].length));
            references.push(new vscode.Location(document.uri, range));
        }
    }
    async getIncludedFiles(document) {
        const text = document.getText();
        const includeRegex = /\.include\s*\{([^}]+)\}/g;
        const includes = [];
        let match;
        while ((match = includeRegex.exec(text)) !== null) {
            const includePath = match[1];
            const fullPath = this.resolveIncludePath(document.uri.fsPath, includePath);
            includes.push(fullPath);
        }
        return includes;
    }
    resolveIncludePath(currentFile, includePath) {
        const currentDir = path.dirname(currentFile);
        return path.resolve(currentDir, includePath);
    }
}
exports.QuarkdownReferenceProvider = QuarkdownReferenceProvider;
class QuarkdownRenameProvider {
    async provideRenameEdits(document, position, newName, token) {
        const range = document.getWordRangeAtPosition(position, /\.(\w+)/);
        if (!range) {
            return new vscode.WorkspaceEdit();
        }
        const word = document.getText(range);
        const identifier = word.substring(1); // Remove the dot
        const workspaceEdit = new vscode.WorkspaceEdit();
        // Find all references
        const referenceProvider = new QuarkdownReferenceProvider();
        const references = await referenceProvider.provideReferences(document, position, { includeDeclaration: true }, token);
        // Apply edits to all references
        for (const reference of references) {
            const referenceText = document.getText(reference.range);
            let newText;
            if (referenceText.includes('.function') || referenceText.includes('.var')) {
                // This is a definition, replace the name in braces
                newText = referenceText.replace(/\{[^}]+\}/, `{${newName}}`);
            }
            else {
                // This is a reference, replace the identifier
                newText = `.${newName}`;
            }
            workspaceEdit.replace(reference.uri, reference.range, newText);
        }
        return workspaceEdit;
    }
    prepareRename(document, position, token) {
        const range = document.getWordRangeAtPosition(position, /\.(\w+)/);
        if (!range) {
            throw new Error('Cannot rename this element');
        }
        const word = document.getText(range);
        const identifier = word.substring(1); // Remove the dot
        // Check if this is a user-defined function or variable
        const lineText = document.lineAt(position.line).text;
        const isUserDefined = lineText.includes('.function') || lineText.includes('.var') ||
            this.isUserDefinedReference(document, identifier);
        if (!isUserDefined) {
            throw new Error('Cannot rename built-in functions');
        }
        return {
            range: range,
            placeholder: identifier
        };
    }
    isUserDefinedReference(document, identifier) {
        const text = document.getText();
        const functionDefRegex = new RegExp(`\\.function\\s*\\{${identifier}\\}`, 'g');
        const variableDefRegex = new RegExp(`\\.var\\s*\\{${identifier}\\}`, 'g');
        return functionDefRegex.test(text) || variableDefRegex.test(text);
    }
}
exports.QuarkdownRenameProvider = QuarkdownRenameProvider;
//# sourceMappingURL=definitionProvider.js.map