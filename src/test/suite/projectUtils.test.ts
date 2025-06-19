import * as assert from 'assert';
import * as vscode from 'vscode';
import { getProjectCommands } from '../../projectUtils';

suite('Project Utils Tests', () => {
    test('Project commands should be available', () => {
        const commands = getProjectCommands();
        assert.ok(commands);
        assert.ok(Array.isArray(commands) || typeof commands === 'object');
    });

    test('getProjectCommands should return valid structure', () => {
        const commands = getProjectCommands();
        assert.ok(commands !== null);
        assert.ok(commands !== undefined);
    });
});