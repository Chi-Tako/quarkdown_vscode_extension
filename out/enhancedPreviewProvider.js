"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedQuarkdownPreviewProvider = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class EnhancedQuarkdownPreviewProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
        this._panels = new Map();
        this._watchers = new Map();
        this._currentSettings = {
            theme: 'darko',
            layout: 'minimal',
            enableMath: true,
            enableWatch: true
        };
    }
    async deserializeWebviewPanel(webviewPanel, state) {
        webviewPanel.webview.options = this.getWebviewOptions();
        webviewPanel.webview.html = this.getLoadingHtml();
        // Restore settings if available
        if (state && state.settings) {
            this._currentSettings = { ...this._currentSettings, ...state.settings };
        }
    }
    openPreview(document) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        const panel = vscode.window.createWebviewPanel('quarkdownPreview', `📄 ${path.basename(document.fileName)}`, column ? column + 1 : vscode.ViewColumn.Two, this.getWebviewOptions());
        this._panels.set(document.uri.toString(), panel);
        // Handle messages from webview
        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'themeChanged':
                    this._currentSettings.theme = message.theme;
                    this.saveSettings();
                    break;
                case 'layoutChanged':
                    this._currentSettings.layout = message.layout;
                    this.saveSettings();
                    break;
                case 'toggleMath':
                    this._currentSettings.enableMath = !this._currentSettings.enableMath;
                    this.updatePreview(document);
                    break;
                case 'exportPdf':
                    this.exportToPdf(document);
                    break;
                case 'exportSlides':
                    this.exportToSlides(document);
                    break;
            }
        }, undefined);
        panel.onDidDispose(() => {
            this._panels.delete(document.uri.toString());
            this.stopWatching(document.uri.toString());
        });
        // Setup file watching if enabled
        if (this._currentSettings.enableWatch) {
            this.setupFileWatcher(document);
        }
        this.updatePreview(document);
    }
    async updatePreview(document) {
        const panel = this._panels.get(document.uri.toString());
        if (!panel) {
            return;
        }
        try {
            const html = await this.renderQuarkdown(document);
            panel.webview.html = html;
        }
        catch (error) {
            panel.webview.html = this.getErrorHtml(error);
        }
    }
    setupFileWatcher(document) {
        const key = document.uri.toString();
        // Stop existing watcher
        this.stopWatching(key);
        try {
            const watcher = fs.watch(document.uri.fsPath, (eventType) => {
                if (eventType === 'change') {
                    // Debounce updates
                    setTimeout(() => {
                        this.updatePreview(document);
                    }, 500);
                }
            });
            this._watchers.set(key, watcher);
        }
        catch (error) {
            console.warn('Could not setup file watcher:', error);
        }
    }
    stopWatching(key) {
        const watcher = this._watchers.get(key);
        if (watcher) {
            watcher.close();
            this._watchers.delete(key);
        }
    }
    getWebviewOptions() {
        return {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
    }
    async renderQuarkdown(document) {
        const content = document.getText();
        // Extract document settings from content
        this.extractDocumentSettings(content);
        // Check if Quarkdown CLI is available
        try {
            await execAsync('quarkdown --version');
            return await this.renderWithCli(document, content);
        }
        catch (error) {
            return this.getFallbackHtml(content);
        }
    }
    extractDocumentSettings(content) {
        // Extract theme setting
        const themeMatch = content.match(/\.theme\s*\{([^}]+)\}/);
        if (themeMatch) {
            this._currentSettings.theme = themeMatch[1];
        }
        // Extract layout setting  
        const layoutMatch = content.match(/layout:\{([^}]+)\}/);
        if (layoutMatch) {
            this._currentSettings.layout = layoutMatch[1];
        }
    }
    async renderWithCli(document, content) {
        const tempFile = path.join(__dirname, 'temp.qmd');
        fs.writeFileSync(tempFile, content);
        try {
            const { stdout } = await execAsync(`quarkdown --to html "${tempFile}"`);
            fs.unlinkSync(tempFile);
            return this.wrapInHtml(stdout);
        }
        catch (error) {
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
            throw error;
        }
    }
    getFallbackHtml(content) {
        // Enhanced fallback rendering with better Quarkdown support
        let processedContent = content;
        // Process control structures
        processedContent = processedContent
            .replace(/\.if\s+\{([^}]+)\}\s+([^\n]*)/g, '<div class="qmd-if"><span class="qmd-condition">If $1:</span> $2</div>')
            .replace(/\.ifnot\s+\{([^}]+)\}\s+([^\n]*)/g, '<div class="qmd-ifnot"><span class="qmd-condition">If not $1:</span> $2</div>')
            .replace(/\.foreach\s+\{([^}]+)\}\s+(\w+):\s*([^\n]*)/g, '<div class="qmd-foreach"><span class="qmd-loop">For each $2 in $1:</span><div class="qmd-loop-body">$3</div></div>')
            .replace(/\.repeat\s+\{([^}]+)\}\s+(\w+):\s*([^\n]*)/g, '<div class="qmd-repeat"><span class="qmd-loop">Repeat $1 times as $2:</span><div class="qmd-loop-body">$3</div></div>');
        // Process file operations
        processedContent = processedContent
            .replace(/\.include\s+\{([^}]+)\}/g, '<div class="qmd-include">📁 Include: <span class="qmd-filename">$1</span></div>')
            .replace(/\.read\s+\{([^}]+)\}(?:\s+lines:\{([^}]+)\})?/g, (match, file, lines) => {
            const lineInfo = lines ? ` (lines ${lines})` : '';
            return `<div class="qmd-read">📖 Read: <span class="qmd-filename">${file}</span>${lineInfo}</div>`;
        });
        // Process theme and document settings
        processedContent = processedContent
            .replace(/\.theme\s+\{([^}]+)\}(?:\s+layout:\{([^}]+)\})?/g, (match, theme, layout) => {
            const layoutInfo = layout ? ` with ${layout} layout` : '';
            return `<div class="qmd-theme">🎨 Theme: <span class="qmd-theme-name">${theme}</span>${layoutInfo}</div>`;
        })
            .replace(/\.doctype\s+\{([^}]+)\}/g, '<div class="qmd-doctype">📄 Document type: <span class="qmd-doctype-name">$1</span></div>')
            .replace(/\.pageformat\s+\{([^}]+)\}(?:\s+orientation:\{([^}]+)\})?/g, (match, format, orientation) => {
            const orientInfo = orientation ? ` (${orientation})` : '';
            return `<div class="qmd-pageformat">📏 Page format: <span class="qmd-format-name">${format}</span>${orientInfo}</div>`;
        });
        // Process layout functions
        processedContent = processedContent
            .replace(/\.row(?:\s+([^:]*):)?/g, '<div class="qmd-layout qmd-row">📐 Row layout: $1</div>')
            .replace(/\.column(?:\s+([^:]*):)?/g, '<div class="qmd-layout qmd-column">📐 Column layout: $1</div>')
            .replace(/\.grid\s+\{([^}]+)\}(?:\s+([^:]*):)?/g, '<div class="qmd-layout qmd-grid">📐 Grid ($1 columns): $2</div>')
            .replace(/\.center(?:\s*:)?/g, '<div class="qmd-layout qmd-center">📐 Center alignment</div>');
        // Process mathematical functions
        processedContent = processedContent
            .replace(/\.(sum|multiply|divide|pow|sin|cos|tan|truncate|round|iseven|isgreater|pi)\s*([^\n]*)/g, '<span class="qmd-math-function">🔢 $1($2)</span>');
        // Process basic markdown and Quarkdown elements
        processedContent = processedContent
            .replace(/^#{1,6}\s+(.*)$/gm, (match, p1) => {
            const level = (match.match(/#/g) || []).length;
            return `<h${level}>${p1}</h${level}>`;
        })
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\.function\s+\{([^}]+)\}/g, '<span class="qmd-function">⚡ Function: $1</span>')
            .replace(/\.var\s+\{([^}]+)\}\s+(.*)/g, '<span class="qmd-variable">📊 Variable $1 = $2</span>')
            .replace(/\.([a-zA-Z_][a-zA-Z0-9_]*)/g, '<span class="qmd-reference">.$1</span>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        // Wrap in paragraphs
        processedContent = '<p>' + processedContent + '</p>';
        return this.wrapInHtml(processedContent);
    }
    wrapInHtml(content) {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Quarkdown Preview</title>
            <style>
                :root {
                    --primary-color: #0277bd;
                    --secondary-color: #7b1fa2;
                    --accent-color: #d81b60;
                    --bg-color: #ffffff;
                    --text-color: #333333;
                    --border-color: #e0e0e0;
                    --code-bg: #f6f8fa;
                }
                
                [data-theme="darko"] {
                    --primary-color: #64b5f6;
                    --secondary-color: #ba68c8;
                    --accent-color: #f06292;
                    --bg-color: #1e1e1e;
                    --text-color: #d4d4d4;
                    --border-color: #404040;
                    --code-bg: #2d2d2d;
                }
                
                [data-theme="academic"] {
                    --primary-color: #1565c0;
                    --secondary-color: #6a1b9a;
                    --accent-color: #c2185b;
                    --bg-color: #fafafa;
                    --text-color: #212121;
                    --border-color: #e0e0e0;
                    --code-bg: #f5f5f5;
                }
                
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe WPC', 'Segoe UI', system-ui, 'Ubuntu', 'Droid Sans', sans-serif;
                    font-size: 14px;
                    padding: 20px;
                    line-height: 1.6;
                    word-wrap: break-word;
                    background-color: var(--bg-color);
                    color: var(--text-color);
                    transition: all 0.3s ease;
                    margin: 0;
                }
                
                .layout-minimal {
                    max-width: 800px;
                    margin: 0 auto;
                }
                
                .layout-standard {
                    max-width: 1000px;
                    margin: 0 auto;
                }
                
                .layout-wide {
                    max-width: 1200px;
                    margin: 0 auto;
                }
                
                .layout-narrow {
                    max-width: 600px;
                    margin: 0 auto;
                }
                
                h1, h2, h3, h4, h5, h6 {
                    font-weight: 600;
                    margin-top: 1.5em;
                    margin-bottom: 0.5em;
                    color: var(--text-color);
                }
                h1 { 
                    border-bottom: 2px solid var(--border-color); 
                    padding-bottom: 0.3em; 
                    font-size: 2em;
                }
                h2 { 
                    border-bottom: 1px solid var(--border-color); 
                    padding-bottom: 0.2em; 
                    font-size: 1.5em;
                }
                h3 { font-size: 1.25em; }
                h4 { font-size: 1.1em; }
                
                code {
                    background-color: var(--code-bg);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                    color: var(--text-color);
                    border: 1px solid var(--border-color);
                }
                
                /* Quarkdown Elements */
                .qmd-function {
                    background-color: rgba(1, 87, 155, 0.1);
                    padding: 6px 10px;
                    border-radius: 6px;
                    border-left: 4px solid var(--primary-color);
                    display: inline-block;
                    margin: 4px 0;
                    font-weight: bold;
                    color: var(--primary-color);
                    font-family: monospace;
                }
                
                .qmd-variable {
                    background-color: rgba(123, 31, 162, 0.1);
                    padding: 6px 10px;
                    border-radius: 6px;
                    border-left: 4px solid var(--secondary-color);
                    display: inline-block;
                    margin: 4px 0;
                    font-weight: bold;
                    color: var(--secondary-color);
                    font-family: monospace;
                }
                
                .qmd-reference {
                    color: var(--accent-color);
                    font-weight: bold;
                    font-family: monospace;
                }
                
                .qmd-math-function {
                    background-color: rgba(255, 193, 7, 0.1);
                    padding: 2px 6px;
                    border-radius: 4px;
                    border-left: 3px solid #ffc107;
                    color: #f57c00;
                    font-family: monospace;
                    font-weight: bold;
                }
                
                /* Control Flow Elements */
                .qmd-if, .qmd-ifnot {
                    background-color: rgba(76, 175, 80, 0.1);
                    border-left: 4px solid #4caf50;
                    padding: 10px 15px;
                    margin: 10px 0;
                    border-radius: 6px;
                }
                
                .qmd-foreach, .qmd-repeat {
                    background-color: rgba(255, 152, 0, 0.1);
                    border-left: 4px solid #ff9800;
                    padding: 10px 15px;
                    margin: 10px 0;
                    border-radius: 6px;
                }
                
                .qmd-condition, .qmd-loop {
                    font-weight: bold;
                    display: block;
                    margin-bottom: 8px;
                    color: var(--text-color);
                }
                
                .qmd-loop-body {
                    margin-left: 20px;
                    padding-left: 12px;
                    border-left: 3px solid rgba(255, 152, 0, 0.3);
                    margin-top: 8px;
                }
                
                /* File Operations */
                .qmd-include, .qmd-read {
                    background-color: rgba(103, 58, 183, 0.1);
                    border-left: 4px solid #673ab7;
                    padding: 8px 12px;
                    margin: 8px 0;
                    border-radius: 6px;
                    font-family: monospace;
                }
                
                .qmd-filename {
                    font-weight: bold;
                    color: #673ab7;
                }
                
                /* Document Settings */
                .qmd-theme, .qmd-doctype, .qmd-pageformat {
                    background-color: rgba(158, 158, 158, 0.1);
                    border-left: 4px solid #9e9e9e;
                    padding: 8px 12px;
                    margin: 8px 0;
                    border-radius: 6px;
                }
                
                .qmd-theme-name, .qmd-doctype-name, .qmd-format-name {
                    font-weight: bold;
                    color: #616161;
                }
                
                /* Layout Elements */
                .qmd-layout {
                    background-color: rgba(33, 150, 243, 0.1);
                    border-left: 4px solid #2196f3;
                    padding: 8px 12px;
                    margin: 8px 0;
                    border-radius: 6px;
                    font-family: monospace;
                    color: #1976d2;
                }
                
                pre {
                    background-color: var(--code-bg);
                    border-radius: 8px;
                    padding: 16px;
                    overflow: auto;
                    border: 1px solid var(--border-color);
                    margin: 16px 0;
                }
                
                blockquote {
                    margin: 16px 0;
                    padding: 0 1em;
                    color: #6a737d;
                    border-left: 0.25em solid var(--border-color);
                    background-color: rgba(0,0,0,0.02);
                    border-radius: 0 4px 4px 0;
                }
                
                /* Math Elements */
                .MathJax {
                    color: var(--text-color) !important;
                }
                
                /* Theme Controls */
                .preview-controls {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: var(--bg-color);
                    border: 2px solid var(--border-color);
                    border-radius: 8px;
                    padding: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    min-width: 180px;
                }
                
                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .control-label {
                    font-size: 12px;
                    font-weight: bold;
                    color: var(--text-color);
                    opacity: 0.7;
                }
                
                .preview-controls select, .preview-controls button {
                    padding: 6px 10px;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    background: var(--bg-color);
                    color: var(--text-color);
                    font-size: 12px;
                    cursor: pointer;
                }
                
                .preview-controls button {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 500;
                }
                
                .preview-controls button:hover {
                    background: var(--border-color);
                }
                
                .button-row {
                    display: flex;
                    gap: 4px;
                }
                
                /* Tables */
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 16px 0;
                }
                
                th, td {
                    border: 1px solid var(--border-color);
                    padding: 8px 12px;
                    text-align: left;
                }
                
                th {
                    background-color: var(--code-bg);
                    font-weight: bold;
                }
                
                /* Lists */
                ul, ol {
                    margin: 16px 0;
                    padding-left: 2em;
                }
                
                li {
                    margin: 4px 0;
                }
                
                /* Links */
                a {
                    color: var(--primary-color);
                    text-decoration: none;
                }
                
                a:hover {
                    text-decoration: underline;
                }
                
                /* Responsive Design */
                @media (max-width: 768px) {
                    body {
                        padding: 15px;
                        font-size: 13px;
                    }
                    
                    .preview-controls {
                        position: relative;
                        top: auto;
                        right: auto;
                        margin-bottom: 20px;
                        min-width: auto;
                    }
                    
                    h1 { font-size: 1.8em; }
                    h2 { font-size: 1.4em; }
                    h3 { font-size: 1.2em; }
                }
            </style>
            ${this._currentSettings.enableMath ? `
            <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
            <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
            ` : ''}
            <script>
                ${this._currentSettings.enableMath ? `
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
                            document.addEventListener('themeChanged', () => {
                                MathJax.typesetPromise();
                            });
                        }
                    }
                };
                ` : ''}
                
                const vscode = acquireVsCodeApi();
                
                function changeTheme(theme) {
                    document.documentElement.setAttribute('data-theme', theme);
                    document.dispatchEvent(new CustomEvent('themeChanged'));
                    vscode.postMessage({
                        command: 'themeChanged',
                        theme: theme
                    });
                }
                
                function changeLayout(layout) {
                    document.body.className = \`layout-\${layout}\`;
                    vscode.postMessage({
                        command: 'layoutChanged',
                        layout: layout
                    });
                }
                
                function toggleMath() {
                    vscode.postMessage({
                        command: 'toggleMath'
                    });
                }
                
                function exportPdf() {
                    vscode.postMessage({
                        command: 'exportPdf'
                    });
                }
                
                function exportSlides() {
                    vscode.postMessage({
                        command: 'exportSlides'
                    });
                }
                
                // Initialize theme and layout
                document.addEventListener('DOMContentLoaded', () => {
                    const theme = '${this._currentSettings.theme}';
                    const layout = '${this._currentSettings.layout}';
                    changeTheme(theme);
                    changeLayout(layout);
                });
            </script>
        </head>
        <body class="layout-${this._currentSettings.layout}" data-theme="${this._currentSettings.theme}">
            <div class="preview-controls">
                <div class="control-group">
                    <label class="control-label">Theme</label>
                    <select onchange="changeTheme(this.value)">
                        <option value="" ${this._currentSettings.theme === '' ? 'selected' : ''}>Default</option>
                        <option value="darko" ${this._currentSettings.theme === 'darko' ? 'selected' : ''}>Dark</option>
                        <option value="academic" ${this._currentSettings.theme === 'academic' ? 'selected' : ''}>Academic</option>
                    </select>
                </div>
                <div class="control-group">
                    <label class="control-label">Layout</label>
                    <select onchange="changeLayout(this.value)">
                        <option value="minimal" ${this._currentSettings.layout === 'minimal' ? 'selected' : ''}>Minimal</option>
                        <option value="standard" ${this._currentSettings.layout === 'standard' ? 'selected' : ''}>Standard</option>
                        <option value="wide" ${this._currentSettings.layout === 'wide' ? 'selected' : ''}>Wide</option>
                        <option value="narrow" ${this._currentSettings.layout === 'narrow' ? 'selected' : ''}>Narrow</option>
                    </select>
                </div>
                <div class="control-group">
                    <label class="control-label">Actions</label>
                    <div class="button-row">
                        <button onclick="toggleMath()" title="Toggle Math Rendering">📐 Math</button>
                        <button onclick="exportPdf()" title="Export to PDF">📄 PDF</button>
                    </div>
                    <button onclick="exportSlides()" title="Export to Slides">🎞️ Slides</button>
                </div>
            </div>
            <div class="content">
                ${content}
            </div>
        </body>
        </html>`;
    }
    getLoadingHtml() {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Loading...</title>
            <style>
                body { 
                    font-family: system-ui; 
                    padding: 40px; 
                    text-align: center; 
                    color: #666;
                }
                .spinner {
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #0277bd;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 20px auto;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        </head>
        <body>
            <div class="spinner"></div>
            <h2>Loading Quarkdown preview...</h2>
            <p>Preparing your document for preview</p>
        </body>
        </html>`;
    }
    getErrorHtml(error) {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error</title>
            <style>
                body { 
                    font-family: system-ui; 
                    padding: 40px; 
                    background: #fff5f5; 
                    color: #333;
                }
                .error-container {
                    background: white;
                    border: 1px solid #fed7d7;
                    border-radius: 8px;
                    padding: 20px;
                    border-left: 4px solid #f56565;
                }
                .error-title {
                    color: #c53030;
                    margin-top: 0;
                }
                .error-message {
                    background: #fed7d7;
                    padding: 10px;
                    border-radius: 4px;
                    font-family: monospace;
                    margin: 15px 0;
                }
                .help-text {
                    color: #666;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="error-container">
                <h2 class="error-title">⚠️ Error rendering Quarkdown</h2>
                <div class="error-message">${error.message}</div>
                <div class="help-text">
                    <p><strong>Possible solutions:</strong></p>
                    <ul>
                        <li>Install Quarkdown CLI from <a href="https://github.com/jjallaire/quarkdown/releases">GitHub Releases</a></li>
                        <li>Ensure Java 17+ is installed</li>
                        <li>Check that Quarkdown is in your system PATH</li>
                        <li>Verify your Quarkdown syntax is correct</li>
                    </ul>
                </div>
            </div>
        </body>
        </html>`;
    }
    saveSettings() {
        // Save settings to VSCode workspace configuration
        vscode.workspace.getConfiguration('quarkdown').update('previewSettings', this._currentSettings, true);
    }
    async exportToPdf(document) {
        // Reuse existing export logic
        const { exportToPdf } = await Promise.resolve().then(() => require('./exportUtils'));
        exportToPdf(document);
    }
    async exportToSlides(document) {
        // Reuse existing export logic  
        const { exportToSlides } = await Promise.resolve().then(() => require('./exportUtils'));
        exportToSlides(document);
    }
}
exports.EnhancedQuarkdownPreviewProvider = EnhancedQuarkdownPreviewProvider;
//# sourceMappingURL=enhancedPreviewProvider.js.map