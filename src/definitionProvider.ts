import * as vscode from 'vscode';
import * as path from 'path';

export class QuarkdownDefinitionProvider implements vscode.DefinitionProvider {
    
    public async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | undefined> {
        
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
    
    private async findFunctionDefinition(
        document: vscode.TextDocument,
        functionName: string
    ): Promise<vscode.Location | undefined> {
        
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
            } catch (error) {
                // File might not exist or be accessible
                continue;
            }
        }
        
        return undefined;
    }
    
    private async findVariableDefinition(
        document: vscode.TextDocument,
        variableName: string
    ): Promise<vscode.Location | undefined> {
        
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
            } catch (error) {
                continue;
            }
        }
        
        return undefined;
    }
    
    private searchFunctionInDocument(
        document: vscode.TextDocument,
        functionName: string
    ): vscode.Location | undefined {
        
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
    
    private searchVariableInDocument(
        document: vscode.TextDocument,
        variableName: string
    ): vscode.Location | undefined {
        
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
    
    private async getIncludedFiles(document: vscode.TextDocument): Promise<string[]> {
        const text = document.getText();
        const includeRegex = /\.include\s*\{([^}]+)\}/g;
        const includes: string[] = [];
        let match;
        
        while ((match = includeRegex.exec(text)) !== null) {
            const includePath = match[1];
            const fullPath = this.resolveIncludePath(document.uri.fsPath, includePath);
            includes.push(fullPath);
        }
        
        return includes;
    }
    
    private resolveIncludePath(currentFile: string, includePath: string): string {
        const currentDir = path.dirname(currentFile);
        return path.resolve(currentDir, includePath);
    }
}

export class QuarkdownReferenceProvider implements vscode.ReferenceProvider {
    
    public async provideReferences(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.ReferenceContext,
        token: vscode.CancellationToken
    ): Promise<vscode.Location[]> {
        
        const range = document.getWordRangeAtPosition(position, /\.(\w+)/);
        if (!range) {
            return [];
        }
        
        const word = document.getText(range);
        const identifier = word.substring(1); // Remove the dot
        
        const references: vscode.Location[] = [];
        
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
                } catch (error) {
                    continue;
                }
            }
        } else {
            // This is a reference, find the definition and all other references
            await this.findAllReferences(document, identifier, references);
        }
        
        return references;
    }
    
    private async findAllReferences(
        document: vscode.TextDocument,
        identifier: string,
        references: vscode.Location[]
    ): Promise<void> {
        
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
    
    private async getIncludedFiles(document: vscode.TextDocument): Promise<string[]> {
        const text = document.getText();
        const includeRegex = /\.include\s*\{([^}]+)\}/g;
        const includes: string[] = [];
        let match;
        
        while ((match = includeRegex.exec(text)) !== null) {
            const includePath = match[1];
            const fullPath = this.resolveIncludePath(document.uri.fsPath, includePath);
            includes.push(fullPath);
        }
        
        return includes;
    }
    
    private resolveIncludePath(currentFile: string, includePath: string): string {
        const currentDir = path.dirname(currentFile);
        return path.resolve(currentDir, includePath);
    }
}

export class QuarkdownRenameProvider implements vscode.RenameProvider {
    
    public async provideRenameEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        newName: string,
        token: vscode.CancellationToken
    ): Promise<vscode.WorkspaceEdit> {
        
        const range = document.getWordRangeAtPosition(position, /\.(\w+)/);
        if (!range) {
            return new vscode.WorkspaceEdit();
        }
        
        const word = document.getText(range);
        const identifier = word.substring(1); // Remove the dot
        
        const workspaceEdit = new vscode.WorkspaceEdit();
        
        // Find all references
        const referenceProvider = new QuarkdownReferenceProvider();
        const references = await referenceProvider.provideReferences(
            document, 
            position, 
            { includeDeclaration: true }, 
            token
        );
        
        // Apply edits to all references
        for (const reference of references) {
            const referenceText = document.getText(reference.range);
            let newText: string;
            
            if (referenceText.includes('.function') || referenceText.includes('.var')) {
                // This is a definition, replace the name in braces
                newText = referenceText.replace(/\{[^}]+\}/, `{${newName}}`);
            } else {
                // This is a reference, replace the identifier
                newText = `.${newName}`;
            }
            
            workspaceEdit.replace(reference.uri, reference.range, newText);
        }
        
        return workspaceEdit;
    }
    
    public prepareRename(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Range | { range: vscode.Range; placeholder: string; }> {
        
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
    
    private isUserDefinedReference(document: vscode.TextDocument, identifier: string): boolean {
        const text = document.getText();
        const functionDefRegex = new RegExp(`\\.function\\s*\\{${identifier}\\}`, 'g');
        const variableDefRegex = new RegExp(`\\.var\\s*\\{${identifier}\\}`, 'g');
        
        return functionDefRegex.test(text) || variableDefRegex.test(text);
    }
}