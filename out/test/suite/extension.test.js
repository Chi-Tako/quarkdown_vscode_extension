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
        }
        else {
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
//# sourceMappingURL=extension.test.js.map