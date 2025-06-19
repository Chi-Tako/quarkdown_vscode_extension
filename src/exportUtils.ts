import * as vscode from 'vscode';
import * as path from 'path';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as l10n from '@vscode/l10n';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export async function exportToPdf(document: vscode.TextDocument): Promise<void> {
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
                const quarkdownPath = vscode.workspace.getConfiguration('quarkdown').get<string>('cliPath') || 'quarkdown';
                const outputPath = path.join(outputDir, 'output');
                console.log(`Executing: ${quarkdownPath} c "${inputPath}" --pdf -o "${outputPath}"`);
                
                const { stdout, stderr } = await execFileAsync(quarkdownPath, ['c', inputPath, '--pdf', '-o', outputPath]);
                
                if (stderr && !stderr.includes('INFO')) {
                    console.warn('Quarkdown stderr:', stderr);
                }
                
                progress.report({ increment: 100, message: l10n.t('export.pdf.completed') });
                
                // PDF が実際に生成されたかチェック
                if (fs.existsSync(outputPath)) {
                    const openPdf = await vscode.window.showInformationMessage(
                        l10n.t('export.pdf.success', path.basename(outputPath)),
                        l10n.t('buttons.openPdf'), l10n.t('buttons.showInFolder')
                    );
                    
                    if (openPdf === l10n.t('buttons.openPdf')) {
                        await vscode.env.openExternal(vscode.Uri.file(outputPath));
                    } else if (openPdf === l10n.t('buttons.showInFolder')) {
                        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
                    }
                } else {
                    throw new Error(l10n.t('export.pdf.notGenerated'));
                }
            } catch (error) {
                const errorMessage = (error as Error).message;
                console.error('PDF export error:', errorMessage);
                
                if (errorMessage.includes('command not found') || errorMessage.includes('not recognized')) {
                    throw new Error(l10n.t('export.pdf.cliNotFound'));
                } else if (errorMessage.includes('Java')) {
                    throw new Error(l10n.t('export.pdf.javaRequired'));
                } else {
                    throw new Error(l10n.t('export.pdf.failed', errorMessage));
                }
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(l10n.t('export.pdf.error', (error as Error).message));
    }
}

export async function exportToSlides(document: vscode.TextDocument): Promise<void> {
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
                    const addDoctype = await vscode.window.showWarningMessage(
                        l10n.t('export.slides.doctypePrompt'),
                        l10n.t('buttons.yes'), l10n.t('buttons.no')
                    );
                    if (addDoctype === l10n.t('buttons.yes')) {
                        const edit = new vscode.WorkspaceEdit();
                        edit.insert(document.uri, new vscode.Position(0, 0), '.doctype {slides}\n\n');
                        await vscode.workspace.applyEdit(edit);
                        await document.save();
                    }
                }
                
                const quarkdownPath = vscode.workspace.getConfiguration('quarkdown').get<string>('cliPath') || 'quarkdown';
                const outputPath = path.join(outputDir, 'output');
                console.log(`Executing: ${quarkdownPath} c "${inputPath}" -o "${outputPath}"`);
                
                const { stdout, stderr } = await execFileAsync(quarkdownPath, ['c', inputPath, '-o', outputPath]);
                
                if (stderr && !stderr.includes('INFO')) {
                    console.warn('Quarkdown stderr:', stderr);
                }
                
                progress.report({ increment: 100, message: l10n.t('export.slides.completed') });
                
                if (fs.existsSync(outputPath)) {
                    const openSlides = await vscode.window.showInformationMessage(
                        l10n.t('export.slides.success', path.basename(outputPath)),
                        l10n.t('buttons.openInBrowser'), l10n.t('buttons.showInFolder')
                    );
                    
                    if (openSlides === l10n.t('buttons.openInBrowser')) {
                        await vscode.env.openExternal(vscode.Uri.file(outputPath));
                    } else if (openSlides === l10n.t('buttons.showInFolder')) {
                        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
                    }
                } else {
                    throw new Error(l10n.t('export.slides.notGenerated'));
                }
            } catch (error) {
                throw new Error(l10n.t('export.slides.failed', (error as Error).message));
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(l10n.t('export.slides.error', (error as Error).message));
    }
}

export async function isQuarkdownAvailable(): Promise<boolean> {
    try {
        const quarkdownPath = vscode.workspace.getConfiguration('quarkdown').get<string>('cliPath') || 'quarkdown';
        const { stdout } = await execFileAsync(quarkdownPath, ['--help']);
        return stdout.includes('Quarkdown');
    } catch {
        return false;
    }
}

export async function checkQuarkdownInstallation(): Promise<void> {
    const isAvailable = await isQuarkdownAvailable();
    
    if (!isAvailable) {
        const install = await vscode.window.showErrorMessage(
            l10n.t('cli.notInstalled'),
            l10n.t('buttons.downloadQuarkdown'), l10n.t('buttons.learnMore')
        );
        
        if (install === l10n.t('buttons.downloadQuarkdown')) {
            await vscode.env.openExternal(vscode.Uri.parse('https://github.com/iamgio/quarkdown/releases/latest'));
        } else if (install === l10n.t('buttons.learnMore')) {
            await vscode.env.openExternal(vscode.Uri.parse('https://github.com/iamgio/quarkdown/wiki'));
        }
    } else {
        try {
            const quarkdownPath = vscode.workspace.getConfiguration('quarkdown').get<string>('cliPath') || 'quarkdown';
            const { stdout } = await execFileAsync(quarkdownPath, ['--help']);
            vscode.window.showInformationMessage(l10n.t('cli.installed'));
        } catch (error) {
            vscode.window.showWarningMessage(l10n.t('cli.hasIssues', (error as Error).message));
        }
    }
}