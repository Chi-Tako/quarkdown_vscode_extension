import * as vscode from 'vscode';
import * as l10n from '@vscode/l10n';
import { AccurateQuarkdownPreviewProvider } from './accuratePreviewProvider';
import { QuarkdownCompletionProvider, QuarkdownHoverProvider } from './completionProvider';
import { QuarkdownDefinitionProvider, QuarkdownReferenceProvider, QuarkdownRenameProvider } from './definitionProvider';
import { QuarkdownDocumentSymbolProvider, QuarkdownWorkspaceSymbolProvider } from './documentSymbolProvider';
import { getProjectCommands } from './projectUtils';
import { exportToPdf, exportToSlides } from './exportUtils';

let previewProvider: AccurateQuarkdownPreviewProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 Quarkdown extension is now active!');

    try {
        // Register the accurate preview provider
        previewProvider = new AccurateQuarkdownPreviewProvider(context.extensionUri);
    
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
                previewProvider?.openPreview(activeEditor.document);
            } else {
                vscode.window.showErrorMessage(l10n.t('errors.openQuarkdownFile'));
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('quarkdown.exportPdf', async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.languageId === 'quarkdown') {
                await exportToPdf(activeEditor.document);
            } else {
                vscode.window.showErrorMessage(l10n.t('errors.openQuarkdownFile'));
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('quarkdown.exportSlides', async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.languageId === 'quarkdown') {
                await exportToSlides(activeEditor.document);
            } else {
                vscode.window.showErrorMessage(l10n.t('errors.openQuarkdownFile'));
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
                vscode.window.showErrorMessage(l10n.t('errors.openQuarkdownFile'));
                return;
            }
            
            const functionName = await vscode.window.showInputBox({
                prompt: l10n.t('input.functionName.prompt'),
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return l10n.t('input.functionName.empty');
                    }
                    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
                        return l10n.t('input.functionName.invalid');
                    }
                    return undefined;
                }
            });
            
            if (!functionName) {
                return;
            }
            
            const parameters = await vscode.window.showInputBox({
                prompt: l10n.t('input.functionParams.prompt'),
                placeHolder: l10n.t('input.functionParams.placeholder')
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
                vscode.window.showErrorMessage(l10n.t('errors.openQuarkdownFile'));
                return;
            }
            
            const varName = await vscode.window.showInputBox({
                prompt: l10n.t('input.variableName.prompt'),
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return l10n.t('input.variableName.empty');
                    }
                    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
                        return l10n.t('input.variableName.invalid');
                    }
                    return undefined;
                }
            });
            
            if (!varName) {
                return;
            }
            
            const varValue = await vscode.window.showInputBox({
                prompt: l10n.t('input.variableValue.prompt'),
                placeHolder: l10n.t('input.variableValue.placeholder')
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

    // 新しいコマンドを登録
    context.subscriptions.push(
        vscode.commands.registerCommand('quarkdown.openSettings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'quarkdown');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('quarkdown.showWelcome', () => {
            const isWindows = process.platform === 'win32';
            const message = isWindows 
                ? l10n.t('welcome.windows')
                : l10n.t('welcome.other');
            
            const action = isWindows ? l10n.t('buttons.openSettings') : l10n.t('buttons.ok');
            
            vscode.window.showInformationMessage(message, action, l10n.t('buttons.dismiss')).then((selection) => {
                if (selection === l10n.t('buttons.openSettings')) {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'quarkdown.cliPath');
                }
            });
        })
    );

    // Auto-refresh preview when document changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'quarkdown') {
                previewProvider?.updatePreview(event.document);
            }
        })
    );
    
    // 初回起動時にウェルカムメッセージを表示（新しい実装）
    const hasShownWelcome = context.globalState.get('quarkdown.hasShownWelcome', false);
    if (!hasShownWelcome) {
        const config = vscode.workspace.getConfiguration('quarkdown');
        if (config.get('showWelcomeMessage', true)) {
            setTimeout(() => {
                vscode.commands.executeCommand('quarkdown.showWelcome');
                context.globalState.update('quarkdown.hasShownWelcome', true);
            }, 1000); // 1秒後に表示
        }
    }
    } catch (error) {
        console.error('Failed to activate Quarkdown extension:', error);
        vscode.window.showErrorMessage(l10n.t('errors.activationFailed', String(error)));
    }
}


export function deactivate() {
    console.log('👋 Quarkdown extension is now deactivated.');
    
    try {
        // Cleanup preview provider resources
        if (previewProvider) {
            previewProvider.dispose();
            previewProvider = undefined;
        }
    } catch (error) {
        console.error(l10n.t('errors.deactivationFailed', String(error)));
    }
}
