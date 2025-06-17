"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuarkdownHoverProvider = exports.QuarkdownCompletionProvider = void 0;
const vscode = require("vscode");
const quarkdownLibrary_1 = require("./quarkdownLibrary");
class QuarkdownCompletionProvider {
    provideCompletionItems(document, position, token, context) {
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        // Check if we're in a function call context
        if (linePrefix.endsWith('.')) {
            return this.provideFunctionCompletions();
        }
        // Check if we're in a theme context
        if (linePrefix.includes('.theme {') && !linePrefix.includes('}')) {
            return this.provideThemeCompletions();
        }
        // Check if we're in a layout context
        if (linePrefix.includes('layout:{') && !linePrefix.includes('}')) {
            return this.provideLayoutCompletions();
        }
        // Check if we're in a doctype context  
        if (linePrefix.includes('.doctype {') && !linePrefix.includes('}')) {
            return this.provideDoctypeCompletions();
        }
        // Check if we're completing parameters
        const functionMatch = linePrefix.match(/\.(\w+)\s*\{[^}]*$/);
        if (functionMatch) {
            const functionName = functionMatch[1];
            return this.provideParameterCompletions(functionName);
        }
        return [];
    }
    provideFunctionCompletions() {
        return quarkdownLibrary_1.QUARKDOWN_FUNCTIONS.map(func => {
            const item = new vscode.CompletionItem(func.name, vscode.CompletionItemKind.Function);
            item.detail = `${func.category} - ${func.description}`;
            item.documentation = new vscode.MarkdownString();
            // Add function signature
            const params = func.parameters.map(p => p.optional ? `{${p.name}?}` : `{${p.name}}`).join(' ');
            item.documentation.appendCodeblock(`${func.name} ${params}`, 'quarkdown');
            // Add description
            item.documentation.appendMarkdown(`\n${func.description}\n\n`);
            // Add parameters documentation
            if (func.parameters.length > 0) {
                item.documentation.appendMarkdown('**Parameters:**\n');
                func.parameters.forEach(param => {
                    const optional = param.optional ? ' *(optional)*' : '';
                    const defaultVal = param.defaultValue ? ` (default: ${param.defaultValue})` : '';
                    item.documentation.appendMarkdown(`- **${param.name}** (${param.type})${optional}${defaultVal}: ${param.description}\n`);
                });
                item.documentation.appendMarkdown('\n');
            }
            // Add examples
            if (func.examples.length > 0) {
                item.documentation.appendMarkdown('**Examples:**\n');
                func.examples.forEach(example => {
                    item.documentation.appendCodeblock(example, 'quarkdown');
                });
            }
            // Set insert text with parameters
            if (func.parameters.length > 0) {
                const requiredParams = func.parameters.filter(p => !p.optional);
                if (requiredParams.length > 0) {
                    const paramSnippet = requiredParams.map((param, index) => `{$${index + 1}:${param.name}}`).join(' ');
                    item.insertText = new vscode.SnippetString(`${func.name} ${paramSnippet}`);
                }
                else {
                    item.insertText = func.name;
                }
            }
            else {
                item.insertText = func.name;
            }
            // Set sort text for proper ordering
            item.sortText = `${func.category}-${func.name}`;
            return item;
        });
    }
    provideThemeCompletions() {
        return quarkdownLibrary_1.QUARKDOWN_THEMES.map(theme => {
            const item = new vscode.CompletionItem(theme, vscode.CompletionItemKind.Value);
            item.detail = `Quarkdown Theme`;
            item.documentation = `Apply the ${theme} theme to the document`;
            return item;
        });
    }
    provideLayoutCompletions() {
        return quarkdownLibrary_1.QUARKDOWN_LAYOUTS.map(layout => {
            const item = new vscode.CompletionItem(layout, vscode.CompletionItemKind.Value);
            item.detail = `Layout Option`;
            item.documentation = `Use the ${layout} layout style`;
            return item;
        });
    }
    provideDoctypeCompletions() {
        return quarkdownLibrary_1.QUARKDOWN_DOCTYPES.map(doctype => {
            const item = new vscode.CompletionItem(doctype, vscode.CompletionItemKind.Value);
            item.detail = `Document Type`;
            let description = '';
            switch (doctype) {
                case 'slides':
                    description = 'Create a slide presentation using reveal.js';
                    break;
                case 'paged':
                    description = 'Create a paged document suitable for printing';
                    break;
                case 'book':
                    description = 'Create a multi-chapter book format';
                    break;
                case 'article':
                    description = 'Create a standard article format';
                    break;
                case 'report':
                    description = 'Create a formal report format';
                    break;
            }
            item.documentation = description;
            return item;
        });
    }
    provideParameterCompletions(functionName) {
        const func = (0, quarkdownLibrary_1.getFunctionByName)(functionName);
        if (!func) {
            return [];
        }
        return func.parameters.map(param => {
            const item = new vscode.CompletionItem(param.name, vscode.CompletionItemKind.Variable);
            item.detail = `${param.type}${param.optional ? ' (optional)' : ''}`;
            item.documentation = param.description;
            if (param.defaultValue) {
                item.documentation += `\n\nDefault: ${param.defaultValue}`;
            }
            // For named parameters, insert the parameter name with colon
            if (func.name === 'theme' || func.name === 'pageformat' || func.name === 'slides') {
                item.insertText = new vscode.SnippetString(`${param.name}:{$1}`);
            }
            return item;
        });
    }
}
exports.QuarkdownCompletionProvider = QuarkdownCompletionProvider;
class QuarkdownHoverProvider {
    provideHover(document, position, token) {
        const range = document.getWordRangeAtPosition(position, /\.(\w+)/);
        if (!range) {
            return;
        }
        const word = document.getText(range);
        const functionName = word.substring(1); // Remove the dot
        const func = (0, quarkdownLibrary_1.getFunctionByName)(functionName);
        if (!func) {
            return;
        }
        const markdown = new vscode.MarkdownString();
        markdown.appendCodeblock(`${func.name}`, 'quarkdown');
        markdown.appendMarkdown(`\n**${func.category}** - ${func.description}\n\n`);
        if (func.parameters.length > 0) {
            markdown.appendMarkdown('**Parameters:**\n');
            func.parameters.forEach(param => {
                const optional = param.optional ? ' *(optional)*' : '';
                const defaultVal = param.defaultValue ? ` (default: ${param.defaultValue})` : '';
                markdown.appendMarkdown(`- **${param.name}** (${param.type})${optional}${defaultVal}: ${param.description}\n`);
            });
            markdown.appendMarkdown('\n');
        }
        if (func.examples.length > 0) {
            markdown.appendMarkdown('**Examples:**\n');
            func.examples.forEach(example => {
                markdown.appendCodeblock(example, 'quarkdown');
            });
        }
        return new vscode.Hover(markdown, range);
    }
}
exports.QuarkdownHoverProvider = QuarkdownHoverProvider;
//# sourceMappingURL=completionProvider.js.map