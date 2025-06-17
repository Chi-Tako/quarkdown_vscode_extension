"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const accuratePreviewProvider_1 = require("./accuratePreviewProvider");
const completionProvider_1 = require("./completionProvider");
const definitionProvider_1 = require("./definitionProvider");
const documentSymbolProvider_1 = require("./documentSymbolProvider");
const exportUtils_1 = require("./exportUtils");
function activate(context) {
    console.log('🚀 Quarkdown extension is now active!');
    // 拡張機能のアクティベーション時にQuarkdownのインストール状況をチェック
    (0, exportUtils_1.checkQuarkdownInstallation)();
    // Register the improved preview provider
    const previewProvider = new accuratePreviewProvider_1.ImprovedQuarkdownPreviewProvider(context.extensionUri);
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
    // Register commands
    // Preview command
    context.subscriptions.push(vscode.commands.registerCommand('quarkdown.preview', () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.languageId === 'quarkdown') {
            previewProvider.openPreview(activeEditor.document);
        }
        else {
            vscode.window.showErrorMessage('Please open a Quarkdown (.qmd) file first.');
        }
    }));
    // Export commands
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
    // Project creation command
    context.subscriptions.push(vscode.commands.registerCommand('quarkdown.createProject', async () => {
        try {
            // projectUtilsを動的にimportして適切に引数を渡す
            const projectUtils = await Promise.resolve().then(() => require('./projectUtils'));
            const projectName = await vscode.window.showInputBox({
                prompt: 'Enter project name',
                placeHolder: 'my-quarkdown-project',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Project name cannot be empty';
                    }
                    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                        return 'Project name can only contain letters, numbers, hyphens, and underscores';
                    }
                    return undefined;
                }
            });
            if (!projectName) {
                return;
            }
            // ProjectTemplate型に合わせた選択肢を提供
            const projectTypeOptions = [
                { label: 'Article', value: 'article' },
                { label: 'Book', value: 'book' },
                { label: 'Presentation', value: 'presentation' },
                { label: 'Basic', value: 'basic' }
            ];
            const selectedType = await vscode.window.showQuickPick(projectTypeOptions, {
                placeHolder: 'Select project type',
                ignoreFocusOut: true
            });
            if (!selectedType) {
                return;
            }
            // createProject関数を呼び出し（動的importで型エラーを回避）
            await projectUtils.createProject(projectName, selectedType.value);
            vscode.window.showInformationMessage(`Project "${projectName}" created successfully!`);
        }
        catch (error) {
            console.error('Error creating project:', error);
            vscode.window.showErrorMessage(`Failed to create project: ${error.message}`);
        }
    }));
    // Utility commands for adding content
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
            prompt: 'Enter parameters (space-separated, optional)',
            placeHolder: 'param1 param2'
        });
        const functionText = `.function {${functionName}}${parameters ? ` ${parameters}:` : ':'}
    # Function body here
    
`;
        editor.edit((editBuilder) => {
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
        editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, variableText);
        });
    }));
    // 診断コマンド
    context.subscriptions.push(vscode.commands.registerCommand('quarkdown.checkInstallation', async () => {
        await (0, exportUtils_1.checkQuarkdownInstallation)();
    }));
    // Auto-refresh preview when document changes
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId === 'quarkdown') {
            // デバウンス処理（1秒後に更新）
            if (global.quarkdownUpdateTimeout) {
                clearTimeout(global.quarkdownUpdateTimeout);
            }
            global.quarkdownUpdateTimeout = setTimeout(() => {
                previewProvider.updatePreview(event.document);
            }, 1000);
        }
    }));
    // Auto-save before export
    context.subscriptions.push(vscode.workspace.onWillSaveTextDocument((event) => {
        if (event.document.languageId === 'quarkdown') {
            // 保存前にドキュメントが変更されている場合、プレビューを更新
            const timeout = new Promise((resolve) => {
                setTimeout(() => {
                    previewProvider.updatePreview(event.document);
                    resolve();
                }, 100);
            });
            event.waitUntil(timeout);
        }
    }));
    // Show welcome message for first-time users
    const config = vscode.workspace.getConfiguration('quarkdown');
    if (!config.get('hasShownWelcome')) {
        vscode.window.showInformationMessage('Welcome to Quarkdown! 🎉 Create your first project or open a .qmd file to get started.', 'Create Project', 'Open Sample', 'Check Installation').then(async (choice) => {
            if (choice === 'Create Project') {
                await vscode.commands.executeCommand('quarkdown.createProject');
            }
            else if (choice === 'Open Sample') {
                // Open the example file
                const examplePath = vscode.Uri.joinPath(context.extensionUri, 'example.qmd');
                try {
                    const doc = await vscode.workspace.openTextDocument(examplePath);
                    await vscode.window.showTextDocument(doc);
                }
                catch (error) {
                    vscode.window.showWarningMessage('Example file not found. Try creating a new project instead.');
                }
            }
            else if (choice === 'Check Installation') {
                await vscode.commands.executeCommand('quarkdown.checkInstallation');
            }
        });
        config.update('hasShownWelcome', true, true);
    }
    // Status bar item for Quarkdown
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(rocket) Quarkdown";
    statusBarItem.tooltip = "Quarkdown is active";
    statusBarItem.command = 'quarkdown.preview';
    // ステータスバーアイテムを.qmdファイルを開いているときのみ表示
    const updateStatusBar = () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.languageId === 'quarkdown') {
            statusBarItem.show();
        }
        else {
            statusBarItem.hide();
        }
    };
    context.subscriptions.push(statusBarItem);
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBar));
    updateStatusBar(); // 初回実行
}
exports.activate = activate;
function deactivate() {
    console.log('👋 Quarkdown extension is now deactivated.');
    // クリーンアップ
    if (global.quarkdownUpdateTimeout) {
        clearTimeout(global.quarkdownUpdateTimeout);
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map