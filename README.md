# 🚀 Quarkdown for VS Code

A comprehensive Visual Studio Code extension that provides full support for Quarkdown files (`.qmd`), offering advanced syntax highlighting, intelligent code completion, live preview, and powerful project management features.

## ✨ Features

### 🎨 Advanced Language Support
- **Rich Syntax Highlighting**: Full support for Quarkdown-specific syntax including functions, variables, control structures, and file operations
- **IntelliSense**: Smart auto-completion for 50+ standard library functions with parameter hints and documentation
- **Go to Definition**: Navigate to function and variable definitions across files
- **Find References**: Find all usages of functions and variables in your project
- **Symbol Outline**: Document structure view with functions, variables, headings, and control blocks
- **Rename Refactoring**: Safely rename user-defined functions and variables across your project

### 👁️ Enhanced Live Preview
- **Real-time Preview**: Instant rendering of Quarkdown documents with auto-refresh
- **Multiple Themes**: Switch between Default, Dark (Darko), and Academic themes
- **Flexible Layouts**: Choose from Minimal, Standard, Wide, and Narrow layouts
- **MathJax Integration**: Beautiful mathematical expression rendering with LaTeX support
- **Interactive Controls**: Theme and layout switching directly in preview
- **File Watching**: Automatic updates when files change

### 📤 Export Capabilities
- **PDF Export**: Generate high-quality PDF documents
- **Slide Presentations**: Create reveal.js-powered interactive presentations
- **Multiple Formats**: Support for articles, books, slides, and paged documents
- **Progress Indicators**: Visual feedback during export operations

### 🏗️ Project Management
- **Project Templates**: Quick start with Article, Presentation, Book, and Basic Document templates
- **Chapter Management**: Add new chapters to book projects
- **Library Files**: Create and manage reusable function libraries
- **File Organization**: Automatic directory structure creation

### ⌨️ Productivity Features
- **Smart Snippets**: Quick insertion of functions and variables with `Ctrl+Shift+F` and `Ctrl+Shift+R`
- **Context Menus**: Right-click to insert Quarkdown elements
- **Command Palette**: Full integration with VS Code's command system
- **Keyboard Shortcuts**: Optimized shortcuts for common operations

## 🚀 Getting Started

### Installation

1. **Install the Extension**:
   - Open VS Code
   - Go to Extensions (`Ctrl+Shift+X`)
   - Search for "Quarkdown"
   - Click "Install"

2. **Install Quarkdown CLI** (for full functionality):
   - Download from [Quarkdown Releases](https://github.com/jjallaire/quarkdown/releases)
   - Extract to a directory in your PATH
   - Ensure Java 17+ is installed

### Quick Start

1. **Create a New Project**:
   - Press `Ctrl+Shift+P`
   - Type "Quarkdown: Create New Project"
   - Choose a template and location

2. **Start Writing**:
   - Create a `.qmd` file
   - Begin with Quarkdown syntax
   - Press `Ctrl+Shift+V` for live preview

## 📖 Quarkdown Syntax Guide

### Functions with Named Parameters
```quarkdown
.function {greet}
    to from:
    **Hello, .to!** Welcome from .from.

.greet
    to: {World}
    from: {Quarkdown Team}
```

### Variables and References
```quarkdown
.var {title} {My Document}
.var {author} {Your Name}
.var {version} {1.0}

Document: .title by .author v.version
```

### Control Flow Structures
```quarkdown
.var {showAdvanced} {true}

.if {.showAdvanced}
🎯 Advanced features enabled!

.foreach {1..5} i:
- Item .i: Content here

.repeat {3} n:
Step .n completed successfully!
```

### Mathematical Expressions
```quarkdown
Inline math: $E = mc^2$

Display math:
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

Complex equations:
$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$
```

### Layout Functions
```quarkdown
.row alignment:{center} gap:{20px}:
    .column:
        Left content
    .column:
        Right content

.grid {3} gap:{15px}:
    Item 1
    Item 2
    Item 3

.center:
Centered content

.box padding:{20px} border:{solid}:
Boxed content
```

### Document Configuration
```quarkdown
.doctype {html}
.theme {darko}
.pageformat {A4} orientation:{portrait}
```

### File Operations
```quarkdown
.include {lib/utilities.qmd}
.read {data/sample.txt} lines:{1..10}
```

## 🎯 Commands

| Command | Keyboard Shortcut | Description |
|---------|-------------------|-------------|
| `Quarkdown: Open Preview` | `Ctrl+Shift+V` | Open live preview |
| `Quarkdown: Export to PDF` | - | Generate PDF document |
| `Quarkdown: Export to Slides` | - | Create presentation |
| `Quarkdown: Create New Project` | - | Start new project |
| `Quarkdown: Insert Function` | `Ctrl+Shift+F` | Add function template |
| `Quarkdown: Insert Variable` | `Ctrl+Shift+R` | Add variable definition |
| `Quarkdown: Add Chapter` | - | Add chapter to book |
| `Quarkdown: Add Library File` | - | Create function library |

## ⚙️ Configuration

Customize the extension through VS Code settings:

```json
{
  "quarkdown.previewTheme": "darko",
  "quarkdown.previewLayout": "minimal", 
  "quarkdown.enableMath": true,
  "quarkdown.enableAutoPreview": true,
  "quarkdown.cliPath": "quarkdown"
}
```

## 📁 Project Structure

### Article Project
```
my-article/
├── article.qmd          # Main article
├── lib/
│   └── math-utils.qmd   # Shared functions
├── images/              # Assets
└── README.md           # Documentation
```

### Book Project
```
my-book/
├── book.qmd            # Main book file
├── chapters/           # Individual chapters
│   ├── chapter1.qmd
│   ├── chapter2.qmd
│   └── chapter3.qmd
├── lib/                # Book utilities
└── images/             # Figures
```

## 🎨 Themes and Layouts

### Available Themes
- **Default**: Clean, professional appearance
- **Darko**: Dark theme with vibrant syntax highlighting
- **Academic**: Optimized for research papers and formal documents

### Layout Options
- **Minimal**: 800px max-width, clean margins
- **Standard**: 1000px max-width, balanced layout
- **Wide**: 1200px max-width, full screen utilization
- **Narrow**: 600px max-width, focused reading

## 🔧 Troubleshooting

### Preview Not Working
- Ensure file has `.qmd` extension
- Check that VS Code recognizes language as "Quarkdown"
- Verify Quarkdown CLI is installed for full rendering

### Export Issues
- Install Quarkdown CLI and Java 17+
- Check CLI is in system PATH
- Verify file syntax is valid

### Syntax Highlighting Problems
- Reload VS Code window (`Ctrl+Shift+P` → "Developer: Reload Window")
- Check file is recognized as Quarkdown language

## 🤝 Contributing

We welcome contributions! The extension supports:

- Feature requests and bug reports
- Documentation improvements
- New project templates
- Additional themes and layouts

## 📚 Resources

- [Quarkdown Documentation](https://github.com/jjallaire/quarkdown)
- [Quarkdown CLI Releases](https://github.com/jjallaire/quarkdown/releases)
- [VS Code Extension Development](https://code.visualstudio.com/api)

## 📄 License

MIT License - see LICENSE file for details.

## 🎉 Changelog

### 1.0.0 - Initial Release
- Complete Quarkdown language support
- Advanced syntax highlighting for all Quarkdown constructs
- IntelliSense with 50+ standard library functions
- Enhanced live preview with theme switching
- Project templates (Article, Book, Presentation, Basic)
- Export to PDF and slides
- Document symbol provider and outline view
- Go to definition, find references, and rename refactoring
- Multi-file support with include/import handling
- Command palette integration
- Keyboard shortcuts and context menus

---

**Enjoy writing with Quarkdown!** ✨

Transform your documentation workflow with the power of programmable Markdown.