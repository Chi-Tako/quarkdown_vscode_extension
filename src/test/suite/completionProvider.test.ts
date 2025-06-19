import * as assert from 'assert';
import * as vscode from 'vscode';
import { QuarkdownCompletionProvider, QuarkdownHoverProvider } from '../../completionProvider';

suite('Completion Provider Tests', () => {
    let completionProvider: QuarkdownCompletionProvider;
    let hoverProvider: QuarkdownHoverProvider;

    setup(() => {
        completionProvider = new QuarkdownCompletionProvider();
        hoverProvider = new QuarkdownHoverProvider();
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
        const mockDocument: vscode.TextDocument = {
            uri: mockUri,
            languageId: 'quarkdown',
            version: 1,
            lineCount: 1,
            getText: () => '{',
            lineAt: () => ({ text: '{', range: new vscode.Range(0, 0, 0, 1) }),
        } as any;

        const position = new vscode.Position(0, 1);
        const result = await completionProvider.provideCompletionItems(
            mockDocument, 
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );

        assert.ok(result);
        if (result instanceof Array) {
            assert.ok(result.length > 0, 'Should return completion items');
        } else if (result) {
            assert.ok(result.items.length > 0, 'Should return completion items');
        }
    });
});