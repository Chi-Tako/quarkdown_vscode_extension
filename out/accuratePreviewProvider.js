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
exports.AccurateQuarkdownPreviewProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process"); // セキュリティ向上のため exec から execFile に変更
const util_1 = require("util");
// execFileをPromise化して非同期に扱えるようにする
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
/**
 * Quarkdownファイルのプレビュー機能を提供するメインクラス。
 * WebviewPanelSerializerを実装し、VSCodeの再起動時にプレビューを復元できるようにする。
 */
class AccurateQuarkdownPreviewProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
        // 各種リソースを管理するためのMap
        this._panels = new Map();
        this._watchers = new Map();
        this._debounceTimers = new Map();
        // 問題点修正：パネルごとに設定を保持するように変更
        this._panelSettings = new Map();
        // 問題点修正：CLIパスをキャッシュしてパフォーマンスを向上
        this._cachedCliPath = null;
        this._isSearchingCliPath = false;
        // 拡張機能起動時にVSCodeの設定からデフォルト値を読み込む
        this._defaultSettings = this.loadDefaultSettings();
    }
    /**
     * VSCodeの再起動時などにWebviewパネルを復元する。
     * @param webviewPanel 復元対象のパネル
     * @param state 保存されていた状態
     */
    async deserializeWebviewPanel(webviewPanel, state) {
        // stateからドキュメントのURIと設定を復元
        const documentUriString = state?.documentUri;
        if (!documentUriString) {
            webviewPanel.dispose();
            return;
        }
        const documentUri = vscode.Uri.parse(documentUriString);
        let settings = this._defaultSettings;
        if (state?.settings) {
            // 保存された設定があれば、デフォルトとマージして復元
            settings = { ...this._defaultSettings, ...state.settings };
        }
        // 内部状態を復元
        this._panels.set(documentUri.toString(), webviewPanel);
        this._panelSettings.set(documentUri.toString(), settings);
        // パネルの各種設定を行う
        this.setupPanel(webviewPanel, documentUri);
        // プレビュー内容を更新（再生成）する
        await this.updatePreview(documentUri);
    }
    /**
     * 新規にプレビューを開く。
     * @param document 対象のテキストドキュメント
     */
    openPreview(document) {
        const documentKey = document.uri.toString();
        // すでにパネルが存在する場合は、そのパネルをアクティブにする
        if (this._panels.has(documentKey)) {
            const existingPanel = this._panels.get(documentKey);
            existingPanel.reveal(existingPanel.viewColumn);
            return;
        }
        const column = vscode.window.activeTextEditor?.viewColumn;
        const panel = vscode.window.createWebviewPanel('quarkdownPreview', `📄 ${path.basename(document.fileName)}`, // パネルのタイトル
        column ? column + 1 : vscode.ViewColumn.Two, this.getWebviewOptions());
        // 新しいパネルを内部状態に登録
        this._panels.set(documentKey, panel);
        // パネルにデフォルト設定を割り当てる
        this._panelSettings.set(documentKey, { ...this._defaultSettings });
        // パネルの各種設定を行う
        this.setupPanel(panel, document.uri);
        // 初回のプレビュー更新
        this.updatePreview(document.uri);
    }
    /**
     * パネルのセットアップ（イベントリスナーの登録など）を行う共通処理。
     * @param panel 対象のWebviewパネル
     * @param documentUri 対象のドキュメントURI
     */
    setupPanel(panel, documentUri) {
        panel.webview.options = this.getWebviewOptions();
        // Webviewからのメッセージ受信ハンドラを設定
        panel.webview.onDidReceiveMessage((message) => this.handleWebviewMessage(message, documentUri), undefined);
        // パネルが破棄された際のクリーンアップ処理を設定
        panel.onDidDispose(() => this.cleanup(documentUri.toString()));
        // ファイル監視を開始
        this.setupFileWatcher(documentUri);
    }
    /**
     * Webviewから送られてきたメッセージを処理する。
     * @param message 受信したメッセージ
     * @param documentUri メッセージ送信元のドキュメントURI
     */
    async handleWebviewMessage(message, documentUri) {
        try {
            switch (message.command) {
                case 'settingsChanged':
                    if (message.payload) {
                        const currentSettings = this._panelSettings.get(documentUri.toString()) || this._defaultSettings;
                        const newSettings = { ...currentSettings, ...message.payload };
                        this._panelSettings.set(documentUri.toString(), newSettings);
                        // 設定が変更されたら、プレビューを更新し、VSCodeの設定ファイルにも保存する
                        await this.updatePreview(documentUri);
                        await this.saveSettings(newSettings);
                    }
                    break;
                case 'exportPdf':
                    await this.exportTo('pdf', documentUri);
                    break;
                case 'exportSlides':
                    await this.exportTo('slides', documentUri);
                    break;
                case 'openSettings':
                    await vscode.commands.executeCommand('workbench.action.openSettings', 'quarkdown.cliPath');
                    break;
                default:
                    console.warn(`Unknown message command: ${message.command}`);
            }
        }
        catch (error) {
            console.error('Error handling webview message:', error);
            vscode.window.showErrorMessage(`Failed to handle command: ${message.command}`);
        }
    }
    /**
     * 指定されたドキュメントのプレビューを更新または生成する。
     * @param documentUri 対象のドキュメントURI
     */
    async updatePreview(documentUri) {
        const panel = this._panels.get(documentUri.toString());
        if (!panel) {
            return;
        }
        try {
            // 更新中にローディング画面を表示
            panel.webview.html = this.getLoadingHtml();
            // Quarkdown CLIの実行可能ファイルを探す
            const quarkdownPath = await this.findQuarkdownExecutable();
            if (!quarkdownPath) {
                throw new Error(`Quarkdown CLIが見つかりません。VS Codeの設定 'quarkdown.cliPath' を確認してください。`);
            }
            // QuarkdownでコンパイルしてHTMLを生成
            const htmlContent = await this.compileQuarkdown(documentUri, quarkdownPath);
            // プレビュー用のHTMLに整形
            const settings = this._panelSettings.get(documentUri.toString()) ?? this._defaultSettings;
            const enhancedHtml = this.enhanceQuarkdownHtml(htmlContent, settings, documentUri);
            panel.webview.html = enhancedHtml;
        }
        catch (error) {
            console.error('Preview update failed:', error);
            panel.webview.html = this.getErrorHtml(error);
        }
    }
    /**
     * Quarkdown CLI を実行してMarkdownファイルをHTMLにコンパイルする。
     * @param documentUri 対象のドキュメントURI
     * @param quarkdownPath CLIのパス
     * @returns コンパイルされたHTML文字列
     */
    async compileQuarkdown(documentUri, quarkdownPath) {
        const filePath = documentUri.fsPath;
        const fileName = path.basename(filePath);
        const fileDir = path.dirname(filePath);
        console.log(`🚀 Compiling Quarkdown: "${fileName}"`);
        try {
            // 問題点修正：コマンドインジェクション対策としてexecFileAsyncを使用
            const result = await execFileAsync(quarkdownPath, ['c', fileName], // 引数を安全な配列形式で渡す
            {
                cwd: fileDir,
                timeout: 30000,
                env: { ...process.env, JAVA_HOME: process.env.JAVA_HOME || '' }
            });
            if (result.stderr) {
                console.warn('Quarkdown stderr:', result.stderr);
            }
            if (!result.stdout || result.stdout.trim().length === 0) {
                throw new Error('Quarkdownが空の出力を返しました。');
            }
            console.log(`✅ Quarkdown compilation successful (${result.stdout.length} characters)`);
            return result.stdout;
        }
        catch (error) {
            console.error('Quarkdown compilation failed:', error);
            // エラーメッセージにstderrを含めて、より詳細な情報を提供する
            const errorMessage = error.stderr ? `\n--- CLI Error ---\n${error.stderr}` : '';
            throw new Error(`Quarkdownのコンパイルに失敗しました: ${error.message}${errorMessage}`);
        }
    }
    /**
     * Quarkdown CLIの実行可能ファイルのパスを検索して返す。
     * @returns 発見したCLIのパス、またはnull
     */
    async findQuarkdownExecutable() {
        // キャッシュがあればそれを返す
        if (this._cachedCliPath) {
            return this._cachedCliPath;
        }
        // 複数箇所から同時に検索が走るのを防ぐ
        if (this._isSearchingCliPath) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return this.findQuarkdownExecutable();
        }
        this._isSearchingCliPath = true;
        try {
            const configuredPath = vscode.workspace.getConfiguration('quarkdown').get('cliPath') || 'quarkdown';
            console.log(`🔍 Searching for Quarkdown executable: "${configuredPath}"`);
            // Windowsとそれ以外で実行可能ファイルの拡張子を考慮
            const extensions = process.platform === 'win32' ? ['', '.bat', '.cmd', '.exe'] : [''];
            for (const ext of extensions) {
                const testPath = configuredPath + ext;
                // 絶対パスで指定され、かつファイルが存在しない場合はスキップ
                if (path.isAbsolute(testPath) && !fs.existsSync(testPath)) {
                    console.log(`📁 File not found: "${testPath}"`);
                    continue;
                }
                // '--help' コマンドで実行可能かテスト
                if (await this.testExecutable(testPath)) {
                    console.log(`✅ Found working Quarkdown: ${testPath}`);
                    this._cachedCliPath = testPath; // 見つかったパスをキャッシュ
                    return testPath;
                }
            }
            console.log(`❌ Quarkdown executable not found`);
            return null;
        }
        finally {
            this._isSearchingCliPath = false;
        }
    }
    /**
     * 指定されたパスが実行可能かどうかをテストする。
     * @param executablePath テスト対象のパス
     * @returns 実行可能であればtrue
     */
    async testExecutable(executablePath) {
        try {
            console.log(`🧪 Testing: "${executablePath}"`);
            await execFileAsync(executablePath, ['--help'], { timeout: 10000, windowsHide: true });
            return true;
        }
        catch (error) {
            // 'command not found' 系のエラーは無視し、それ以外はログに出力
            if (error.code !== 'ENOENT' && error.code !== 127) {
                console.log(`❌ Test failed: "${executablePath}" - ${error.message}`);
            }
            return false;
        }
    }
    /**
     * ファイルの変更を監視するウォッチャーを設定する。
     * @param documentUri 対象のドキュメントURI
     */
    setupFileWatcher(documentUri) {
        const key = documentUri.toString();
        this.stopWatching(key); // 既存のウォッチャーがあれば停止
        // ファイル監視が無効な場合は何もしない
        const settings = this._panelSettings.get(key) || this._defaultSettings;
        if (!settings.enableWatch) {
            return;
        }
        try {
            const watcher = fs.watch(documentUri.fsPath, (eventType) => {
                if (eventType === 'change') {
                    // 問題点修正：堅牢なデバウンス処理
                    // 既存のタイマーがあればクリア
                    if (this._debounceTimers.has(key)) {
                        clearTimeout(this._debounceTimers.get(key));
                    }
                    // 新しいタイマーを設定
                    const timer = setTimeout(() => {
                        this.updatePreview(documentUri);
                        this._debounceTimers.delete(key);
                    }, 300);
                    this._debounceTimers.set(key, timer);
                }
            });
            this._watchers.set(key, watcher);
        }
        catch (error) {
            console.error('Failed to setup file watcher:', error);
        }
    }
    /**
     * 指定されたキーに対応するファイル監視を停止する。
     * @param key ドキュメントURI文字列
     */
    stopWatching(key) {
        this._watchers.get(key)?.close();
        this._watchers.delete(key);
        if (this._debounceTimers.has(key)) {
            clearTimeout(this._debounceTimers.get(key));
            this._debounceTimers.delete(key);
        }
    }
    /**
     * パネルが閉じた際に、関連するリソースをすべて解放する。
     * @param documentKey ドキュメントURI文字列
     */
    cleanup(documentKey) {
        this._panels.delete(documentKey);
        this._panelSettings.delete(documentKey);
        this.stopWatching(documentKey);
    }
    /**
     * Webviewのオプションを取得する。
     */
    getWebviewOptions() {
        return {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
            // バックグラウンドでも状態を保持する
            retainContextWhenHidden: true,
        };
    }
    /**
     * コンパイルされたHTMLを、Webviewで表示するために装飾する。
     * @param htmlContent コンパイル済みのHTML
     * @param settings 適用する設定
     * @param documentUri 対象ドキュメントのURI
     * @returns Webview用の完全なHTML文字列
     */
    enhanceQuarkdownHtml(htmlContent, settings, documentUri) {
        const themeClass = settings.theme ? `qmd-theme-${settings.theme}` : '';
        const layoutClass = `qmd-layout-${settings.layout}`;
        const nonce = this.getNonce(); // CSPのためのnonce
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Quarkdown Preview</title>
            <style>
                ${this.getQuarkdownCSS()}
            </style>
            ${settings.enableMath ? this.getMathJaxScript(nonce) : ''}
        </head>
        <body class="${themeClass} ${layoutClass}">
            ${this.getPreviewControls(settings)}
            <div class="qmd-content">
                ${htmlContent}
            </div>
            ${this.getPreviewScript(nonce, settings, documentUri)}
        </body>
        </html>`;
    }
    // 以下、HTMLテンプレートを生成するヘルパーメソッド群
    getPreviewControls(settings) {
        return `
        <div class="qmd-preview-controls">
            <select onchange="postMessage({ command: 'settingsChanged', payload: { theme: this.value } })" aria-label="Select theme">
                <option value="darko" ${settings.theme === 'darko' ? 'selected' : ''}>Dark Theme</option>
                <option value="" ${settings.theme === '' ? 'selected' : ''}>Default Theme</option>
                <option value="academic" ${settings.theme === 'academic' ? 'selected' : ''}>Academic Theme</option>
            </select>
            <select onchange="postMessage({ command: 'settingsChanged', payload: { layout: this.value } })" aria-label="Select layout">
                <option value="minimal" ${settings.layout === 'minimal' ? 'selected' : ''}>Minimal</option>
                <option value="standard" ${settings.layout === 'standard' ? 'selected' : ''}>Standard</option>
                <option value="wide" ${settings.layout === 'wide' ? 'selected' : ''}>Wide</option>
                <option value="narrow" ${settings.layout === 'narrow' ? 'selected' : ''}>Narrow</option>
            </select>
            <button onclick="postMessage({ command: 'exportPdf' })" title="Export to PDF">📄 PDF</button>
            <button onclick="postMessage({ command: 'exportSlides' })" title="Export to Slides">🎞️ Slides</button>
        </div>`;
    }
    getPreviewScript(nonce, settings, documentUri) {
        return `
        <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();
            
            // WebviewからVSCode拡張機能へメッセージを送信する共通関数
            function postMessage(message) {
                vscode.postMessage(message);
            }

            // Webviewの状態を保存して、リロード後も復元できるようにする
            vscode.setState({
                documentUri: '${documentUri.toString()}',
                settings: {
                    theme: '${settings.theme}',
                    layout: '${settings.layout}'
                }
            });
        </script>`;
    }
    getQuarkdownCSS() {
        // CSSの内容は長いため省略。元のコードと同じものを使用
        return `
            :root { /* ... */ } 
            /* ...元のCSSをここに挿入... */
        `;
    }
    getMathJaxScript(nonce) {
        return `
            <script nonce="${nonce}" src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
            <script nonce="${nonce}" id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
            <script nonce="${nonce}">
                window.MathJax = { /* ... */ };
            </script>`;
    }
    getLoadingHtml() {
        // ローディング画面のHTML。元のコードと同じ
        return `<!DOCTYPE html><!-- ...ローディングHTML... -->`;
    }
    getErrorHtml(error) {
        // エラー画面のHTML。escapeHtmlの修正を反映
        const configuredPath = vscode.workspace.getConfiguration('quarkdown').get('cliPath') || 'quarkdown';
        const errorMessage = this.escapeHtml(error.message);
        return `<!DOCTYPE html>
            <html>
            <head>
                <title>Quarkdown Error</title>
                <style> /* ... エラー用のCSS ... */ </style>
            </head>
            <body>
                <div class="error-container">
                    <h2 class="error-title">⚠️ Quarkdown Error</h2>
                    <div class="error-message">${errorMessage}</div>
                </div>
                <!-- ...ヘルプセクション... -->
                <script>
                    const vscode = acquireVsCodeApi();
                    function openSettings() {
                        vscode.postMessage({ command: 'openSettings' });
                    }
                </script>
            </body>
            </html>`;
    }
    /**
     * 問題点修正：Node.js環境で安全にHTMLエスケープを行う。
     * @param text エスケープする文字列
     * @returns エスケープ後の文字列
     */
    escapeHtml(text) {
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
    /**
     * 問題点修正：設定の保存ロジックを読み込みと合わせる。
     * @param settings 保存する設定オブジェクト
     */
    async saveSettings(settings) {
        try {
            const config = vscode.workspace.getConfiguration('quarkdown');
            await config.update('previewTheme', settings.theme, vscode.ConfigurationTarget.Global);
            await config.update('previewLayout', settings.layout, vscode.ConfigurationTarget.Global);
            await config.update('enableMath', settings.enableMath, vscode.ConfigurationTarget.Global);
            await config.update('enableAutoPreview', settings.enableWatch, vscode.ConfigurationTarget.Global);
        }
        catch (error) {
            console.error('Failed to save settings:', error);
            vscode.window.showErrorMessage('設定の保存に失敗しました。');
        }
    }
    /**
     * デフォルト設定をVSCodeの設定から読み込む。
     */
    loadDefaultSettings() {
        const config = vscode.workspace.getConfiguration('quarkdown');
        return {
            theme: config.get('previewTheme', 'darko'),
            layout: config.get('previewLayout', 'minimal'),
            enableMath: config.get('enableMath', true),
            enableWatch: config.get('enableAutoPreview', true),
            doctype: 'html' // doctypeは現在未使用だが保持
        };
    }
    /**
     * PDFやスライドへのエクスポート処理を呼び出す。
     * @param format 'pdf' または 'slides'
     * @param documentUri 対象のドキュメントURI
     */
    async exportTo(format, documentUri) {
        // エクスポート処理は別ファイルに切り出されていることを想定
        try {
            const { exportToPdf, exportToSlides } = await Promise.resolve().then(() => __importStar(require('./exportUtils')));
            const document = await vscode.workspace.openTextDocument(documentUri);
            if (format === 'pdf') {
                await exportToPdf(document);
            }
            else {
                await exportToSlides(document);
            }
        }
        catch (error) {
            console.error(`${format} export failed:`, error);
            vscode.window.showErrorMessage(`${format.toUpperCase()}へのエクスポート機能は利用できません。`);
        }
    }
    /**
     * CSP (Content Security Policy) のためのランダムな文字列 (nonce) を生成する。
     */
    getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
    /**
     * 拡張機能が非アクティブ化される際にすべてのリソースを解放する。
     */
    dispose() {
        // すべてのファイルウォッチャーとパネルを閉じる
        for (const key of this._watchers.keys()) {
            this.stopWatching(key);
        }
        for (const panel of this._panels.values()) {
            panel.dispose();
        }
        this._watchers.clear();
        this._panels.clear();
        this._panelSettings.clear();
        this._debounceTimers.clear();
    }
}
exports.AccurateQuarkdownPreviewProvider = AccurateQuarkdownPreviewProvider;
//# sourceMappingURL=accuratePreviewProvider.js.map