"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImprovedQuarkdownPreviewProvider = void 0;
const vscode = require("vscode");
const path = require("path");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = require("fs");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ImprovedQuarkdownPreviewProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
        this._panels = new Map();
        this._serverProcess = null;
        this._serverPort = 8089;
        this._currentSettings = {
            theme: 'darko',
            layout: 'minimal',
            enableMath: true
        };
    }
    async deserializeWebviewPanel(webviewPanel, state) {
        webviewPanel.webview.options = this.getWebviewOptions();
        webviewPanel.webview.html = this.getLoadingHtml();
    }
    async openPreview(document) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        const panel = vscode.window.createWebviewPanel('quarkdownPreview', `Preview: ${path.basename(document.fileName)}`, column ? column + 1 : vscode.ViewColumn.Two, this.getWebviewOptions());
        this._panels.set(document.uri.toString(), panel);
        panel.onDidDispose(() => {
            this._panels.delete(document.uri.toString());
            this.stopServerIfNeeded();
        });
        // メッセージハンドリング
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'openExternal':
                    await vscode.env.openExternal(vscode.Uri.parse(message.url));
                    break;
                case 'exportPdf':
                    const { exportToPdf } = await Promise.resolve().then(() => require('./exportUtils'));
                    await exportToPdf(document);
                    break;
                case 'exportSlides':
                    const { exportToSlides } = await Promise.resolve().then(() => require('./exportUtils'));
                    await exportToSlides(document);
                    break;
                case 'changeTheme':
                    this._currentSettings.theme = message.theme;
                    this.saveSettings();
                    this.updatePreview(document);
                    break;
                case 'changeLayout':
                    this._currentSettings.layout = message.layout;
                    this.saveSettings();
                    this.updatePreview(document);
                    break;
            }
        });
        await this.updatePreview(document);
    }
    async updatePreview(document) {
        const panel = this._panels.get(document.uri.toString());
        if (!panel) {
            return;
        }
        try {
            panel.webview.html = this.getLoadingHtml();
            // Quarkdownを使用してHTMLを生成
            const htmlContent = await this.renderWithQuarkdown(document);
            panel.webview.html = htmlContent;
        }
        catch (error) {
            panel.webview.html = this.getErrorHtml(error);
        }
    }
    getWebviewOptions() {
        return {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
    }
    async renderWithQuarkdown(document) {
        const inputPath = document.uri.fsPath;
        const outputDir = path.join(path.dirname(inputPath), 'output');
        const baseName = path.basename(inputPath, '.qmd');
        const outputFile = path.join(outputDir, `${baseName}.html`);
        try {
            // 一時的にHTMLを生成
            const command = `quarkdown c "${inputPath}" -o "${outputDir}"`;
            console.log(`Executing: ${command}`);
            const { stdout, stderr } = await execAsync(command, {
                timeout: 30000 // 30秒のタイムアウト
            });
            if (stderr && !stderr.includes('INFO')) {
                console.warn('Quarkdown stderr:', stderr);
            }
            // 生成されたHTMLファイルを読み込み
            if (fs.existsSync(outputFile)) {
                let htmlContent = fs.readFileSync(outputFile, 'utf8');
                // WebView用にHTMLを調整
                htmlContent = this.adjustHtmlForWebview(htmlContent);
                return htmlContent;
            }
            else {
                throw new Error('Generated HTML file not found');
            }
        }
        catch (error) {
            const errorMessage = error.message;
            if (errorMessage.includes('command not found') || errorMessage.includes('not recognized')) {
                throw new Error('Quarkdown CLI not found. Please install it from https://github.com/iamgio/quarkdown/releases');
            }
            else if (errorMessage.includes('Java')) {
                throw new Error('Java 17+ is required for Quarkdown');
            }
            else {
                throw new Error(`Quarkdown compilation failed: ${errorMessage}`);
            }
        }
    }
    adjustHtmlForWebview(html) {
        // WebView用の調整とツールバーの追加
        const toolbarHtml = `
            <div id="quarkdown-toolbar" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: var(--vscode-editor-background, #1e1e1e);
                border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
                padding: 8px 16px;
                display: flex;
                align-items: center;
                gap: 12px;
                z-index: 1000;
                font-family: var(--vscode-font-family);
                font-size: 13px;
            ">
                <select id="theme-selector" style="
                    background: var(--vscode-dropdown-background);
                    color: var(--vscode-dropdown-foreground);
                    border: 1px solid var(--vscode-dropdown-border);
                    padding: 4px 8px;
                    border-radius: 2px;
                ">
                    <option value="">Default</option>
                    <option value="darko" ${this._currentSettings.theme === 'darko' ? 'selected' : ''}>Darko</option>
                    <option value="academic" ${this._currentSettings.theme === 'academic' ? 'selected' : ''}>Academic</option>
                </select>
                
                <select id="layout-selector" style="
                    background: var(--vscode-dropdown-background);
                    color: var(--vscode-dropdown-foreground);
                    border: 1px solid var(--vscode-dropdown-border);
                    padding: 4px 8px;
                    border-radius: 2px;
                ">
                    <option value="minimal" ${this._currentSettings.layout === 'minimal' ? 'selected' : ''}>Minimal</option>
                    <option value="standard" ${this._currentSettings.layout === 'standard' ? 'selected' : ''}>Standard</option>
                    <option value="wide" ${this._currentSettings.layout === 'wide' ? 'selected' : ''}>Wide</option>
                    <option value="narrow" ${this._currentSettings.layout === 'narrow' ? 'selected' : ''}>Narrow</option>
                </select>
                
                <button id="export-pdf" style="
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    border-radius: 2px;
                    cursor: pointer;
                ">📄 PDF</button>
                
                <button id="export-slides" style="
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    border-radius: 2px;
                    cursor: pointer;
                ">🎞️ Slides</button>
                
                <div style="flex: 1;"></div>
                <span style="color: var(--vscode-descriptionForeground);">Quarkdown Preview</span>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                document.getElementById('theme-selector').addEventListener('change', (e) => {
                    vscode.postMessage({
                        command: 'changeTheme',
                        theme: e.target.value
                    });
                });
                
                document.getElementById('layout-selector').addEventListener('change', (e) => {
                    vscode.postMessage({
                        command: 'changeLayout',
                        layout: e.target.value
                    });
                });
                
                document.getElementById('export-pdf').addEventListener('click', () => {
                    vscode.postMessage({ command: 'exportPdf' });
                });
                
                document.getElementById('export-slides').addEventListener('click', () => {
                    vscode.postMessage({ command: 'exportSlides' });
                });
                
                // 外部リンクの処理
                document.addEventListener('click', (e) => {
                    if (e.target.tagName === 'A' && e.target.href) {
                        if (e.target.href.startsWith('http')) {
                            e.preventDefault();
                            vscode.postMessage({
                                command: 'openExternal',
                                url: e.target.href
                            });
                        }
                    }
                });
            </script>
        `;
        // HTMLの<body>の直後にツールバーを挿入
        const bodyIndex = html.indexOf('<body');
        if (bodyIndex !== -1) {
            const bodyEndIndex = html.indexOf('>', bodyIndex) + 1;
            html = html.slice(0, bodyEndIndex) + toolbarHtml +
                '<div style="margin-top: 60px;">' +
                html.slice(bodyEndIndex) + '</div>';
        }
        // CSSの調整
        const styleTag = `
            <style>
                body {
                    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
                    color: var(--vscode-editor-foreground, #d4d4d4);
                    background: var(--vscode-editor-background, #1e1e1e);
                    line-height: 1.6;
                    margin: 0;
                    padding: 20px;
                }
                
                code {
                    background: var(--vscode-textCodeBlock-background, #1e1e1e);
                    color: var(--vscode-textPreformat-foreground, #d4d4d4);
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: var(--vscode-editor-font-family, 'SF Mono', Monaco, 'Cascadia Code', monospace);
                }
                
                pre {
                    background: var(--vscode-textCodeBlock-background, #1e1e1e);
                    border: 1px solid var(--vscode-panel-border, #3c3c3c);
                    border-radius: 4px;
                    padding: 16px;
                    overflow-x: auto;
                }
                
                blockquote {
                    border-left: 4px solid var(--vscode-textBlockQuote-border, #7f848e);
                    margin: 16px 0;
                    padding-left: 16px;
                    color: var(--vscode-textBlockQuote-foreground, #cccccc);
                }
                
                a {
                    color: var(--vscode-textLink-foreground, #3794ff);
                    text-decoration: none;
                }
                
                a:hover {
                    text-decoration: underline;
                }
                
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 16px 0;
                }
                
                th, td {
                    border: 1px solid var(--vscode-panel-border, #3c3c3c);
                    padding: 8px 12px;
                    text-align: left;
                }
                
                th {
                    background: var(--vscode-list-hoverBackground, #2a2d2e);
                    font-weight: 600;
                }
            </style>
        `;
        // <head>内にスタイルを追加
        const headEndIndex = html.indexOf('</head>');
        if (headEndIndex !== -1) {
            html = html.slice(0, headEndIndex) + styleTag + html.slice(headEndIndex);
        }
        return html;
    }
    getLoadingHtml() {
        return `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Quarkdown Preview</title>
            <style>
                body {
                    font-family: var(--vscode-font-family, sans-serif);
                    background: var(--vscode-editor-background, #1e1e1e);
                    color: var(--vscode-editor-foreground, #d4d4d4);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .loading {
                    text-align: center;
                }
                .spinner {
                    animation: spin 1s linear infinite;
                    font-size: 2em;
                    margin-bottom: 16px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        </head>
        <body>
            <div class="loading">
                <div class="spinner">🪐</div>
                <div>Compiling Quarkdown...</div>
            </div>
        </body>
        </html>`;
    }
    getErrorHtml(error) {
        return `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Quarkdown Error</title>
            <style>
                body {
                    font-family: var(--vscode-font-family, sans-serif);
                    background: var(--vscode-editor-background, #1e1e1e);
                    color: var(--vscode-editor-foreground, #d4d4d4);
                    padding: 20px;
                    line-height: 1.6;
                }
                .error-container {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
                    border-radius: 4px;
                    background: var(--vscode-inputValidation-errorBackground, rgba(190, 17, 0, 0.1));
                }
                .error-title {
                    color: var(--vscode-inputValidation-errorForeground, #f85149);
                    margin-top: 0;
                }
                .error-message {
                    background: var(--vscode-textCodeBlock-background, #262626);
                    padding: 12px;
                    border-radius: 4px;
                    font-family: monospace;
                    margin: 16px 0;
                }
                .help-section {
                    margin-top: 20px;
                }
                .help-list {
                    padding-left: 20px;
                }
                .help-link {
                    color: var(--vscode-textLink-foreground, #3794ff);
                    text-decoration: none;
                }
                .help-link:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <div class="error-container">
                <h2 class="error-title">⚠️ Quarkdown Rendering Error</h2>
                <div class="error-message">${error.message}</div>
                
                <div class="help-section">
                    <h3>🔧 Troubleshooting Steps:</h3>
                    <ul class="help-list">
                        <li>Install Quarkdown CLI from <a href="https://github.com/iamgio/quarkdown/releases" class="help-link">GitHub Releases</a></li>
                        <li>Ensure Java 17+ is installed and in your PATH</li>
                        <li>Verify Quarkdown is accessible: <code>quarkdown --help</code></li>
                        <li>Check your Quarkdown syntax for errors</li>
                        <li>Try reloading the VS Code window</li>
                    </ul>
                </div>
                
                <div class="help-section">
                    <h3>📚 Resources:</h3>
                    <ul class="help-list">
                        <li><a href="https://github.com/iamgio/quarkdown/wiki" class="help-link">Quarkdown Wiki</a></li>
                        <li><a href="https://github.com/iamgio/quarkdown" class="help-link">Official Repository</a></li>
                    </ul>
                </div>
            </div>
        </body>
        </html>`;
    }
    saveSettings() {
        vscode.workspace.getConfiguration('quarkdown').update('previewSettings', this._currentSettings, true);
    }
    stopServerIfNeeded() {
        if (this._panels.size === 0 && this._serverProcess) {
            this._serverProcess.kill();
            this._serverProcess = null;
        }
    }
}
exports.ImprovedQuarkdownPreviewProvider = ImprovedQuarkdownPreviewProvider;
//# sourceMappingURL=accuratePreviewProvider.js.map