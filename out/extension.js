"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const l10n = __importStar(require("@vscode/l10n"));
const accuratePreviewProvider_1 = require("./accuratePreviewProvider");
const completionProvider_1 = require("./completionProvider");
const definitionProvider_1 = require("./definitionProvider");
const documentSymbolProvider_1 = require("./documentSymbolProvider");
const projectUtils_1 = require("./projectUtils");
const exportUtils_1 = require("./exportUtils");
let previewProvider;
function activate(context) {
    console.log('🚀 Quarkdown extension is now active!');
    try {
        // Register the accurate preview provider
        previewProvider = new accuratePreviewProvider_1.AccurateQuarkdownPreviewProvider(context.extensionUri);
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
                previewProvider?.openPreview(activeEditor.document);
            }
            else {
                vscode.window.showErrorMessage(l10n.t('errors.openQuarkdownFile'));
            }
        }));
        context.subscriptions.push(vscode.commands.registerCommand('quarkdown.exportPdf', async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.languageId === 'quarkdown') {
                await (0, exportUtils_1.exportToPdf)(activeEditor.document);
            }
            else {
                vscode.window.showErrorMessage(l10n.t('errors.openQuarkdownFile'));
            }
        }));
        context.subscriptions.push(vscode.commands.registerCommand('quarkdown.exportSlides', async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.languageId === 'quarkdown') {
                await (0, exportUtils_1.exportToSlides)(activeEditor.document);
            }
            else {
                vscode.window.showErrorMessage(l10n.t('errors.openQuarkdownFile'));
            }
        }));
        // Register project commands
        context.subscriptions.push(...(0, projectUtils_1.getProjectCommands)());
        // Register additional utility commands
        context.subscriptions.push(vscode.commands.registerCommand('quarkdown.insertFunction', async () => {
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
        }));
        context.subscriptions.push(vscode.commands.registerCommand('quarkdown.insertVariable', async () => {
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
        }));
        // 新しいコマンドを登録
        context.subscriptions.push(vscode.commands.registerCommand('quarkdown.openSettings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'quarkdown');
        }));
        context.subscriptions.push(vscode.commands.registerCommand('quarkdown.showWelcome', () => {
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
        }));
        // Auto-refresh preview when document changes
        context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'quarkdown') {
                previewProvider?.updatePreview(event.document);
            }
        }));
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
    }
    catch (error) {
        console.error('Failed to activate Quarkdown extension:', error);
        vscode.window.showErrorMessage(l10n.t('errors.activationFailed', String(error)));
    }
}
function deactivate() {
    console.log('👋 Quarkdown extension is now deactivated.');
    try {
        // Cleanup preview provider resources
        if (previewProvider) {
            previewProvider.dispose();
            previewProvider = undefined;
        }
    }
    catch (error) {
        console.error(l10n.t('errors.deactivationFailed', String(error)));
    }
}
//# sourceMappingURL=extension.js.map