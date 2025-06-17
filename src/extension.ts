import * as vscode from 'vscode';
import { AccurateQuarkdownPreviewProvider } from './accuratePreviewProvider';
import { QuarkdownCompletionProvider, QuarkdownHoverProvider } from './completionProvider';
import { QuarkdownDefinitionProvider, QuarkdownReferenceProvider, QuarkdownRenameProvider } from './definitionProvider';
import { QuarkdownDocumentSymbolProvider, QuarkdownWorkspaceSymbolProvider } from './documentSymbolProvider';
import { getProjectCommands } from './projectUtils';
import { exportToPdf, exportToSlides } from './exportUtils';

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 Quarkdown extension is now active!');

    // Register the accurate preview provider
    const previewProvider = new AccurateQuarkdownPreviewProvider(context.extensionUri);
    
    context.subscriptions.push(
        vscode.window.registerWebviewPanelSerializer('quarkdownPreview', previewProvider)
    );

    // Register language features
    const quarkdownSelector: vscode.DocumentSelector = { language: 'quarkdown', scheme: 'file' };
    
    // Completion and hover providers
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            quarkdownSelector,
            new QuarkdownCompletionProvider(),
            '.', '{', ':'
        )
    );
    
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(
            quarkdownSelector,
            new QuarkdownHoverProvider()
        )
    );
    
    // Definition, reference, and rename providers
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            quarkdownSelector,
            new QuarkdownDefinitionProvider()
        )
    );
    
    context.subscriptions.push(
        vscode.languages.registerReferenceProvider(
            quarkdownSelector,
            new QuarkdownReferenceProvider()
        )
    );
    
    context.subscriptions.push(
        vscode.languages.registerRenameProvider(
            quarkdownSelector,
            new QuarkdownRenameProvider()
        )
    );
    
    // Document symbol providers
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            quarkdownSelector,
            new QuarkdownDocumentSymbolProvider()
        )
    );
    
    context.subscriptions.push(
        vscode.languages.registerWorkspaceSymbolProvider(
            new QuarkdownWorkspaceSymbolProvider()
        )
    );

    // Register preview and export commands
    context.subscriptions.push(
        vscode.commands.registerCommand('quarkdown.preview', () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.languageId === 'quarkdown') {
                previewProvider.openPreview(activeEditor.document);
            } else {
                vscode.window.showErrorMessage('Please open a Quarkdown (.qmd) file first.');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('quarkdown.exportPdf', async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.languageId === 'quarkdown') {
                await exportToPdf(activeEditor.document);
            } else {
                vscode.window.showErrorMessage('Please open a Quarkdown (.qmd) file first.');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('quarkdown.exportSlides', async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.languageId === 'quarkdown') {
                await exportToSlides(activeEditor.document);
            } else {
                vscode.window.showErrorMessage('Please open a Quarkdown (.qmd) file first.');
            }
        })
    );
    
    // Register project commands
    context.subscriptions.push(...getProjectCommands());
    
    // Register additional utility commands
    context.subscriptions.push(
        vscode.commands.registerCommand('quarkdown.insertFunction', async () => {
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
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('quarkdown.insertVariable', async () => {
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
        })
    );

    // Auto-refresh preview when document changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'quarkdown') {
                previewProvider.updatePreview(event.document);
            }
        })
    );
    
    // Show welcome message for first-time users
    const config = vscode.workspace.getConfiguration('quarkdown');
    if (!config.get('hasShownWelcome')) {
        vscode.window.showInformationMessage(
            'Welcome to Quarkdown! 🎉 Create your first project or open a .qmd file to get started.',
            'Create Project', 'Open Sample'
        ).then(choice => {
            if (choice === 'Create Project') {
                vscode.commands.executeCommand('quarkdown.createProject');
            } else if (choice === 'Open Sample') {
                // Open the example file
                vscode.workspace.openTextDocument(
                    vscode.Uri.file(context.asAbsolutePath('example.qmd'))
                ).then(doc => {
                    vscode.window.showTextDocument(doc);
                });
            }
        });
        
        config.update('hasShownWelcome', true, true);
    }
}

export function deactivate() {
    console.log('👋 Quarkdown extension is now deactivated.');
}