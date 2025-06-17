"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccurateQuarkdownPreviewProvider = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class AccurateQuarkdownPreviewProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
        this._panels = new Map();
        this._watchers = new Map();
        this._currentSettings = {
            theme: '',
            layout: 'standard',
            doctype: 'html',
            enableMath: true,
            enableWatch: true
        };
    }
    async deserializeWebviewPanel(webviewPanel, state) {
        webviewPanel.webview.options = this.getWebviewOptions();
        webviewPanel.webview.html = this.getLoadingHtml();
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
        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'settingsChanged':
                    this._currentSettings = { ...this._currentSettings, ...message.settings };
                    this.saveSettings();
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
        this.stopWatching(key);
        try {
            const watcher = fs.watch(document.uri.fsPath, (eventType) => {
                if (eventType === 'change') {
                    setTimeout(() => {
                        this.updatePreview(document);
                    }, 300);
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
        // Try to use Quarkdown CLI first
        try {
            await execAsync('quarkdown --version');
            return await this.renderWithCli(document, content);
        }
        catch (error) {
            // Fallback to accurate internal rendering
            return this.getAccurateQuarkdownHtml(content);
        }
    }
    extractDocumentSettings(content) {
        // Theme extraction
        const themeMatch = content.match(/^\s*\.theme\s*\{([^}]+)\}/m);
        if (themeMatch) {
            this._currentSettings.theme = themeMatch[1].trim();
        }
        // Layout extraction
        const layoutMatch = content.match(/layout:\s*\{([^}]+)\}/);
        if (layoutMatch) {
            this._currentSettings.layout = layoutMatch[1].trim();
        }
        // Document type extraction
        const doctypeMatch = content.match(/^\s*\.doctype\s*\{([^}]+)\}/m);
        if (doctypeMatch) {
            this._currentSettings.doctype = doctypeMatch[1].trim();
        }
        // Page format extraction
        const pageFormatMatch = content.match(/^\s*\.pageformat\s*\{([^}]+)\}/m);
        if (pageFormatMatch) {
            this._currentSettings.pageFormat = pageFormatMatch[1].trim();
        }
        // Orientation extraction
        const orientationMatch = content.match(/orientation:\s*\{([^}]+)\}/);
        if (orientationMatch) {
            this._currentSettings.orientation = orientationMatch[1].trim();
        }
    }
    async renderWithCli(document, content) {
        const tempFile = path.join(__dirname, 'temp.qmd');
        fs.writeFileSync(tempFile, content);
        try {
            const { stdout } = await execAsync(`quarkdown "${tempFile}"`);
            fs.unlinkSync(tempFile);
            return this.enhanceRenderedHtml(stdout);
        }
        catch (error) {
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
            throw error;
        }
    }
    getAccurateQuarkdownHtml(content) {
        let processedContent = this.preprocessQuarkdownSyntax(content);
        processedContent = this.renderMarkdownContent(processedContent);
        return this.wrapInCompleteHtml(processedContent);
    }
    preprocessQuarkdownSyntax(content) {
        let processed = content;
        // Process function definitions
        processed = processed.replace(/^\.function\s*\{([^}]+)\}\s*([^:]*):?\s*$/gm, (match, name, params) => {
            const paramStr = params.trim() ? ` (${params.trim()})` : '';
            return `<div class="qmd-function-def"><span class="qmd-keyword">function</span> <span class="qmd-name">${name}</span><span class="qmd-params">${paramStr}</span></div>`;
        });
        // Process variable definitions
        processed = processed.replace(/^\.var\s*\{([^}]+)\}\s*\{([^}]*)\}\s*$/gm, '<div class="qmd-variable-def"><span class="qmd-keyword">var</span> <span class="qmd-name">$1</span> = <span class="qmd-value">$2</span></div>');
        // Process function calls with named parameters
        processed = processed.replace(/\.(\w+)\s*\{([^}]*)\}\s*([^{}\n]*?):/g, (match, funcName, arg, namedParams) => {
            const params = namedParams.trim() ? ` ${namedParams.trim()}` : '';
            return `<div class="qmd-function-call"><span class="qmd-call">.${funcName}</span> <span class="qmd-arg">{${arg}}</span><span class="qmd-named-params">${params}:</span></div>`;
        });
        // Process simple function calls
        processed = processed.replace(/\.(\w+)\s*(\{[^}]*\})*(?:\s*\{[^}]*\})*/g, (match, funcName) => {
            const args = match.match(/\{([^}]*)\}/g) || [];
            const argStr = args.map(arg => `<span class="qmd-arg">${arg}</span>`).join(' ');
            return `<span class="qmd-function-call"><span class="qmd-call">.${funcName}</span> ${argStr}</span>`;
        });
        // Process control structures
        processed = this.processControlStructures(processed);
        // Process file operations
        processed = processed.replace(/^\.include\s*\{([^}]+)\}\s*$/gm, '<div class="qmd-include"><span class="qmd-keyword">include</span> <span class="qmd-filename">$1</span></div>');
        processed = processed.replace(/^\.read\s*\{([^}]+)\}(?:\s*lines:\{([^}]+)\})?\s*$/gm, (match, filename, lines) => {
            const lineInfo = lines ? ` <span class="qmd-lines">lines: ${lines}</span>` : '';
            return `<div class="qmd-read"><span class="qmd-keyword">read</span> <span class="qmd-filename">${filename}</span>${lineInfo}</div>`;
        });
        // Process document directives
        processed = processed.replace(/^\.theme\s*\{([^}]+)\}(?:\s*layout:\{([^}]+)\})?\s*$/gm, (match, theme, layout) => {
            const layoutInfo = layout ? ` <span class="qmd-layout">layout: ${layout}</span>` : '';
            return `<div class="qmd-theme"><span class="qmd-keyword">theme</span> <span class="qmd-theme-name">${theme}</span>${layoutInfo}</div>`;
        });
        processed = processed.replace(/^\.doctype\s*\{([^}]+)\}\s*$/gm, '<div class="qmd-doctype"><span class="qmd-keyword">doctype</span> <span class="qmd-doctype-name">$1</span></div>');
        processed = processed.replace(/^\.pageformat\s*\{([^}]+)\}(?:\s*orientation:\{([^}]+)\})?\s*$/gm, (match, format, orientation) => {
            const orientInfo = orientation ? ` <span class="qmd-orientation">orientation: ${orientation}</span>` : '';
            return `<div class="qmd-pageformat"><span class="qmd-keyword">pageformat</span> <span class="qmd-format">${format}</span>${orientInfo}</div>`;
        });
        // Process layout functions
        processed = this.processLayoutFunctions(processed);
        return processed;
    }
    processControlStructures(content) {
        let processed = content;
        // Process if statements
        processed = processed.replace(/^\.if\s*\{([^}]+)\}\s*$/gm, '<div class="qmd-if"><span class="qmd-keyword">if</span> <span class="qmd-condition">$1</span></div>');
        // Process ifnot statements
        processed = processed.replace(/^\.ifnot\s*\{([^}]+)\}\s*$/gm, '<div class="qmd-ifnot"><span class="qmd-keyword">ifnot</span> <span class="qmd-condition">$1</span></div>');
        // Process foreach loops
        processed = processed.replace(/^\.foreach\s*\{([^}]+)\}\s*(\w+):\s*$/gm, '<div class="qmd-foreach"><span class="qmd-keyword">foreach</span> <span class="qmd-range">$1</span> <span class="qmd-variable">$2</span>:</div>');
        // Process repeat loops
        processed = processed.replace(/^\.repeat\s*\{([^}]+)\}\s*(\w+):\s*$/gm, '<div class="qmd-repeat"><span class="qmd-keyword">repeat</span> <span class="qmd-count">$1</span> <span class="qmd-variable">$2</span>:</div>');
        return processed;
    }
    processLayoutFunctions(content) {
        let processed = content;
        // Process stack layouts
        processed = processed.replace(/^\.row(?:\s+([^:]*)):?\s*$/gm, (match, params) => {
            const paramStr = params ? ` <span class="qmd-params">${params}</span>` : '';
            return `<div class="qmd-layout qmd-row"><span class="qmd-keyword">row</span>${paramStr}:</div>`;
        });
        processed = processed.replace(/^\.column(?:\s+([^:]*)):?\s*$/gm, (match, params) => {
            const paramStr = params ? ` <span class="qmd-params">${params}</span>` : '';
            return `<div class="qmd-layout qmd-column"><span class="qmd-keyword">column</span>${paramStr}:</div>`;
        });
        processed = processed.replace(/^\.grid\s*\{([^}]+)\}(?:\s+([^:]*)):?\s*$/gm, (match, cols, params) => {
            const paramStr = params ? ` <span class="qmd-params">${params}</span>` : '';
            return `<div class="qmd-layout qmd-grid"><span class="qmd-keyword">grid</span> <span class="qmd-cols">${cols}</span>${paramStr}:</div>`;
        });
        // Process container functions
        processed = processed.replace(/^\.center(?:\s*:)?\s*$/gm, '<div class="qmd-layout qmd-center"><span class="qmd-keyword">center</span>:</div>');
        processed = processed.replace(/^\.box(?:\s+([^:]*)):?\s*$/gm, (match, params) => {
            const paramStr = params ? ` <span class="qmd-params">${params}</span>` : '';
            return `<div class="qmd-layout qmd-box"><span class="qmd-keyword">box</span>${paramStr}:</div>`;
        });
        return processed;
    }
    renderMarkdownContent(content) {
        let processed = content;
        // Headers
        processed = processed.replace(/^(#{1,6})\s+(.*)$/gm, (match, hashes, title) => {
            const level = hashes.length;
            return `<h${level} class="qmd-heading">${title}</h${level}>`;
        });
        // Bold and italic
        processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Code
        processed = processed.replace(/`(.*?)`/g, '<code>$1</code>');
        // Code blocks
        processed = processed.replace(/^```(\w+)?\s*$\n([\s\S]*?)^```\s*$/gm, (match, lang, code) => {
            const language = lang ? ` class="language-${lang}"` : '';
            return `<pre${language}><code>${code.trim()}</code></pre>`;
        });
        // Links
        processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
        // Lists
        processed = processed.replace(/^(\s*)[-*+]\s+(.*)$/gm, '$1<li>$2</li>');
        processed = processed.replace(/^(\s*)\d+\.\s+(.*)$/gm, '$1<li>$2</li>');
        // Math expressions
        if (this._currentSettings.enableMath) {
            processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, '<div class="qmd-math-block">$$1$$</div>');
            processed = processed.replace(/\$([^\$\n]+)\$/g, '<span class="qmd-math-inline">$$1$</span>');
        }
        // Line breaks
        processed = processed.replace(/\n\n/g, '</p><p>');
        processed = processed.replace(/\n/g, '<br>');
        return '<p>' + processed + '</p>';
    }
    enhanceRenderedHtml(html) {
        // Add Quarkdown-specific enhancements to CLI-rendered HTML
        return this.wrapInCompleteHtml(html);
    }
    wrapInCompleteHtml(content) {
        const themeClass = this._currentSettings.theme ? `qmd-theme-${this._currentSettings.theme}` : '';
        const layoutClass = `qmd-layout-${this._currentSettings.layout}`;
        const doctypeClass = `qmd-doctype-${this._currentSettings.doctype}`;
        return `
        <!DOCTYPE html>
        <html lang="en" class="${doctypeClass}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Quarkdown Preview</title>
            <style>
                ${this.getQuarkdownCSS()}
            </style>
            ${this._currentSettings.enableMath ? this.getMathJaxScript() : ''}
            <script>
                ${this.getPreviewScript()}
            </script>
        </head>
        <body class="${themeClass} ${layoutClass}">
            ${this.getPreviewControls()}
            <div class="qmd-content">
                ${content}
            </div>
        </body>
        </html>`;
    }
    getQuarkdownCSS() {
        return `
            /* Quarkdown Base Styles */
            :root {
                --qmd-primary: #2563eb;
                --qmd-secondary: #7c3aed;
                --qmd-accent: #dc2626;
                --qmd-bg: #ffffff;
                --qmd-text: #1f2937;
                --qmd-border: #e5e7eb;
                --qmd-code-bg: #f3f4f6;
                --qmd-shadow: rgba(0, 0, 0, 0.1);
            }

            /* Theme Variants */
            .qmd-theme-darko {
                --qmd-primary: #60a5fa;
                --qmd-secondary: #a78bfa;
                --qmd-accent: #f87171;
                --qmd-bg: #111827;
                --qmd-text: #f9fafb;
                --qmd-border: #374151;
                --qmd-code-bg: #1f2937;
                --qmd-shadow: rgba(0, 0, 0, 0.3);
            }

            .qmd-theme-academic {
                --qmd-primary: #1e40af;
                --qmd-secondary: #6d28d9;
                --qmd-accent: #b91c1c;
                --qmd-bg: #fefefe;
                --qmd-text: #0f172a;
                --qmd-border: #d1d5db;
                --qmd-code-bg: #f8fafc;
            }

            /* Layout Variants */
            .qmd-layout-minimal { max-width: 800px; margin: 0 auto; padding: 2rem; }
            .qmd-layout-standard { max-width: 1000px; margin: 0 auto; padding: 2rem; }
            .qmd-layout-wide { max-width: 1200px; margin: 0 auto; padding: 2rem; }
            .qmd-layout-narrow { max-width: 600px; margin: 0 auto; padding: 2rem; }

            /* Document Type Styles */
            .qmd-doctype-slides .qmd-content { 
                display: flex; 
                flex-direction: column; 
                min-height: 100vh;
            }
            .qmd-doctype-paged .qmd-content { 
                columns: 2; 
                column-gap: 2rem; 
            }

            /* Base Styles */
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                font-size: 16px;
                line-height: 1.7;
                background-color: var(--qmd-bg);
                color: var(--qmd-text);
                margin: 0;
                transition: all 0.3s ease;
            }

            /* Typography */
            .qmd-heading {
                margin-top: 2em;
                margin-bottom: 0.8em;
                font-weight: 600;
                line-height: 1.25;
            }

            h1.qmd-heading { 
                font-size: 2.25em; 
                border-bottom: 2px solid var(--qmd-border);
                padding-bottom: 0.5em;
            }
            h2.qmd-heading { 
                font-size: 1.75em; 
                border-bottom: 1px solid var(--qmd-border);
                padding-bottom: 0.3em;
            }
            h3.qmd-heading { font-size: 1.5em; }
            h4.qmd-heading { font-size: 1.25em; }
            h5.qmd-heading { font-size: 1.1em; }
            h6.qmd-heading { font-size: 1em; }

            /* Code */
            code {
                background-color: var(--qmd-code-bg);
                padding: 0.2em 0.4em;
                border-radius: 0.375rem;
                font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
                font-size: 0.875em;
            }

            pre {
                background-color: var(--qmd-code-bg);
                border: 1px solid var(--qmd-border);
                border-radius: 0.5rem;
                padding: 1rem;
                overflow-x: auto;
                margin: 1.5rem 0;
            }

            pre code {
                background: none;
                padding: 0;
                border-radius: 0;
            }

            /* Quarkdown Directives */
            .qmd-function-def, .qmd-variable-def, .qmd-function-call {
                background-color: rgba(37, 99, 235, 0.1);
                border-left: 4px solid var(--qmd-primary);
                padding: 0.75rem 1rem;
                margin: 1rem 0;
                border-radius: 0.375rem;
                font-family: monospace;
            }

            .qmd-keyword {
                color: var(--qmd-primary);
                font-weight: 700;
            }

            .qmd-name {
                color: var(--qmd-secondary);
                font-weight: 600;
            }

            .qmd-value, .qmd-arg {
                color: var(--qmd-accent);
            }

            .qmd-params, .qmd-named-params {
                color: var(--qmd-text);
                opacity: 0.8;
            }

            /* Control Structures */
            .qmd-if, .qmd-ifnot, .qmd-foreach, .qmd-repeat {
                background-color: rgba(124, 58, 237, 0.1);
                border-left: 4px solid var(--qmd-secondary);
                padding: 0.75rem 1rem;
                margin: 1rem 0;
                border-radius: 0.375rem;
                font-family: monospace;
            }

            .qmd-condition, .qmd-range, .qmd-count {
                background-color: rgba(0, 0, 0, 0.1);
                padding: 0.2em 0.4em;
                border-radius: 0.25rem;
                font-weight: 600;
            }

            .qmd-variable {
                color: var(--qmd-accent);
                font-weight: 600;
            }

            /* File Operations */
            .qmd-include, .qmd-read {
                background-color: rgba(16, 185, 129, 0.1);
                border-left: 4px solid #10b981;
                padding: 0.75rem 1rem;
                margin: 1rem 0;
                border-radius: 0.375rem;
                font-family: monospace;
            }

            .qmd-filename {
                color: #059669;
                font-weight: 600;
            }

            .qmd-lines {
                color: #047857;
                opacity: 0.8;
            }

            /* Document Directives */
            .qmd-theme, .qmd-doctype, .qmd-pageformat {
                background-color: rgba(156, 163, 175, 0.1);
                border-left: 4px solid #9ca3af;
                padding: 0.75rem 1rem;
                margin: 1rem 0;
                border-radius: 0.375rem;
                font-family: monospace;
            }

            .qmd-theme-name, .qmd-doctype-name, .qmd-format {
                color: #6b7280;
                font-weight: 600;
            }

            .qmd-layout, .qmd-orientation {
                color: #4b5563;
                opacity: 0.8;
            }

            /* Layout Functions */
            .qmd-layout {
                background-color: rgba(59, 130, 246, 0.1);
                border-left: 4px solid #3b82f6;
                padding: 0.75rem 1rem;
                margin: 1rem 0;
                border-radius: 0.375rem;
                font-family: monospace;
            }

            .qmd-cols {
                color: #2563eb;
                font-weight: 600;
            }

            /* Math */
            .qmd-math-block {
                margin: 1.5rem 0;
                text-align: center;
                overflow-x: auto;
            }

            .qmd-math-inline {
                display: inline;
            }

            /* Preview Controls */
            .qmd-preview-controls {
                position: fixed;
                top: 1rem;
                right: 1rem;
                background: var(--qmd-bg);
                border: 1px solid var(--qmd-border);
                border-radius: 0.5rem;
                padding: 1rem;
                box-shadow: 0 4px 6px var(--qmd-shadow);
                z-index: 1000;
                font-size: 0.875rem;
                min-width: 200px;
            }

            .qmd-control-group {
                margin-bottom: 0.75rem;
            }

            .qmd-control-group:last-child {
                margin-bottom: 0;
            }

            .qmd-control-label {
                display: block;
                font-weight: 600;
                margin-bottom: 0.25rem;
                color: var(--qmd-text);
            }

            .qmd-control-select, .qmd-control-button {
                width: 100%;
                padding: 0.5rem;
                border: 1px solid var(--qmd-border);
                border-radius: 0.25rem;
                background: var(--qmd-bg);
                color: var(--qmd-text);
                font-size: 0.875rem;
            }

            .qmd-control-button {
                cursor: pointer;
                background: var(--qmd-primary);
                color: white;
                border-color: var(--qmd-primary);
                margin-top: 0.25rem;
            }

            .qmd-control-button:hover {
                opacity: 0.9;
            }

            /* Lists */
            ul, ol {
                margin: 1rem 0;
                padding-left: 2rem;
            }

            li {
                margin: 0.5rem 0;
            }

            /* Links */
            a {
                color: var(--qmd-primary);
                text-decoration: none;
            }

            a:hover {
                text-decoration: underline;
            }

            /* Tables */
            table {
                border-collapse: collapse;
                width: 100%;
                margin: 1.5rem 0;
            }

            th, td {
                border: 1px solid var(--qmd-border);
                padding: 0.75rem;
                text-align: left;
            }

            th {
                background-color: var(--qmd-code-bg);
                font-weight: 600;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .qmd-layout-minimal,
                .qmd-layout-standard,
                .qmd-layout-wide,
                .qmd-layout-narrow {
                    padding: 1rem;
                }

                .qmd-preview-controls {
                    position: relative;
                    top: auto;
                    right: auto;
                    margin-bottom: 1rem;
                }
            }
        `;
    }
    getMathJaxScript() {
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
    getPreviewScript() {
        return `
            const vscode = acquireVsCodeApi();
            
            function updateSettings(updates) {
                vscode.postMessage({
                    command: 'settingsChanged',
                    settings: updates
                });
            }
            
            function changeTheme(theme) {
                document.body.className = document.body.className
                    .replace(/qmd-theme-\\w+/g, '')
                    .trim();
                if (theme) {
                    document.body.classList.add('qmd-theme-' + theme);
                }
                updateSettings({ theme: theme });
            }
            
            function changeLayout(layout) {
                document.body.className = document.body.className
                    .replace(/qmd-layout-\\w+/g, '')
                    .trim();
                document.body.classList.add('qmd-layout-' + layout);
                updateSettings({ layout: layout });
            }
            
            function changeDoctype(doctype) {
                document.documentElement.className = document.documentElement.className
                    .replace(/qmd-doctype-\\w+/g, '')
                    .trim();
                document.documentElement.classList.add('qmd-doctype-' + doctype);
                updateSettings({ doctype: doctype });
            }
            
            function toggleMath() {
                const mathElements = document.querySelectorAll('.qmd-math-block, .qmd-math-inline');
                const isHidden = mathElements[0]?.style.display === 'none';
                mathElements.forEach(el => {
                    el.style.display = isHidden ? '' : 'none';
                });
                updateSettings({ enableMath: isHidden });
            }
            
            function exportPdf() {
                vscode.postMessage({ command: 'exportPdf' });
            }
            
            function exportSlides() {
                vscode.postMessage({ command: 'exportSlides' });
            }
        `;
    }
    getPreviewControls() {
        return `
            <div class="qmd-preview-controls">
                <div class="qmd-control-group">
                    <label class="qmd-control-label">Theme</label>
                    <select class="qmd-control-select" onchange="changeTheme(this.value)">
                        <option value="" ${this._currentSettings.theme === '' ? 'selected' : ''}>Default</option>
                        <option value="darko" ${this._currentSettings.theme === 'darko' ? 'selected' : ''}>Darko</option>
                        <option value="academic" ${this._currentSettings.theme === 'academic' ? 'selected' : ''}>Academic</option>
                    </select>
                </div>
                
                <div class="qmd-control-group">
                    <label class="qmd-control-label">Layout</label>
                    <select class="qmd-control-select" onchange="changeLayout(this.value)">
                        <option value="minimal" ${this._currentSettings.layout === 'minimal' ? 'selected' : ''}>Minimal</option>
                        <option value="standard" ${this._currentSettings.layout === 'standard' ? 'selected' : ''}>Standard</option>
                        <option value="wide" ${this._currentSettings.layout === 'wide' ? 'selected' : ''}>Wide</option>
                        <option value="narrow" ${this._currentSettings.layout === 'narrow' ? 'selected' : ''}>Narrow</option>
                    </select>
                </div>
                
                <div class="qmd-control-group">
                    <label class="qmd-control-label">Document Type</label>
                    <select class="qmd-control-select" onchange="changeDoctype(this.value)">
                        <option value="html" ${this._currentSettings.doctype === 'html' ? 'selected' : ''}>HTML</option>
                        <option value="slides" ${this._currentSettings.doctype === 'slides' ? 'selected' : ''}>Slides</option>
                        <option value="paged" ${this._currentSettings.doctype === 'paged' ? 'selected' : ''}>Paged</option>
                    </select>
                </div>
                
                <div class="qmd-control-group">
                    <button class="qmd-control-button" onclick="toggleMath()">Toggle Math</button>
                    <button class="qmd-control-button" onclick="exportPdf()">Export PDF</button>
                    <button class="qmd-control-button" onclick="exportSlides()">Export Slides</button>
                </div>
            </div>
        `;
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
                    padding: 3rem; 
                    text-align: center; 
                    background: #fafafa;
                    color: #333;
                }
                .spinner {
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #2563eb;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 2rem auto;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .loading-text {
                    color: #6b7280;
                    margin-top: 1rem;
                }
            </style>
        </head>
        <body>
            <div class="spinner"></div>
            <h2>🚀 Loading Quarkdown preview...</h2>
            <p class="loading-text">Preparing your document with enhanced rendering</p>
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
                    padding: 2rem; 
                    background: #fef2f2; 
                    color: #333;
                }
                .error-container {
                    background: white;
                    border: 1px solid #fecaca;
                    border-radius: 0.5rem;
                    padding: 1.5rem;
                    border-left: 4px solid #ef4444;
                    max-width: 800px;
                    margin: 0 auto;
                }
                .error-title {
                    color: #dc2626;
                    margin-top: 0;
                    font-size: 1.25rem;
                }
                .error-message {
                    background: #fef2f2;
                    padding: 1rem;
                    border-radius: 0.25rem;
                    font-family: monospace;
                    margin: 1rem 0;
                    border: 1px solid #fecaca;
                }
                .help-section {
                    margin-top: 1.5rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid #f3f4f6;
                }
                .help-title {
                    color: #374151;
                    font-size: 1rem;
                    margin-bottom: 0.5rem;
                }
                .help-list {
                    color: #6b7280;
                    margin: 0;
                    padding-left: 1.5rem;
                }
                .help-list li {
                    margin: 0.5rem 0;
                }
                .help-link {
                    color: #2563eb;
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
                    <h3 class="help-title">🔧 Troubleshooting Steps:</h3>
                    <ul class="help-list">
                        <li>Install Quarkdown CLI from <a href="https://github.com/iamgio/quarkdown/releases" class="help-link">GitHub Releases</a></li>
                        <li>Ensure Java 17+ is installed and in your PATH</li>
                        <li>Verify Quarkdown is accessible: <code>quarkdown --version</code></li>
                        <li>Check your Quarkdown syntax for errors</li>
                        <li>Try reloading the VS Code window</li>
                    </ul>
                </div>
                
                <div class="help-section">
                    <h3 class="help-title">📚 Resources:</h3>
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
    async exportToPdf(document) {
        const { exportToPdf } = await Promise.resolve().then(() => require('./exportUtils'));
        exportToPdf(document);
    }
    async exportToSlides(document) {
        const { exportToSlides } = await Promise.resolve().then(() => require('./exportUtils'));
        exportToSlides(document);
    }
}
exports.AccurateQuarkdownPreviewProvider = AccurateQuarkdownPreviewProvider;
//# sourceMappingURL=accuratePreviewProvider.js.map