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
exports.exportToPdf = exportToPdf;
exports.exportToSlides = exportToSlides;
exports.isQuarkdownAvailable = isQuarkdownAvailable;
exports.checkQuarkdownInstallation = checkQuarkdownInstallation;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const l10n = __importStar(require("@vscode/l10n"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
async function exportToPdf(document) {
    try {
        const inputPath = document.uri.fsPath;
        const outputDir = path.dirname(inputPath);
        const baseName = path.basename(inputPath, '.qmd');
        const outputPath = path.join(outputDir, 'output', `${baseName}.pdf`);
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: l10n.t('export.pdf.progress'),
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: l10n.t('export.pdf.starting') });
            try {
                // Secure command execution using execFile
                const quarkdownPath = vscode.workspace.getConfiguration('quarkdown').get('cliPath') || 'quarkdown';
                const outputPath = path.join(outputDir, 'output');
                console.log(`Executing: ${quarkdownPath} c "${inputPath}" --pdf -o "${outputPath}"`);
                const { stdout, stderr } = await execFileAsync(quarkdownPath, ['c', inputPath, '--pdf', '-o', outputPath]);
                if (stderr && !stderr.includes('INFO')) {
                    console.warn('Quarkdown stderr:', stderr);
                }
                progress.report({ increment: 100, message: l10n.t('export.pdf.completed') });
                // PDF が実際に生成されたかチェック
                if (fs.existsSync(outputPath)) {
                    const openPdf = await vscode.window.showInformationMessage(l10n.t('export.pdf.success', path.basename(outputPath)), l10n.t('buttons.openPdf'), l10n.t('buttons.showInFolder'));
                    if (openPdf === l10n.t('buttons.openPdf')) {
                        await vscode.env.openExternal(vscode.Uri.file(outputPath));
                    }
                    else if (openPdf === l10n.t('buttons.showInFolder')) {
                        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
                    }
                }
                else {
                    throw new Error(l10n.t('export.pdf.notGenerated'));
                }
            }
            catch (error) {
                const errorMessage = error.message;
                console.error('PDF export error:', errorMessage);
                if (errorMessage.includes('command not found') || errorMessage.includes('not recognized')) {
                    throw new Error(l10n.t('export.pdf.cliNotFound'));
                }
                else if (errorMessage.includes('Java')) {
                    throw new Error(l10n.t('export.pdf.javaRequired'));
                }
                else {
                    throw new Error(l10n.t('export.pdf.failed', errorMessage));
                }
            }
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(l10n.t('export.pdf.error', error.message));
    }
}
async function exportToSlides(document) {
    try {
        const inputPath = document.uri.fsPath;
        const outputDir = path.dirname(inputPath);
        const baseName = path.basename(inputPath, '.qmd');
        const outputPath = path.join(outputDir, 'output', `${baseName}.html`);
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: l10n.t('export.slides.progress'),
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: l10n.t('export.slides.starting') });
            try {
                // スライドの場合、doctypeがslidesになっていることを確認
                const content = document.getText();
                if (!content.includes('.doctype {slides}')) {
                    const addDoctype = await vscode.window.showWarningMessage(l10n.t('export.slides.doctypePrompt'), l10n.t('buttons.yes'), l10n.t('buttons.no'));
                    if (addDoctype === l10n.t('buttons.yes')) {
                        const edit = new vscode.WorkspaceEdit();
                        edit.insert(document.uri, new vscode.Position(0, 0), '.doctype {slides}\n\n');
                        await vscode.workspace.applyEdit(edit);
                        await document.save();
                    }
                }
                const quarkdownPath = vscode.workspace.getConfiguration('quarkdown').get('cliPath') || 'quarkdown';
                const outputPath = path.join(outputDir, 'output');
                console.log(`Executing: ${quarkdownPath} c "${inputPath}" -o "${outputPath}"`);
                const { stdout, stderr } = await execFileAsync(quarkdownPath, ['c', inputPath, '-o', outputPath]);
                if (stderr && !stderr.includes('INFO')) {
                    console.warn('Quarkdown stderr:', stderr);
                }
                progress.report({ increment: 100, message: l10n.t('export.slides.completed') });
                if (fs.existsSync(outputPath)) {
                    const openSlides = await vscode.window.showInformationMessage(l10n.t('export.slides.success', path.basename(outputPath)), l10n.t('buttons.openInBrowser'), l10n.t('buttons.showInFolder'));
                    if (openSlides === l10n.t('buttons.openInBrowser')) {
                        await vscode.env.openExternal(vscode.Uri.file(outputPath));
                    }
                    else if (openSlides === l10n.t('buttons.showInFolder')) {
                        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
                    }
                }
                else {
                    throw new Error(l10n.t('export.slides.notGenerated'));
                }
            }
            catch (error) {
                throw new Error(l10n.t('export.slides.failed', error.message));
            }
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(l10n.t('export.slides.error', error.message));
    }
}
async function isQuarkdownAvailable() {
    try {
        const quarkdownPath = vscode.workspace.getConfiguration('quarkdown').get('cliPath') || 'quarkdown';
        const { stdout } = await execFileAsync(quarkdownPath, ['--help']);
        return stdout.includes('Quarkdown');
    }
    catch {
        return false;
    }
}
async function checkQuarkdownInstallation() {
    const isAvailable = await isQuarkdownAvailable();
    if (!isAvailable) {
        const install = await vscode.window.showErrorMessage(l10n.t('cli.notInstalled'), l10n.t('buttons.downloadQuarkdown'), l10n.t('buttons.learnMore'));
        if (install === l10n.t('buttons.downloadQuarkdown')) {
            await vscode.env.openExternal(vscode.Uri.parse('https://github.com/iamgio/quarkdown/releases/latest'));
        }
        else if (install === l10n.t('buttons.learnMore')) {
            await vscode.env.openExternal(vscode.Uri.parse('https://github.com/iamgio/quarkdown/wiki'));
        }
    }
    else {
        try {
            const quarkdownPath = vscode.workspace.getConfiguration('quarkdown').get('cliPath') || 'quarkdown';
            const { stdout } = await execFileAsync(quarkdownPath, ['--help']);
            vscode.window.showInformationMessage(l10n.t('cli.installed'));
        }
        catch (error) {
            vscode.window.showWarningMessage(l10n.t('cli.hasIssues', error.message));
        }
    }
}
//# sourceMappingURL=exportUtils.js.map