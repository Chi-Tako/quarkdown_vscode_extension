import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Running Quarkdown extension tests');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('quarkdown.quarkdown-vscode'));
    });

    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('quarkdown.quarkdown-vscode');
        if (extension) {
            await extension.activate();
            assert.strictEqual(extension.isActive, true);
        } else {
            assert.fail('Extension not found');
        }
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands();
        
        const expectedCommands = [
            'quarkdown.preview',
            'quarkdown.exportPdf',
            'quarkdown.exportSlides',
            'quarkdown.createProject',
            'quarkdown.addChapter',
            'quarkdown.addLibraryFile',
            'quarkdown.insertFunction',
            'quarkdown.insertVariable',
            'quarkdown.openSettings',
            'quarkdown.showWelcome'
        ];

        for (const cmd of expectedCommands) {
            assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`);
        }
    });

    test('Language should be registered', () => {
        const languages = vscode.languages.getLanguages();
        return languages.then((langs) => {
            assert.ok(langs.includes('quarkdown'), 'Quarkdown language should be registered');
        });
    });
});