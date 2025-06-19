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
const completionProvider_1 = require("../../completionProvider");
suite('Completion Provider Tests', () => {
    let completionProvider;
    let hoverProvider;
    setup(() => {
        completionProvider = new completionProvider_1.QuarkdownCompletionProvider();
        hoverProvider = new completionProvider_1.QuarkdownHoverProvider();
    });
    test('Completion provider should exist', () => {
        assert.ok(completionProvider);
        assert.ok(typeof completionProvider.provideCompletionItems === 'function');
    });
    test('Hover provider should exist', () => {
        assert.ok(hoverProvider);
        assert.ok(typeof hoverProvider.provideHover === 'function');
    });
    test('Completion provider should handle basic items', async () => {
        // Create a mock document
        const mockUri = vscode.Uri.parse('test:test.qmd');
        const mockDocument = {
            uri: mockUri,
            languageId: 'quarkdown',
            version: 1,
            lineCount: 1,
            getText: () => '{',
            lineAt: () => ({ text: '{', range: new vscode.Range(0, 0, 0, 1) }),
        };
        const position = new vscode.Position(0, 1);
        const result = await completionProvider.provideCompletionItems(mockDocument, position, {}, {});
        assert.ok(result);
        if (result instanceof Array) {
            assert.ok(result.length > 0, 'Should return completion items');
        }
        else if (result) {
            assert.ok(result.items.length > 0, 'Should return completion items');
        }
    });
});
//# sourceMappingURL=completionProvider.test.js.map