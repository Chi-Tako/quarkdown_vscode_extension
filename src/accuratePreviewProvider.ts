import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(cp.exec);

interface QuarkdownSettings {
    theme: string;
    layout: string;
    doctype: string;
    enableMath: boolean;
    enableWatch: boolean;
}

interface WebviewMessage {
    command: string;
    settings?: Partial<QuarkdownSettings>;
    [key: string]: any;
}

export class AccurateQuarkdownPreviewProvider implements vscode.WebviewPanelSerializer {
    private _panels = new Map<string, vscode.WebviewPanel>();
    private _watchers = new Map<string, fs.FSWatcher>();
    private _currentSettings: QuarkdownSettings = {
        theme: 'darko',
        layout: 'minimal',
        enableMath: true,
        enableWatch: true,
        doctype: 'html'
    };

    constructor(private readonly _extensionUri: vscode.Uri) {
        this.loadSettings();
    }

    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any): Promise<void> {
        webviewPanel.webview.options = this.getWebviewOptions();
        webviewPanel.webview.html = this.getLoadingHtml();
    }

    private loadSettings() {
        const config = vscode.workspace.getConfiguration('quarkdown');
        this._currentSettings = {
            ...this._currentSettings,
            theme: config.get('previewTheme', 'darko'),
            layout: config.get('previewLayout', 'minimal'),
            enableMath: config.get('enableMath', true),
            enableWatch: config.get('enableAutoPreview', true)
        };
    }

    public openPreview(document: vscode.TextDocument) {
        const column = vscode.window.activeTextEditor 
            ? vscode.window.activeTextEditor.viewColumn 
            : undefined;

        const panel = vscode.window.createWebviewPanel(
            'quarkdownPreview',
            `📄 ${path.basename(document.fileName)}`,
            column ? column + 1 : vscode.ViewColumn.Two,
            this.getWebviewOptions()
        );

        this._panels.set(document.uri.toString(), panel);

        panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
            switch (message.command) {
                case 'settingsChanged':
                    this._currentSettings = {...this._currentSettings, ...message.settings};
                    this.saveSettings();
                    this.updatePreview(document);
                    break;
                case 'exportPdf':
                    this.exportToPdf(document);
                    break;
                case 'exportSlides':
                    this.exportToSlides(document);
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'quarkdown.cliPath');
                    break;
            }
        }, undefined);

        panel.onDidDispose(() => {
            this._panels.delete(document.uri.toString());
            this.stopWatching(document.uri.toString());
        });

        if (this._currentSettings.enableWatch) {
            this.setupFileWatcher(document);
        }

        this.updatePreview(document);
    }

    public async updatePreview(document: vscode.TextDocument) {
        const panel = this._panels.get(document.uri.toString());
        if (!panel) {
            return;
        }

        try {
            panel.webview.html = this.getLoadingHtml();
            
            const configuredPath = vscode.workspace.getConfiguration('quarkdown').get<string>('cliPath') || 'quarkdown';
            const quarkdownPath = await this.findQuarkdownExecutable(configuredPath);
            
            if (!quarkdownPath) {
                throw new Error(`Quarkdown CLI not found at path: "${configuredPath}". Please check your VS Code settings.`);
            }

            const filePath = document.uri.fsPath;
            const fileName = path.basename(filePath);
            const fileDir = path.dirname(filePath);
            
            try {
                console.log(`🚀 Compiling Quarkdown: "${fileName}"`);
                
                // Quarkdownコンパイル（標準出力にHTMLが出力される）
                const { stdout, stderr } = await execAsync(
                    `"${quarkdownPath}" c "${fileName}"`,
                    { 
                        cwd: fileDir, 
                        timeout: 30000,
                        env: { 
                            ...process.env,
                            JAVA_HOME: process.env.JAVA_HOME || ''
                        }
                    }
                );

                if (stderr) {
                    console.warn('Quarkdown stderr:', stderr);
                }

                if (!stdout || stdout.trim().length === 0) {
                    throw new Error('Quarkdown produced no output');
                }

                console.log(`✅ Quarkdown compilation successful (${stdout.length} characters)`);
                
                // HTMLコンテンツを拡張機能用に処理
                const enhancedHtml = this.enhanceQuarkdownHtml(stdout);
                panel.webview.html = enhancedHtml;

            } catch (error: any) {
                console.error('Quarkdown compilation failed:', error);
                throw new Error(`Quarkdown compilation failed: ${error.message}`);
            }

        } catch (error) {
            console.error('Preview update failed:', error);
            panel.webview.html = this.getErrorHtml(error as Error);
        }
    }

    private async findQuarkdownExecutable(basePath: string): Promise<string | null> {
        console.log(`🔍 Searching for Quarkdown executable: "${basePath}"`);
        
        const extensions = ['', '.bat', '.cmd', '.exe'];
        
        for (const ext of extensions) {
            const testPath = basePath + ext;
            
            if (path.isAbsolute(testPath)) {
                const exists = fs.existsSync(testPath);
                console.log(`📁 File exists "${testPath}": ${exists}`);
                if (!exists) continue;
            }
            
            try {
                console.log(`🧪 Testing: "${testPath}"`);
                
                const execOptions: cp.ExecOptions = {
                    timeout: 10000,
                    env: { 
                        ...process.env,
                        JAVA_HOME: process.env.JAVA_HOME || ''
                    },
                    windowsHide: true
                };
                
                // --help コマンドで存在確認
                const result = await execAsync(`"${testPath}" --help`, execOptions);
                
                console.log(`✅ Found working Quarkdown: ${testPath}`);
                return testPath;
                
            } catch (error: any) {
                console.log(`❌ Failed: "${testPath}" - ${error.message}`);
                continue;
            }
        }
        
        console.log(`❌ Quarkdown executable not found`);
        return null;
    }

    private setupFileWatcher(document: vscode.TextDocument) {
        const key = document.uri.toString();
        this.stopWatching(key);
        
        try {
            const watcher = fs.watch(document.uri.fsPath, (eventType: fs.WatchEventType) => {
                if (eventType === 'change') {
                    this.updatePreview(document);
                }
            });
            this._watchers.set(key, watcher);
        } catch (error) {
            console.error('Failed to setup file watcher:', error);
        }
    }

    private stopWatching(key: string) {
        const watcher = this._watchers.get(key);
        if (watcher) {
            watcher.close();
            this._watchers.delete(key);
        }
    }

    private getWebviewOptions(): vscode.WebviewOptions {
        return {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
    }

    private enhanceQuarkdownHtml(htmlContent: string): string {
        const themeClass = this._currentSettings.theme ? `qmd-theme-${this._currentSettings.theme}` : '';
        const layoutClass = `qmd-layout-${this._currentSettings.layout}`;

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Quarkdown Preview</title>
            <style>
                ${this.getQuarkdownCSS()}
            </style>
            ${this._currentSettings.enableMath ? this.getMathJaxScript() : ''}
        </head>
        <body class="${themeClass} ${layoutClass}">
            <div class="qmd-preview-controls">
                <select onchange="changeTheme(this.value)">
                    <option value="darko" ${this._currentSettings.theme === 'darko' ? 'selected' : ''}>Dark Theme</option>
                    <option value="" ${this._currentSettings.theme === '' ? 'selected' : ''}>Default Theme</option>
                    <option value="academic" ${this._currentSettings.theme === 'academic' ? 'selected' : ''}>Academic Theme</option>
                </select>
                <select onchange="changeLayout(this.value)">
                    <option value="minimal" ${this._currentSettings.layout === 'minimal' ? 'selected' : ''}>Minimal</option>
                    <option value="standard" ${this._currentSettings.layout === 'standard' ? 'selected' : ''}>Standard</option>
                    <option value="wide" ${this._currentSettings.layout === 'wide' ? 'selected' : ''}>Wide</option>
                    <option value="narrow" ${this._currentSettings.layout === 'narrow' ? 'selected' : ''}>Narrow</option>
                </select>
                <button onclick="exportPdf()">📄 Export PDF</button>
                <button onclick="exportSlides()">🎞️ Export Slides</button>
            </div>
            <div class="qmd-content">
                ${htmlContent}
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function changeTheme(theme) {
                    document.body.className = document.body.className.replace(/qmd-theme-\\w+/g, '');
                    if (theme) {
                        document.body.classList.add('qmd-theme-' + theme);
                    }
                    vscode.postMessage({
                        command: 'settingsChanged',
                        settings: { theme: theme }
                    });
                }
                
                function changeLayout(layout) {
                    document.body.className = document.body.className.replace(/qmd-layout-\\w+/g, '');
                    document.body.classList.add('qmd-layout-' + layout);
                    vscode.postMessage({
                        command: 'settingsChanged',
                        settings: { layout: layout }
                    });
                }
                
                function exportPdf() {
                    vscode.postMessage({ command: 'exportPdf' });
                }
                
                function exportSlides() {
                    vscode.postMessage({ command: 'exportSlides' });
                }
            </script>
        </body>
        </html>`;
    }

    private getQuarkdownCSS(): string {
        return `
            :root {
                --qmd-primary: #2563eb;
                --qmd-bg: #ffffff;
                --qmd-text: #1f2937;
                --qmd-border: #e5e7eb;
                --qmd-code-bg: #f3f4f6;
            }

            .qmd-theme-darko {
                --qmd-bg: #0f172a;
                --qmd-text: #e2e8f0;
                --qmd-border: #334155;
                --qmd-code-bg: #1e293b;
            }

            .qmd-layout-minimal { max-width: 800px; margin: 0 auto; padding: 2rem; }
            .qmd-layout-standard { max-width: 1000px; margin: 0 auto; padding: 2rem; }
            .qmd-layout-wide { max-width: 1200px; margin: 0 auto; padding: 2rem; }
            .qmd-layout-narrow { max-width: 600px; margin: 0 auto; padding: 2rem; }

            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                font-size: 16px;
                line-height: 1.7;
                background-color: var(--qmd-bg);
                color: var(--qmd-text);
                margin: 0;
                transition: all 0.3s ease;
            }

            .qmd-preview-controls {
                position: fixed;
                top: 10px;
                right: 10px;
                background: var(--qmd-bg);
                border: 1px solid var(--qmd-border);
                border-radius: 8px;
                padding: 10px;
                display: flex;
                gap: 10px;
                z-index: 1000;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .qmd-content {
                margin-top: 60px;
            }

            /* Enhanced styles for Quarkdown content */
            .qmd-content h1, .qmd-content h2, .qmd-content h3, .qmd-content h4, .qmd-content h5, .qmd-content h6 {
                margin-top: 2em;
                margin-bottom: 0.8em;
                font-weight: 600;
                line-height: 1.25;
            }

            .qmd-content h1 { 
                font-size: 2.25em; 
                border-bottom: 2px solid var(--qmd-border);
                padding-bottom: 0.5em;
            }

            .qmd-content code {
                background-color: var(--qmd-code-bg);
                padding: 0.2em 0.4em;
                border-radius: 0.375rem;
                font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
                font-size: 0.875em;
            }

            .qmd-content pre {
                background-color: var(--qmd-code-bg);
                border: 1px solid var(--qmd-border);
                border-radius: 0.5rem;
                padding: 1rem;
                overflow-x: auto;
                margin: 1.5rem 0;
            }

            .qmd-content pre code {
                background: none;
                padding: 0;
                border-radius: 0;
            }

            .qmd-content img {
                max-width: 100%;
                height: auto;
                border-radius: 0.5rem;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }

            .qmd-content figure {
                margin: 2rem 0;
                text-align: center;
            }

            .qmd-content blockquote {
                border-left: 4px solid var(--qmd-primary);
                margin: 1.5rem 0;
                padding-left: 1rem;
                font-style: italic;
                color: var(--qmd-text);
                opacity: 0.8;
            }

            .qmd-content ul, .qmd-content ol {
                padding-left: 1.5rem;
                margin: 1rem 0;
            }

            .qmd-content li {
                margin: 0.5rem 0;
            }

            .page-break {
                display: none;
            }
        `;
    }

    private getMathJaxScript(): string {
        return `
            <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
            <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
            <script>
                window.MathJax = {
                    tex: {
                        inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                        displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
                        processEscapes: true,
                        processEnvironments: true
                    },
                    options: {
                        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
                    }
                };
            </script>
        `;
    }

    private getLoadingHtml(): string {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Loading...</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .loading {
                    text-align: center;
                }
                .spinner {
                    border: 4px solid rgba(255,255,255,0.3);
                    border-top: 4px solid #ffffff;
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 1rem;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                h2 { margin: 0; font-weight: 300; }
                p { margin: 0.5rem 0 0; opacity: 0.8; }
            </style>
        </head>
        <body>
            <div class="loading">
                <div class="spinner"></div>
                <h2>🚀 Compiling Quarkdown...</h2>
                <p>Processing your document</p>
            </div>
        </body>
        </html>`;
    }

    private getErrorHtml(error: Error): string {
        const isWindows = process.platform === 'win32';
        
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Quarkdown Error</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                    max-width: 800px;
                    margin: 2rem auto;
                    padding: 2rem;
                    line-height: 1.6;
                    background-color: #ffffff;
                    color: #1f2937;
                }
                .error-container {
                    background: linear-gradient(135deg, #fee2e2, #fecaca);
                    border: 2px solid #f87171;
                    border-radius: 1rem;
                    padding: 2rem;
                    margin-bottom: 2rem;
                }
                .error-title {
                    color: #dc2626;
                    margin-top: 0;
                    font-size: 1.5rem;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .error-message {
                    background-color: rgba(239, 68, 68, 0.1);
                    color: #991b1b;
                    padding: 1rem;
                    border-radius: 0.5rem;
                    margin: 1rem 0;
                    font-family: monospace;
                    border-left: 4px solid #ef4444;
                    font-weight: 500;
                }
                .help-section {
                    background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
                    border-radius: 1rem;
                    padding: 1.5rem;
                    margin: 1.5rem 0;
                    border: 1px solid #0ea5e9;
                }
                .help-title {
                    color: #0c4a6e;
                    margin-bottom: 1rem;
                    margin-top: 0;
                    font-weight: 600;
                }
                .help-list {
                    margin: 0.5rem 0;
                    padding-left: 1.5rem;
                }
                .help-list li {
                    margin-bottom: 0.5rem;
                }
                .settings-button {
                    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    font-weight: 600;
                    margin: 0.5rem 0.5rem 0.5rem 0;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
                }
                .settings-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
                }
                .config-example {
                    background-color: #f1f5f9;
                    border: 1px solid #cbd5e1;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    font-family: monospace;
                    font-size: 0.875em;
                    margin: 0.75rem 0;
                    overflow-x: auto;
                }
            </style>
        </head>
        <body>
            <div class="error-container">
                <h2 class="error-title">⚠️ Quarkdown Error</h2>
                <div class="error-message">${error.message.replace(/\n/g, '<br>')}</div>
            </div>

            <div class="help-section">
                <h3 class="help-title">🔧 Quick Fix</h3>
                <p><strong>Step 1:</strong> Open VS Code Settings (<code>Ctrl+,</code>)</p>
                <p><strong>Step 2:</strong> Search for <code>quarkdown.cliPath</code></p>
                <p><strong>Step 3:</strong> Set the correct path:</p>
                <pre class="config-example">C:\\Users\\chiba\\Project\\quarkdown\\bin\\quarkdown.bat</pre>
                <button onclick="openSettings()" class="settings-button">🛠️ Open Settings</button>
            </div>

            <div class="help-section">
                <h3 class="help-title">✅ Verification</h3>
                <p>Test Quarkdown manually in PowerShell:</p>
                <pre class="config-example">& "C:\\Users\\chiba\\Project\\quarkdown\\bin\\quarkdown.bat" --help</pre>
                <p>If this works, the VS Code setting should also work.</p>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                function openSettings() {
                    vscode.postMessage({ command: 'openSettings' });
                }
            </script>
        </body>
        </html>`;
    }

    private saveSettings() {
        vscode.workspace.getConfiguration('quarkdown').update('previewSettings', this._currentSettings, true);
    }

    private async exportToPdf(document: vscode.TextDocument) {
        try {
            const { exportToPdf } = await import('./exportUtils');
            exportToPdf(document);
        } catch (error) {
            vscode.window.showErrorMessage('PDF export not available');
        }
    }

    private async exportToSlides(document: vscode.TextDocument) {
        try {
            const { exportToSlides } = await import('./exportUtils');
            exportToSlides(document);
        } catch (error) {
            vscode.window.showErrorMessage('Slides export not available');
        }
    }
}