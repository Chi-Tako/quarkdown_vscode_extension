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
exports.QuarkdownPreviewProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class QuarkdownPreviewProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
        this._panels = new Map();
    }
    async deserializeWebviewPanel(webviewPanel, state) {
        webviewPanel.webview.options = this.getWebviewOptions();
        webviewPanel.webview.html = this.getLoadingHtml();
    }
    openPreview(document) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        const panel = vscode.window.createWebviewPanel('quarkdownPreview', `Preview: ${path.basename(document.fileName)}`, column ? column + 1 : vscode.ViewColumn.Two, this.getWebviewOptions());
        this._panels.set(document.uri.toString(), panel);
        panel.onDidDispose(() => {
            this._panels.delete(document.uri.toString());
        });
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
    getWebviewOptions() {
        return {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
    }
    async renderQuarkdown(document) {
        const content = document.getText();
        // Check if Quarkdown CLI is available
        try {
            await execAsync('quarkdown --version');
        }
        catch (error) {
            return this.getFallbackHtml(content);
        }
        // Use Quarkdown CLI to render the document
        const tempFile = path.join(__dirname, 'temp.qmd');
        const fs = require('fs');
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
        // Simple fallback rendering for basic Markdown + Quarkdown syntax highlighting
        const processedContent = content
            .replace(/^#{1,6}\s+(.*)$/gm, (match, p1) => {
            const level = match.indexOf(' ');
            return `<h${level}>${p1}</h${level}>`;
        })
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\\.function\s+\{([^}]+)\}/g, '<span class="qmd-function">Function: $1</span>')
            .replace(/\\.var\s+\{([^}]+)\}\s+(.*)/g, '<span class="qmd-variable">Variable $1 = $2</span>')
            .replace(/\\.([a-zA-Z_][a-zA-Z0-9_]*)/g, '<span class="qmd-reference">.$1</span>')
            .replace(/\n/g, '<br>');
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
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe WPC', 'Segoe UI', system-ui, 'Ubuntu', 'Droid Sans', sans-serif;
                    font-size: 14px;
                    padding: 20px;
                    line-height: 1.6;
                    word-wrap: break-word;
                }
                h1, h2, h3, h4, h5, h6 {
                    font-weight: normal;
                }
                h1 { border-bottom: 1px solid #ccc; }
                h2 { border-bottom: 1px solid #eee; }
                code {
                    background-color: rgba(220, 220, 220, 0.5);
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                }
                .qmd-function {
                    background-color: #e1f5fe;
                    padding: 2px 6px;
                    border-radius: 4px;
                    border-left: 4px solid #0277bd;
                    display: inline-block;
                    margin: 2px 0;
                    font-weight: bold;
                    color: #01579b;
                }
                .qmd-variable {
                    background-color: #f3e5f5;
                    padding: 2px 6px;
                    border-radius: 4px;
                    border-left: 4px solid #7b1fa2;
                    display: inline-block;
                    margin: 2px 0;
                    font-weight: bold;
                    color: #4a148c;
                }
                .qmd-reference {
                    color: #d81b60;
                    font-weight: bold;
                }
                pre {
                    background-color: #f6f8fa;
                    border-radius: 6px;
                    padding: 16px;
                    overflow: auto;
                }
                blockquote {
                    margin: 0 0 16px 0;
                    padding: 0 1em;
                    color: #6a737d;
                    border-left: 0.25em solid #dfe2e5;
                }
            </style>
            <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
            <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
            <script>
                window.MathJax = {
                    tex: {
                        inlineMath: [['$', '$'], ['\\(', '\\)']],
                        displayMath: [['$$', '$$'], ['\\[', '\\]']],
                        processEscapes: true,
                        processEnvironments: true
                    },
                    options: {
                        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
                    }
                };
            </script>
        </head>
        <body>
            ${content}
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
        </head>
        <body>
            <h2>Loading Quarkdown preview...</h2>
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
        </head>
        <body>
            <h2>Error rendering Quarkdown</h2>
            <p><strong>Error:</strong> ${error.message}</p>
            <p>Make sure Quarkdown CLI is installed and available in your PATH.</p>
            <p>You can download it from: <a href="https://github.com/jjallaire/quarkdown/releases">Quarkdown Releases</a></p>
        </body>
        </html>`;
    }
}
exports.QuarkdownPreviewProvider = QuarkdownPreviewProvider;
//# sourceMappingURL=previewProvider.js.map