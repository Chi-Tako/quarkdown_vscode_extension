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
    // 新しいコマンドを登録
    context.subscriptions.push(vscode.commands.registerCommand('quarkdown.openSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'quarkdown');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('quarkdown.showWelcome', () => {
        const isWindows = process.platform === 'win32';
        const message = isWindows
            ? 'Welcome to Quarkdown! Windows users may need to configure the CLI path in settings. Would you like to open the settings now?'
            : 'Welcome to Quarkdown! The extension should work automatically if Quarkdown CLI is installed.';
        const action = isWindows ? 'Open Settings' : 'OK';
        vscode.window.showInformationMessage(message, action, 'Dismiss').then((selection) => {
            if (selection === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'quarkdown.cliPath');
            }
        });
    }));
    // Auto-refresh preview when document changes
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'quarkdown') {
            previewProvider.updatePreview(event.document);
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
function deactivate() {
    console.log('👋 Quarkdown extension is now deactivated.');
}
//# sourceMappingURL=extension.js.map