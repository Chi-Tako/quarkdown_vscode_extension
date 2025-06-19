import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import * as l10n from '@vscode/l10n';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

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

interface ExecResult {
    stdout: string;
    stderr: string;
}

export class AccurateQuarkdownPreviewProvider implements vscode.WebviewPanelSerializer {
    private readonly _panels = new Map<string, vscode.WebviewPanel>();
    private readonly _watchers = new Map<string, fs.FSWatcher>();
    private readonly _documentSettings = new Map<string, QuarkdownSettings>();
    private readonly _debounceTimers = new Map<string, NodeJS.Timeout>();
    private _defaultSettings: QuarkdownSettings = {
        theme: 'darko',
        layout: 'minimal',
        enableMath: true,
        enableWatch: true,
        doctype: 'html'
    };

    constructor(private readonly _extensionUri: vscode.Uri) {
        this.loadDefaultSettings();
    }

    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any): Promise<void> {
        webviewPanel.webview.options = this.getWebviewOptions();
        webviewPanel.webview.html = this.getLoadingHtml();
        
        // Restore settings if available
        if (state?.settings && state?.documentUri) {
            this.updateDocumentSettings(state.documentUri, state.settings);
        }
        
        // Restore preview content if document URI is available
        if (state?.documentUri) {
            try {
                const documentUri = vscode.Uri.parse(state.documentUri);
                const document = await vscode.workspace.openTextDocument(documentUri);
                
                // Register the panel
                this._panels.set(state.documentUri, webviewPanel);
                
                // Setup message handling
                this.setupMessageHandling(webviewPanel, document);
                
                // Setup cleanup on disposal
                webviewPanel.onDidDispose(() => {
                    this.cleanup(state.documentUri);
                });
                
                // Update preview content
                this.updatePreview(document);
                
                // Setup file watching if enabled
                const settings = this.getDocumentSettings(state.documentUri);
                if (settings.enableWatch) {
                    this.setupFileWatcher(document);
                }
            } catch (error) {
                console.error('Failed to restore preview content:', error);
                webviewPanel.webview.html = this.getErrorHtml(error as Error);
            }
        }
    }

    private loadDefaultSettings(): void {
        try {
            const config = vscode.workspace.getConfiguration('quarkdown');
            this._defaultSettings = {
                ...this._defaultSettings,
                theme: config.get('previewTheme', 'darko'),
                layout: config.get('previewLayout', 'minimal'),
                enableMath: config.get('enableMath', true),
                enableWatch: config.get('enableAutoPreview', true)
            };
        } catch (error) {
            console.error('Failed to load default settings:', error);
        }
    }

    private getDocumentSettings(documentUri: string): QuarkdownSettings {
        if (!this._documentSettings.has(documentUri)) {
            this._documentSettings.set(documentUri, { ...this._defaultSettings });
        }
        return this._documentSettings.get(documentUri)!;
    }

    private updateDocumentSettings(documentUri: string, settings: Partial<QuarkdownSettings>): void {
        const currentSettings = this.getDocumentSettings(documentUri);
        this._documentSettings.set(documentUri, { ...currentSettings, ...settings });
    }

    public openPreview(document: vscode.TextDocument): void {
        const column = vscode.window.activeTextEditor?.viewColumn;

        const panel = vscode.window.createWebviewPanel(
            'quarkdownPreview',
            `📄 ${path.basename(document.fileName)}`,
            column ? column + 1 : vscode.ViewColumn.Two,
            this.getWebviewOptions()
        );

        this._panels.set(document.uri.toString(), panel);

        // Setup message handling
        this.setupMessageHandling(panel, document);

        // Setup dispose handling
        panel.onDidDispose(() => {
            this.cleanup(document.uri.toString());
        });

        // Setup file watching
        const settings = this.getDocumentSettings(document.uri.toString());
        if (settings.enableWatch) {
            this.setupFileWatcher(document);
        }

        // Initial preview update
        this.updatePreview(document);
    }

    private setupMessageHandling(panel: vscode.WebviewPanel, document: vscode.TextDocument): void {
        panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
            this.handleWebviewMessage(message, document);
        }, undefined);
    }

    private async handleWebviewMessage(message: WebviewMessage, document: vscode.TextDocument): Promise<void> {
        try {
            switch (message.command) {
                case 'settingsChanged':
                    if (message.settings) {
                        this.updateDocumentSettings(document.uri.toString(), message.settings);
                        await this.saveDocumentSettings(document.uri.toString());
                        await this.updatePreview(document);
                    }
                    break;
                case 'exportPdf':
                    await this.exportToPdf(document);
                    break;
                case 'exportSlides':
                    await this.exportToSlides(document);
                    break;
                case 'openSettings':
                    await vscode.commands.executeCommand('workbench.action.openSettings', 'quarkdown.cliPath');
                    break;
                default:
                    console.warn(`Unknown message command: ${message.command}`);
            }
        } catch (error) {
            console.error('Error handling webview message:', error);
            vscode.window.showErrorMessage(`Failed to handle command: ${message.command}`);
        }
    }

    public async updatePreview(document: vscode.TextDocument): Promise<void> {
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

            const htmlContent = await this.compileQuarkdown(document, quarkdownPath);
            const enhancedHtml = this.enhanceQuarkdownHtml(htmlContent, document.uri.toString());
            panel.webview.html = enhancedHtml;

        } catch (error) {
            console.error('Preview update failed:', error);
            panel.webview.html = this.getErrorHtml(error as Error);
        }
    }

    private async compileQuarkdown(document: vscode.TextDocument, quarkdownPath: string): Promise<string> {
        const filePath = document.uri.fsPath;
        const fileName = path.basename(filePath);
        const fileDir = path.dirname(filePath);
        
        console.log(`🚀 Compiling Quarkdown: "${fileName}"`);
        
        try {
            const result: ExecResult = await execFileAsync(
                quarkdownPath,
                ['c', fileName],
                { 
                    cwd: fileDir, 
                    timeout: 30000,
                    env: { 
                        ...process.env,
                        JAVA_HOME: process.env.JAVA_HOME || ''
                    }
                }
            );

            if (result.stderr) {
                console.warn('Quarkdown stderr:', result.stderr);
            }

            if (!result.stdout || result.stdout.trim().length === 0) {
                throw new Error('Quarkdown produced no output');
            }

            console.log(`✅ Quarkdown compilation successful (${result.stdout.length} characters)`);
            return result.stdout;

        } catch (error: any) {
            console.error('Quarkdown compilation failed:', error);
            throw new Error(`Quarkdown compilation failed: ${error.message}`);
        }
    }

    private async findQuarkdownExecutable(basePath: string): Promise<string | null> {
        console.log(`🔍 Searching for Quarkdown executable: "${basePath}"`);
        
        const extensions = process.platform === 'win32' ? ['', '.bat', '.cmd', '.exe'] : [''];
        
        for (const ext of extensions) {
            const testPath = basePath + ext;
            
            if (path.isAbsolute(testPath) && !fs.existsSync(testPath)) {
                console.log(`📁 File not found: "${testPath}"`);
                continue;
            }
            
            if (await this.testExecutable(testPath)) {
                console.log(`✅ Found working Quarkdown: ${testPath}`);
                return testPath;
            }
        }
        
        console.log(`❌ Quarkdown executable not found`);
        return null;
    }

    private async testExecutable(executablePath: string): Promise<boolean> {
        try {
            console.log(`🧪 Testing: "${executablePath}"`);
            
            const execOptions = {
                timeout: 10000,
                env: { 
                    ...process.env,
                    JAVA_HOME: process.env.JAVA_HOME || ''
                },
                windowsHide: true
            };
            
            await execAsync(`"${executablePath}" --help`, execOptions);
            return true;
            
        } catch (error: any) {
            console.log(`❌ Failed: "${executablePath}" - ${error.message}`);
            return false;
        }
    }

    private setupFileWatcher(document: vscode.TextDocument): void {
        const key = document.uri.toString();
        this.stopWatching(key);
        
        try {
            const watcher = fs.watch(document.uri.fsPath, (eventType: 'change' | 'rename') => {
                if (eventType === 'change') {
                    // Clear existing debounce timer
                    const existingTimer = this._debounceTimers.get(key);
                    if (existingTimer) {
                        clearTimeout(existingTimer);
                    }
                    
                    // Set new debounce timer
                    const timer = setTimeout(() => {
                        this.updatePreview(document);
                        this._debounceTimers.delete(key);
                    }, 300);
                    
                    this._debounceTimers.set(key, timer);
                }
            });
            
            this._watchers.set(key, watcher);
        } catch (error) {
            console.error('Failed to setup file watcher:', error);
        }
    }

    private stopWatching(key: string): void {
        const watcher = this._watchers.get(key);
        if (watcher) {
            try {
                watcher.close();
            } catch (error) {
                console.error('Error closing file watcher:', error);
            }
            this._watchers.delete(key);
        }
        
        // Clear any pending debounce timer
        const timer = this._debounceTimers.get(key);
        if (timer) {
            clearTimeout(timer);
            this._debounceTimers.delete(key);
        }
    }

    private cleanup(documentKey: string): void {
        this._panels.delete(documentKey);
        this.stopWatching(documentKey);
    }

    public dispose(): void {
        // Cleanup all panels
        for (const [key, panel] of this._panels) {
            try {
                panel.dispose();
            } catch (error) {
                console.error(`Error disposing panel ${key}:`, error);
            }
        }
        this._panels.clear();

        // Cleanup all watchers
        for (const [key, watcher] of this._watchers) {
            try {
                watcher.close();
            } catch (error) {
                console.error(`Error closing watcher ${key}:`, error);
            }
        }
        this._watchers.clear();

        // Clear all debounce timers
        for (const [key, timer] of this._debounceTimers) {
            try {
                clearTimeout(timer);
            } catch (error) {
                console.error(`Error clearing timer ${key}:`, error);
            }
        }
        this._debounceTimers.clear();

        // Clear document settings
        this._documentSettings.clear();
    }

    private getWebviewOptions(): vscode.WebviewOptions {
        return {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
    }

    private enhanceQuarkdownHtml(htmlContent: string, documentUri: string): string {
        const settings = this.getDocumentSettings(documentUri);
        const themeClass = settings.theme ? `qmd-theme-${settings.theme}` : '';
        const layoutClass = `qmd-layout-${settings.layout}`;

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
            ${settings.enableMath ? this.getMathJaxScript() : ''}
        </head>
        <body class="${themeClass} ${layoutClass}">
            ${this.getPreviewControls(settings)}
            <div class="qmd-content">
                ${htmlContent}
            </div>
            ${this.getPreviewScript(settings)}
        </body>
        </html>`;
    }

    private getPreviewControls(settings: QuarkdownSettings): string {
        return `
            <div class="qmd-preview-controls">
                <select onchange="changeTheme(this.value)" aria-label="${l10n.t('preview.controls.selectTheme')}">
                    <option value="darko" ${settings.theme === 'darko' ? 'selected' : ''}>${l10n.t('preview.theme.dark')}</option>
                    <option value="" ${settings.theme === '' ? 'selected' : ''}>${l10n.t('preview.theme.default')}</option>
                    <option value="academic" ${settings.theme === 'academic' ? 'selected' : ''}>${l10n.t('preview.theme.academic')}</option>
                </select>
                <select onchange="changeLayout(this.value)" aria-label="${l10n.t('preview.controls.selectLayout')}">
                    <option value="minimal" ${settings.layout === 'minimal' ? 'selected' : ''}>${l10n.t('preview.layout.minimal')}</option>
                    <option value="standard" ${settings.layout === 'standard' ? 'selected' : ''}>${l10n.t('preview.layout.standard')}</option>
                    <option value="wide" ${settings.layout === 'wide' ? 'selected' : ''}>${l10n.t('preview.layout.wide')}</option>
                    <option value="narrow" ${settings.layout === 'narrow' ? 'selected' : ''}>${l10n.t('preview.layout.narrow')}</option>
                </select>
                <button onclick="exportPdf()" title="${l10n.t('preview.controls.exportPdfTooltip')}">📄 PDF</button>
                <button onclick="exportSlides()" title="${l10n.t('preview.controls.exportSlidesTooltip')}">🎞️ Slides</button>
            </div>
        `;
    }

    private getPreviewScript(settings: QuarkdownSettings): string {
        return `
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
                
                // Save state
                vscode.setState({
                    settings: {
                        theme: '${settings.theme}',
                        layout: '${settings.layout}'
                    }
                });
            </script>
        `;
    }

    private getQuarkdownCSS(): string {
        return `
            :root {
                --qmd-primary: #2563eb;
                --qmd-bg: #ffffff;
                --qmd-text: #1f2937;
                --qmd-border: #e5e7eb;
                --qmd-code-bg: #f3f4f6;
                --qmd-shadow: rgba(0, 0, 0, 0.1);
            }

            .qmd-theme-darko {
                --qmd-bg: #0f172a;
                --qmd-text: #e2e8f0;
                --qmd-border: #334155;
                --qmd-code-bg: #1e293b;
                --qmd-shadow: rgba(0, 0, 0, 0.3);
            }

            .qmd-theme-academic {
                --qmd-bg: #fafafa;
                --qmd-text: #212121;
                --qmd-border: #e0e0e0;
                --qmd-code-bg: #f5f5f5;
                --qmd-shadow: rgba(0, 0, 0, 0.08);
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
                box-shadow: 0 2px 8px var(--qmd-shadow);
            }

            .qmd-preview-controls select,
            .qmd-preview-controls button {
                background: var(--qmd-bg);
                color: var(--qmd-text);
                border: 1px solid var(--qmd-border);
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 12px;
            }

            .qmd-preview-controls button:hover {
                background-color: var(--qmd-border);
                cursor: pointer;
            }

            .qmd-content {
                margin-top: 60px;
            }

            .qmd-content h1, .qmd-content h2, .qmd-content h3, 
            .qmd-content h4, .qmd-content h5, .qmd-content h6 {
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

            .qmd-content h2 {
                font-size: 1.8em;
                border-bottom: 1px solid var(--qmd-border);
                padding-bottom: 0.3em;
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
                box-shadow: 0 4px 6px var(--qmd-shadow);
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

            .qmd-content table {
                border-collapse: collapse;
                width: 100%;
                margin: 1.5rem 0;
            }

            .qmd-content th, .qmd-content td {
                border: 1px solid var(--qmd-border);
                padding: 0.5rem 1rem;
                text-align: left;
            }

            .qmd-content th {
                background-color: var(--qmd-code-bg);
                font-weight: 600;
            }

            .page-break {
                display: none;
            }

            @media (max-width: 768px) {
                .qmd-preview-controls {
                    position: relative;
                    top: auto;
                    right: auto;
                    margin-bottom: 1rem;
                    flex-wrap: wrap;
                }
                
                .qmd-content {
                    margin-top: 0;
                }
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
                    },
                    startup: {
                        ready: () => {
                            MathJax.startup.defaultReady();
                            document.dispatchEvent(new Event('mathjax-ready'));
                        }
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
        const configuredPath = vscode.workspace.getConfiguration('quarkdown').get<string>('cliPath') || 'quarkdown';
        
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
                    word-break: break-word;
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
                .current-config {
                    background-color: #fef3c7;
                    border: 1px solid #f59e0b;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    margin: 0.75rem 0;
                }
            </style>
        </head>
        <body>
            <div class="error-container">
                <h2 class="error-title">⚠️ Quarkdown Error</h2>
                <div class="error-message">${this.escapeHtml(error.message)}</div>
            </div>

            <div class="help-section">
                <h3 class="help-title">🔧 Current Configuration</h3>
                <div class="current-config">
                    <strong>CLI Path:</strong> <code>${this.escapeHtml(configuredPath)}</code>
                </div>
            </div>

            <div class="help-section">
                <h3 class="help-title">🛠️ Quick Fix</h3>
                <p><strong>Step 1:</strong> Open VS Code Settings (<code>Ctrl+,</code> or <code>Cmd+,</code>)</p>
                <p><strong>Step 2:</strong> Search for <code>quarkdown.cliPath</code></p>
                <p><strong>Step 3:</strong> Set the correct path:</p>
                ${isWindows ? `
                <pre class="config-example">C:\\Users\\[username]\\Project\\quarkdown\\bin\\quarkdown.bat</pre>
                <p><strong>Find your path with PowerShell:</strong></p>
                <pre class="config-example">Get-Command quarkdown | Select-Object Source</pre>
                ` : `
                <pre class="config-example">/usr/local/bin/quarkdown</pre>
                <p><strong>Find your path with terminal:</strong></p>
                <pre class="config-example">which quarkdown</pre>
                `}
                <button onclick="openSettings()" class="settings-button">🛠️ Open Settings</button>
            </div>

            <div class="help-section">
                <h3 class="help-title">✅ Verification</h3>
                <p>Test Quarkdown manually in ${isWindows ? 'PowerShell' : 'terminal'}:</p>
                <pre class="config-example">${isWindows ? '& ' : ''}"${this.escapeHtml(configuredPath)}" --help</pre>
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

    private escapeHtml(text: string): string {
        if (typeof text !== 'string') {
            return '';
        }
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    private async saveDocumentSettings(documentUri: string): Promise<void> {
        try {
            const settings = this.getDocumentSettings(documentUri);
            const config = vscode.workspace.getConfiguration('quarkdown');
            await config.update('previewTheme', settings.theme, vscode.ConfigurationTarget.Workspace);
            await config.update('previewLayout', settings.layout, vscode.ConfigurationTarget.Workspace);
            await config.update('enableMath', settings.enableMath, vscode.ConfigurationTarget.Workspace);
            await config.update('enableAutoPreview', settings.enableWatch, vscode.ConfigurationTarget.Workspace);
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    private async exportToPdf(document: vscode.TextDocument): Promise<void> {
        try {
            const { exportToPdf } = await import('./exportUtils');
            await exportToPdf(document);
        } catch (error) {
            console.error('PDF export failed:', error);
            vscode.window.showErrorMessage('PDF export not available');
        }
    }

    private async exportToSlides(document: vscode.TextDocument): Promise<void> {
        try {
            const { exportToSlides } = await import('./exportUtils');
            await exportToSlides(document);
        } catch (error) {
            console.error('Slides export failed:', error);
            vscode.window.showErrorMessage('Slides export not available');
        }
    }
}