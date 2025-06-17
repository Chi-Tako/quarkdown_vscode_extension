"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const accuratePreviewProvider_1 = require("./accuratePreviewProvider");
const completionProvider_1 = require("./completionProvider");
const definitionProvider_1 = require("./definitionProvider");
const documentSymbolProvider_1 = require("./documentSymbolProvider");
const projectUtils_1 = require("./projectUtils");
const exportUtils_1 = require("./exportUtils");
function activate(context) {
    console.log('🚀 Quarkdown extension is now active!');
    // Register the accurate preview provider
    const previewProvider = new accuratePreviewProvider_1.AccurateQuarkdownPreviewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewPanelSerializer('quarkdownPreview', previewProvider));
    // Register language features
    const quarkdownSelector = { language: 'quarkdown', scheme: 'file' };
    // Completion and hover providers
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(quarkdownSelector, new completionProvider_1.QuarkdownCompletionProvider(), '.', '{', ':'));
    context.subscriptions.push(vscode.languages.registerHoverProvider(quarkdownSelector, new completionProvider_1.QuarkdownHoverProvider()));
    // Definition, reference, and rename providers
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(quarkdownSelector, new definitionProvider_1.QuarkdownDefinitionProvider()));
    context.subscriptions.push(vscode.languages.registerReferenceProvider(quarkdownSelector, new definitionProvider_1.QuarkdownReferenceProvider()));
    context.subscriptions.push(vscode.languages.registerRenameProvider(quarkdownSelector, new definitionProvider_1.QuarkdownRenameProvider()));
    // Document symbol providers
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(quarkdownSelector, new documentSymbolProvider_1.QuarkdownDocumentSymbolProvider()));
    context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider(new documentSymbolProvider_1.QuarkdownWorkspaceSymbolProvider()));
    // Register preview and export commands
    context.subscriptions.push(vscode.commands.registerCommand('quarkdown.preview', () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.languageId === 'quarkdown') {
            previewProvider.openPreview(activeEditor.document);
        }
        else {
            vscode.window.showErrorMessage('Please open a Quarkdown (.qmd) file first.');
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('quarkdown.exportPdf', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.languageId === 'quarkdown') {
            await (0, exportUtils_1.exportToPdf)(activeEditor.document);
        }
        else {
            vscode.window.showErrorMessage('Please open a Quarkdown (.qmd) file first.');
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('quarkdown.exportSlides', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.languageId === 'quarkdown') {
            await (0, exportUtils_1.exportToSlides)(activeEditor.document);
        }
        else {
            vscode.window.showErrorMessage('Please open a Quarkdown (.qmd) file first.');
        }
    }));
    // Register project commands
    context.subscriptions.push(...(0, projectUtils_1.getProjectCommands)());
    // Register additional utility commands
    context.subscriptions.push(vscode.commands.registerCommand('quarkdown.insertFunction', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'quarkdown') {
            vscode.window.showErrorMessage('Please open a Quarkdown (.qmd) file first.');
            return;
        }
        const functionName = await vscode.window.showInputBox({
            prompt: 'Enter function name',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Function name cannot be empty';
                }
                if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
                    return 'Function name must be a valid identifier';
                }
                return undefined;
            }
        });
        if (!functionName) {
            return;
        }
        const parameters = await vscode.window.showInputBox({
            prompt: 'Enter function parameters (optional)',
            placeHolder: 'param1 param2'
        });
        const functionText = `.function {${functionName}}${parameters ? ` ${parameters}:` : ':'}
`;
        editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, functionText);
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand('quarkdown.insertVariable', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'quarkdown') {
            vscode.window.showErrorMessage('Please open a Quarkdown (.qmd) file first.');
            return;
        }
        const varName = await vscode.window.showInputBox({
            prompt: 'Enter variable name',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Variable name cannot be empty';
                }
                if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
                    return 'Variable name must be a valid identifier';
                }
                return undefined;
            }
        });
        if (!varName) {
            return;
        }
        const varValue = await vscode.window.showInputBox({
            prompt: 'Enter variable value',
            placeHolder: 'Variable value'
        });
        if (varValue === undefined) {
            return;
        }
        const variableText = `.var {${varName}} {${varValue}}
`;
        editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, variableText);
        });
    }));
    // Auto-refresh preview when document changes
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'quarkdown') {
            previewProvider.updatePreview(event.document);
        }
    }));
    // Show welcome message for first-time users
    const config = vscode.workspace.getConfiguration('quarkdown');
    if (!config.get('hasShownWelcome')) {
        vscode.window.showInformationMessage('Welcome to Quarkdown! 🎉 Create your first project or open a .qmd file to get started.', 'Create Project', 'Open Sample').then(choice => {
            if (choice === 'Create Project') {
                vscode.commands.executeCommand('quarkdown.createProject');
            }
            else if (choice === 'Open Sample') {
                // Open the example file
                vscode.workspace.openTextDocument(vscode.Uri.file(context.asAbsolutePath('example.qmd'))).then(doc => {
                    vscode.window.showTextDocument(doc);
                });
            }
        });
        config.update('hasShownWelcome', true, true);
    }
}
exports.activate = activate;
function deactivate() {
    console.log('👋 Quarkdown extension is now deactivated.');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map