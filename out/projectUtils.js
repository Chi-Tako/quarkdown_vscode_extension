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
exports.PROJECT_TEMPLATES = void 0;
exports.createProject = createProject;
exports.showProjectCreationDialog = showProjectCreationDialog;
exports.getProjectCommands = getProjectCommands;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
exports.PROJECT_TEMPLATES = [
    {
        name: 'Article',
        description: 'Academic article with sections, bibliography, and math support',
        directories: ['images', 'lib'],
        files: {
            'article.qmd': `# Article Title

.var {author} {Your Name}
.var {date} {$(date +%Y-%m-%d)}
.var {title} {Article Title}

.doctype {article}
.theme {academic} layout:{standard}

## Abstract

Your abstract goes here.

## Introduction

Introduction content...

## Methodology

Methodology content...

## Results

Results content...

## Discussion

Discussion content...

## Conclusion

Conclusion content...

## References

References content...`,
            'lib/math-utils.qmd': `.function {equation} label content:
.if {.label}
    $$
    .content
    \\tag{.label}
    $$
.ifnot {.label}
    $$
    .content
    $$

.function {inline-math} content:
$.content$`,
            'README.md': `# Quarkdown Article Project

This is a Quarkdown article project.

## Structure

- \`article.qmd\` - Main article file
- \`lib/\` - Shared functions and utilities
- \`images/\` - Images and figures

## Building

\`\`\`bash
quarkdown article.qmd
\`\`\`

## Exporting to PDF

\`\`\`bash
quarkdown --pdf article.qmd
\`\`\``
        }
    },
    {
        name: 'Presentation',
        description: 'Slide presentation with reveal.js',
        directories: ['images', 'lib'],
        files: {
            'presentation.qmd': `# Presentation Title

.var {author} {Your Name}
.var {title} {Presentation Title}
.var {date} {$(date +%Y-%m-%d)}

.doctype {slides}
.theme {darko} layout:{minimal}
.slides transition:{zoom} speed:{fast}

---

## Slide 1

Content for slide 1...

---

## Slide 2

Content for slide 2...

.foreach {1..3} i:
- Point .i

---

## Code Example

\`\`\`javascript
function hello() {
    console.log("Hello, Quarkdown!");
}
\`\`\`

---

## Mathematical Example

Inline math: $E = mc^2$

Block math:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

---

## Thank You

Questions?`,
            'lib/slide-utils.qmd': `.function {slide-title} title:
---
## .title

.function {bullet-point} text:
- .text

.function {code-slide} language code:
---
## Code

\`\`\`.language
.code
\`\`\``,
            'README.md': `# Quarkdown Presentation Project

This is a Quarkdown presentation project using reveal.js.

## Structure

- \`presentation.qmd\` - Main presentation file
- \`lib/\` - Shared slide functions
- \`images/\` - Images and figures

## Building

\`\`\`bash
quarkdown presentation.qmd
\`\`\`

## Viewing

Open the generated HTML file in a browser for the interactive presentation.`
        }
    },
    {
        name: 'Book',
        description: 'Multi-chapter book with table of contents',
        directories: ['chapters', 'images', 'lib'],
        files: {
            'book.qmd': `# Book Title

.var {author} {Your Name}
.var {title} {Book Title}
.var {subtitle} {A Comprehensive Guide}

.doctype {book}
.theme {academic} layout:{standard}
.pageformat {A4} orientation:{portrait}

.tableofcontents depth:{3} title:{Table of Contents}

.include {chapters/chapter1.qmd}
.include {chapters/chapter2.qmd}
.include {chapters/chapter3.qmd}

## Bibliography

References and citations...`,
            'chapters/chapter1.qmd': `# Chapter 1: Introduction

.var {chapter} {1}

## Section 1.1

Content for section 1.1...

## Section 1.2

Content for section 1.2...

### Subsection 1.2.1

Subsection content...`,
            'chapters/chapter2.qmd': `# Chapter 2: Main Content

.var {chapter} {2}

## Section 2.1

Content for section 2.1...

## Section 2.2

Content for section 2.2...`,
            'chapters/chapter3.qmd': `# Chapter 3: Conclusion

.var {chapter} {3}

## Summary

Summary content...

## Future Work

Future work content...`,
            'lib/book-utils.qmd': `.function {chapter-title} number title:
# Chapter .number: .title

.function {section} title level:
.if {.level::iseven} 
    ## .title
.ifnot {.level::iseven}
    ### .title

.function {figure} path caption:
![.caption](.path)`,
            'README.md': `# Quarkdown Book Project

This is a multi-chapter book project.

## Structure

- \`book.qmd\` - Main book file
- \`chapters/\` - Individual chapter files
- \`lib/\` - Shared book functions
- \`images/\` - Images and figures

## Building

\`\`\`bash
quarkdown book.qmd
\`\`\`

## PDF Export

\`\`\`bash
quarkdown --pdf book.qmd
\`\`\``
        }
    },
    {
        name: 'Basic Document',
        description: 'Simple Quarkdown document with basic features',
        files: {
            'document.qmd': `# Document Title

.var {author} {Your Name}
.var {date} {$(date +%Y-%m-%d)}

.theme {darko} layout:{minimal}

## Introduction

This is a basic Quarkdown document.

.function {greet} name:
**Hello, .name!** Welcome to Quarkdown.

.greet {World}

## Features

### Variables

.var {count} {42}
The count is .count.

### Mathematics

Inline: $f(x) = x^2$

Block:
$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

### Lists

.foreach {1..5} i:
- Item .i

## Conclusion

This concludes our basic document.`,
            'README.md': `# Quarkdown Document

A basic Quarkdown document demonstrating core features.

## Building

\`\`\`bash
quarkdown document.qmd
\`\`\``
        }
    }
];
async function createProject(template, targetPath) {
    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
    }
    // Create subdirectories
    if (template.directories) {
        for (const dir of template.directories) {
            const dirPath = path.join(targetPath, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        }
    }
    // Create files
    for (const [filename, content] of Object.entries(template.files)) {
        const filePath = path.join(targetPath, filename);
        const fileDir = path.dirname(filePath);
        // Create directory if needed
        if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true });
        }
        fs.writeFileSync(filePath, content, 'utf8');
    }
}
async function showProjectCreationDialog() {
    // Show template selection
    const templateItems = exports.PROJECT_TEMPLATES.map(template => ({
        label: template.name,
        description: template.description,
        template: template
    }));
    const selectedTemplate = await vscode.window.showQuickPick(templateItems, {
        placeHolder: 'Select a project template',
        ignoreFocusOut: true
    });
    if (!selectedTemplate) {
        return;
    }
    // Show folder selection
    const folderOptions = {
        canSelectMany: false,
        canSelectFiles: false,
        canSelectFolders: true,
        openLabel: 'Select Project Location',
        title: 'Select where to create the Quarkdown project'
    };
    const folderUri = await vscode.window.showOpenDialog(folderOptions);
    if (!folderUri || folderUri.length === 0) {
        return;
    }
    // Get project name
    const projectName = await vscode.window.showInputBox({
        prompt: 'Enter project name',
        value: selectedTemplate.template.name.toLowerCase().replace(/\s+/g, '-'),
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Project name cannot be empty';
            }
            if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
                return 'Project name can only contain letters, numbers, hyphens, and underscores';
            }
            return undefined;
        }
    });
    if (!projectName) {
        return;
    }
    const targetPath = path.join(folderUri[0].fsPath, projectName);
    // Check if directory already exists
    if (fs.existsSync(targetPath)) {
        const overwrite = await vscode.window.showWarningMessage(`Directory "${projectName}" already exists. Do you want to continue?`, { modal: true }, 'Yes', 'No');
        if (overwrite !== 'Yes') {
            return;
        }
    }
    try {
        // Create the project
        await createProject(selectedTemplate.template, targetPath);
        // Open the project
        const openProject = await vscode.window.showInformationMessage(`Quarkdown project "${projectName}" created successfully!`, 'Open Project', 'Open Main File');
        if (openProject === 'Open Project') {
            await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(targetPath), true);
        }
        else if (openProject === 'Open Main File') {
            // Find and open the main file
            const mainFiles = Object.keys(selectedTemplate.template.files)
                .filter(filename => filename.endsWith('.qmd'))
                .sort((a, b) => a.length - b.length); // Prefer shorter names (likely main files)
            if (mainFiles.length > 0) {
                const mainFilePath = path.join(targetPath, mainFiles[0]);
                const mainFileUri = vscode.Uri.file(mainFilePath);
                await vscode.window.showTextDocument(mainFileUri);
            }
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to create project: ${error.message}`);
    }
}
function getProjectCommands() {
    return [
        vscode.commands.registerCommand('quarkdown.createProject', showProjectCreationDialog),
        vscode.commands.registerCommand('quarkdown.addChapter', async () => {
            if (!vscode.workspace.workspaceFolders) {
                vscode.window.showErrorMessage('Please open a workspace first');
                return;
            }
            const chapterName = await vscode.window.showInputBox({
                prompt: 'Enter chapter name',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Chapter name cannot be empty';
                    }
                    return undefined;
                }
            });
            if (!chapterName) {
                return;
            }
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const chaptersDir = path.join(workspaceRoot, 'chapters');
            if (!fs.existsSync(chaptersDir)) {
                fs.mkdirSync(chaptersDir, { recursive: true });
            }
            const chapterFilename = chapterName.toLowerCase().replace(/\s+/g, '-') + '.qmd';
            const chapterPath = path.join(chaptersDir, chapterFilename);
            const chapterContent = `# ${chapterName}

## Introduction

Content for ${chapterName}...

## Section 1

Section content...

## Conclusion

Conclusion for ${chapterName}...`;
            fs.writeFileSync(chapterPath, chapterContent, 'utf8');
            const openChapter = await vscode.window.showInformationMessage(`Chapter "${chapterName}" created successfully!`, 'Open Chapter');
            if (openChapter === 'Open Chapter') {
                const chapterUri = vscode.Uri.file(chapterPath);
                await vscode.window.showTextDocument(chapterUri);
            }
        }),
        vscode.commands.registerCommand('quarkdown.addLibraryFile', async () => {
            if (!vscode.workspace.workspaceFolders) {
                vscode.window.showErrorMessage('Please open a workspace first');
                return;
            }
            const libraryName = await vscode.window.showInputBox({
                prompt: 'Enter library file name (without .qmd extension)',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Library name cannot be empty';
                    }
                    return undefined;
                }
            });
            if (!libraryName) {
                return;
            }
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const libDir = path.join(workspaceRoot, 'lib');
            if (!fs.existsSync(libDir)) {
                fs.mkdirSync(libDir, { recursive: true });
            }
            const libFilename = libraryName.toLowerCase().replace(/\s+/g, '-') + '.qmd';
            const libPath = path.join(libDir, libFilename);
            const libContent = `# ${libraryName} Library

.function {example} param:
Example function with parameter: .param

# Add your custom functions here...`;
            fs.writeFileSync(libPath, libContent, 'utf8');
            const openLib = await vscode.window.showInformationMessage(`Library file "${libraryName}" created successfully!`, 'Open Library');
            if (openLib === 'Open Library') {
                const libUri = vscode.Uri.file(libPath);
                await vscode.window.showTextDocument(libUri);
            }
        })
    ];
}
//# sourceMappingURL=projectUtils.js.map