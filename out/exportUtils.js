"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkQuarkdownInstallation = exports.isQuarkdownAvailable = exports.exportToSlides = exports.exportToPdf = void 0;
const vscode = require("vscode");
const path = require("path");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
async function exportToPdf(document) {
    try {
        const outputPath = document.uri.fsPath.replace('.qmd', '.pdf');
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Exporting to PDF...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Starting PDF export...' });
            try {
                await execAsync(`quarkdown --pdf "${document.uri.fsPath}" -o "${outputPath}"`);
                progress.report({ increment: 100, message: 'PDF export completed!' });
                const openPdf = await vscode.window.showInformationMessage(`PDF exported successfully to ${path.basename(outputPath)}`, 'Open PDF');
                if (openPdf === 'Open PDF') {
                    await vscode.env.openExternal(vscode.Uri.file(outputPath));
                }
            }
            catch (error) {
                throw new Error(`Failed to export PDF: ${error.message}`);
            }
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`PDF Export Error: ${error.message}`);
    }
}
exports.exportToPdf = exportToPdf;
async function exportToSlides(document) {
    try {
        const outputPath = document.uri.fsPath.replace('.qmd', '_slides.html');
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Exporting to Slides...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Starting slides export...' });
            try {
                await execAsync(`quarkdown --slides "${document.uri.fsPath}" -o "${outputPath}"`);
                progress.report({ increment: 100, message: 'Slides export completed!' });
                const openSlides = await vscode.window.showInformationMessage(`Slides exported successfully to ${path.basename(outputPath)}`, 'Open Slides');
                if (openSlides === 'Open Slides') {
                    await vscode.env.openExternal(vscode.Uri.file(outputPath));
                }
            }
            catch (error) {
                throw new Error(`Failed to export slides: ${error.message}`);
            }
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Slides Export Error: ${error.message}`);
    }
}
exports.exportToSlides = exportToSlides;
async function isQuarkdownAvailable() {
    try {
        await execAsync('quarkdown --version');
        return true;
    }
    catch {
        return false;
    }
}
exports.isQuarkdownAvailable = isQuarkdownAvailable;
async function checkQuarkdownInstallation() {
    const isAvailable = await isQuarkdownAvailable();
    if (!isAvailable) {
        const install = await vscode.window.showWarningMessage('Quarkdown CLI is not installed or not found in PATH. Some features may not work properly.', 'Install Guide', 'Dismiss');
        if (install === 'Install Guide') {
            await vscode.env.openExternal(vscode.Uri.parse('https://github.com/jjallaire/quarkdown#installation'));
        }
    }
}
exports.checkQuarkdownInstallation = checkQuarkdownInstallation;
//# sourceMappingURL=exportUtils.js.map