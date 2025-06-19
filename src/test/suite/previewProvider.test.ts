import * as assert from 'assert';
import * as vscode from 'vscode';
import { AccurateQuarkdownPreviewProvider } from '../../accuratePreviewProvider';

suite('Preview Provider Tests', () => {
    let previewProvider: AccurateQuarkdownPreviewProvider;
    let extensionUri: vscode.Uri;

    setup(() => {
        extensionUri = vscode.Uri.file(__dirname);
        previewProvider = new AccurateQuarkdownPreviewProvider(extensionUri);
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
        const mockDocument: vscode.TextDocument = {
            uri: mockUri,
            languageId: 'quarkdown',
            version: 1,
            lineCount: 1,
            getText: () => '# Test Document\\n\\nThis is a test.',
            fileName: 'test.qmd'
        } as any;

        // Test that openPreview doesn't throw an error
        assert.doesNotThrow(() => {
            previewProvider.openPreview(mockDocument);
        });
    });

    test('Preview provider should handle serialization interface', () => {
        assert.ok(typeof previewProvider.deserializeWebviewPanel === 'function');
    });
});