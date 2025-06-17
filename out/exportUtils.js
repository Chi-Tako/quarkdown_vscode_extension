"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkQuarkdownInstallation = exports.isQuarkdownAvailable = exports.exportToSlides = exports.exportToPdf = void 0;
const vscode = require("vscode");
const path = require("path");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = require("fs");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
async function exportToPdf(document) {
    try {
        const inputPath = document.uri.fsPath;
        const outputDir = path.dirname(inputPath);
        const baseName = path.basename(inputPath, '.qmd');
        const outputPath = path.join(outputDir, 'output', `${baseName}.pdf`);
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Exporting to PDF...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Starting PDF export...' });
            try {
                // 正しいQuarkdown CLIコマンド構文
                const command = `quarkdown c "${inputPath}" --pdf -o "${path.join(outputDir, 'output')}"`;
                console.log(`Executing: ${command}`);
                const { stdout, stderr } = await execAsync(command);
                if (stderr && !stderr.includes('INFO')) {
                    console.warn('Quarkdown stderr:', stderr);
                }
                progress.report({ increment: 100, message: 'PDF export completed!' });
                // PDF が実際に生成されたかチェック
                if (fs.existsSync(outputPath)) {
                    const openPdf = await vscode.window.showInformationMessage(`PDF exported successfully to ${path.basename(outputPath)}`, 'Open PDF', 'Show in Folder');
                    if (openPdf === 'Open PDF') {
                        await vscode.env.openExternal(vscode.Uri.file(outputPath));
                    }
                    else if (openPdf === 'Show in Folder') {
                        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
                    }
                }
                else {
                    throw new Error('PDF file was not generated. Check the output directory.');
                }
            }
            catch (error) {
                const errorMessage = error.message;
                console.error('PDF export error:', errorMessage);
                if (errorMessage.includes('command not found') || errorMessage.includes('not recognized')) {
                    throw new Error('Quarkdown CLI not found. Please install it from https://github.com/iamgio/quarkdown/releases');
                }
                else if (errorMessage.includes('Java')) {
                    throw new Error('Java 17+ is required. Please install Java and ensure it\'s in your PATH.');
                }
                else {
                    throw new Error(`PDF export failed: ${errorMessage}`);
                }
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
        const inputPath = document.uri.fsPath;
        const outputDir = path.dirname(inputPath);
        const baseName = path.basename(inputPath, '.qmd');
        const outputPath = path.join(outputDir, 'output', `${baseName}.html`);
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Exporting to Slides...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Starting slides export...' });
            try {
                // スライドの場合、doctypeがslidesになっていることを確認
                const content = document.getText();
                if (!content.includes('.doctype {slides}')) {
                    const addDoctype = await vscode.window.showWarningMessage('Document type is not set to slides. Add .doctype {slides} to your document?', 'Yes', 'No');
                    if (addDoctype === 'Yes') {
                        const edit = new vscode.WorkspaceEdit();
                        edit.insert(document.uri, new vscode.Position(0, 0), '.doctype {slides}\n\n');
                        await vscode.workspace.applyEdit(edit);
                        await document.save();
                    }
                }
                const command = `quarkdown c "${inputPath}" -o "${path.join(outputDir, 'output')}"`;
                console.log(`Executing: ${command}`);
                const { stdout, stderr } = await execAsync(command);
                if (stderr && !stderr.includes('INFO')) {
                    console.warn('Quarkdown stderr:', stderr);
                }
                progress.report({ increment: 100, message: 'Slides export completed!' });
                if (fs.existsSync(outputPath)) {
                    const openSlides = await vscode.window.showInformationMessage(`Slides exported successfully to ${path.basename(outputPath)}`, 'Open in Browser', 'Show in Folder');
                    if (openSlides === 'Open in Browser') {
                        await vscode.env.openExternal(vscode.Uri.file(outputPath));
                    }
                    else if (openSlides === 'Show in Folder') {
                        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
                    }
                }
                else {
                    throw new Error('Slides file was not generated. Check the output directory.');
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
        const { stdout } = await execAsync('quarkdown --help');
        return stdout.includes('Quarkdown');
    }
    catch {
        return false;
    }
}
exports.isQuarkdownAvailable = isQuarkdownAvailable;
async function checkQuarkdownInstallation() {
    const isAvailable = await isQuarkdownAvailable();
    if (!isAvailable) {
        const install = await vscode.window.showErrorMessage('Quarkdown CLI is not installed or not in PATH. Please install it to use export features.', 'Download Quarkdown', 'Learn More');
        if (install === 'Download Quarkdown') {
            await vscode.env.openExternal(vscode.Uri.parse('https://github.com/iamgio/quarkdown/releases/latest'));
        }
        else if (install === 'Learn More') {
            await vscode.env.openExternal(vscode.Uri.parse('https://github.com/iamgio/quarkdown/wiki'));
        }
    }
    else {
        try {
            const { stdout } = await execAsync('quarkdown --help');
            vscode.window.showInformationMessage(`Quarkdown CLI is properly installed!`);
        }
        catch (error) {
            vscode.window.showWarningMessage(`Quarkdown CLI found but may have issues: ${error.message}`);
        }
    }
}
exports.checkQuarkdownInstallation = checkQuarkdownInstallation;
//# sourceMappingURL=exportUtils.js.map