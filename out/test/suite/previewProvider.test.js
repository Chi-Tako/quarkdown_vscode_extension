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
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const accuratePreviewProvider_1 = require("../../accuratePreviewProvider");
suite('Preview Provider Tests', () => {
    let previewProvider;
    let extensionUri;
    setup(() => {
        extensionUri = vscode.Uri.file(__dirname);
        previewProvider = new accuratePreviewProvider_1.AccurateQuarkdownPreviewProvider(extensionUri);
    });
    teardown(() => {
        if (previewProvider) {
            previewProvider.dispose();
        }
    });
    test('Preview provider should be created', () => {
        assert.ok(previewProvider);
        assert.ok(typeof previewProvider.openPreview === 'function');
        assert.ok(typeof previewProvider.updatePreview === 'function');
        assert.ok(typeof previewProvider.dispose === 'function');
    });
    test('Preview provider should handle document opening', async () => {
        // Create a mock document
        const mockUri = vscode.Uri.parse('test:test.qmd');
        const mockDocument = {
            uri: mockUri,
            languageId: 'quarkdown',
            version: 1,
            lineCount: 1,
            getText: () => '# Test Document\\n\\nThis is a test.',
            fileName: 'test.qmd'
        };
        // Test that openPreview doesn't throw an error
        assert.doesNotThrow(() => {
            previewProvider.openPreview(mockDocument);
        });
    });
    test('Preview provider should handle serialization interface', () => {
        assert.ok(typeof previewProvider.deserializeWebviewPanel === 'function');
    });
});
//# sourceMappingURL=previewProvider.test.js.map