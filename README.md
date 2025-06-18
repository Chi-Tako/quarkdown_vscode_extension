## 🚀 Getting Started

### Installation

1. **Install the Extension**:
   - Open VS Code
   - Go to Extensions (`Ctrl+Shift+X`)
   - Search for "Quarkdown"
   - Click "Install"

2. **Install Quarkdown CLI** (required for full functionality):
   - Download from [Quarkdown Releases](https://github.com/iamgio/quarkdown/releases)
   - Extract to a directory in your PATH
   - Ensure Java 17+ is installed

### 🪟 Windows-Specific Setup

**Windows users typically need additional configuration:**

1. **Find your Quarkdown installation path**:
   ```powershell
   Get-Command quarkdown | Select-Object Source
   ```

2. **Configure VS Code settings**:
   - Press `Ctrl+,` to open settings
   - Search for `quarkdown.cliPath`
   - Set the full path to your `quarkdown.bat` file

3. **Example configuration**:
   ```json
   {
     "quarkdown.cliPath": "C:\\Users\\yourname\\Project\\quarkdown\\bin\\quarkdown.bat"
   }
   ```

**Why is this needed on Windows?**
- Windows execution file resolution differs between VS Code extensions and command line
- The extension may not automatically find `.bat` files in PATH
- Specifying the full path ensures reliable execution

### 🐧🍎 Linux/Mac Setup

For Unix-based systems, the default configuration usually works:
```json
{
  "quarkdown.cliPath": "quarkdown"
}
```

### Quick Start

1. **Create a New Project**:
   - Press `Ctrl+Shift+P`
   - Type "Quarkdown: Create New Project"
   - Choose a template and location

2. **Start Writing**:
   - Create a `.qmd` file
   - Begin with Quarkdown syntax
   - Press `Ctrl+Shift+V` for live preview

## ⚙️ Configuration

### Essential Settings

| Setting | Description | Default | Platform Notes |
|---------|-------------|---------|----------------|
| `quarkdown.cliPath` | Path to Quarkdown CLI | `quarkdown` | **Windows**: Use full path to `.bat` file |
| `quarkdown.previewTheme` | Preview theme | `darko` | All platforms |
| `quarkdown.previewLayout` | Preview layout | `minimal` | All platforms |
| `quarkdown.enableMath` | Enable MathJax | `true` | All platforms |
| `quarkdown.enableAutoPreview` | Auto-refresh preview | `true` | All platforms |

### Example Complete Configuration

```json
{
  "quarkdown.cliPath": "C:\\Users\\yourname\\Project\\quarkdown\\bin\\quarkdown.bat",
  "quarkdown.previewTheme": "darko",
  "quarkdown.previewLayout": "minimal", 
  "quarkdown.enableMath": true,
  "quarkdown.enableAutoPreview": true
}
```

## 🔧 Troubleshooting

### Windows Issues

**Preview shows "Configuration Required" error:**
1. Verify Quarkdown CLI is installed and working:
   ```powershell
   quarkdown --version
   ```
2. Find the exact path:
   ```powershell
   Get-Command quarkdown | Select-Object Source
   ```
3. Configure the full path in VS Code settings
4. Restart VS Code

**Permission or execution errors:**
- Ensure Java 17+ is installed
- Check Windows execution policies
- Try running VS Code as administrator (temporarily)

### Cross-Platform Issues

**Preview Not Working:**
- Ensure file has `.qmd` extension
- Check that VS Code recognizes language as "Quarkdown"
- Verify Quarkdown CLI is accessible from command line

**Export Issues:**
- Install Quarkdown CLI and Java 17+
- Check CLI is in system PATH
- Verify file syntax is valid

**Syntax Highlighting Problems:**
- Reload VS Code window (`Ctrl+Shift+P` → "Developer: Reload Window")
- Check file is recognized as Quarkdown language

### Getting Help

1. **Check the Console**: Open Developer Tools (`Help` → `Toggle Developer Tools`) for detailed error logs
2. **Use Quick Actions**: The error page provides quick buttons to open settings
3. **Verify Installation**: Run `quarkdown --version` in your terminal
4. **Path Detection**: Check the detailed logs in VS Code Developer Console## 🚀 Getting Started

### Installation

1. **Install the Extension**:
   - Open VS Code
   - Go to Extensions (`Ctrl+Shift+X`)
   - Search for "Quarkdown"
   - Click "Install"

2. **Install Quarkdown CLI** (required for full functionality):
   - Download from [Quarkdown Releases](https://github.com/iamgio/quarkdown/releases)
   - Extract to a directory in your PATH
   - Ensure Java 17+ is installed

### 🪟 Windows-Specific Setup

**Windows users typically need additional configuration:**

1. **Find your Quarkdown installation path**:
   ```powershell
   Get-Command quarkdown | Select-Object Source
   ```

2. **Configure VS Code settings**:
   - Press `Ctrl+,` to open settings
   - Search for `quarkdown.cliPath`
   - Set the full path to your `quarkdown.bat` file

3. **Example configuration**:
   ```json
   {
     "quarkdown.cliPath": "C:\\Users\\yourname\\Project\\quarkdown\\bin\\quarkdown.bat"
   }
   ```

**Why is this needed on Windows?**
- Windows execution file resolution differs between VS Code extensions and command line
- The extension may not automatically find `.bat` files in PATH
- Specifying the full path ensures reliable execution

### 🐧🍎 Linux/Mac Setup

For Unix-based systems, the default configuration usually works:
```json
{
  "quarkdown.cliPath": "quarkdown"
}
```

### Quick Start

1. **Create a New Project**:
   - Press `Ctrl+Shift+P`
   - Type "Quarkdown: Create New Project"
   - Choose a template and location

2. **Start Writing**:
   - Create a `.qmd` file
   - Begin with Quarkdown syntax
   - Press `Ctrl+Shift+V` for live preview

## ⚙️ Configuration

### Essential Settings

| Setting | Description | Default | Platform Notes |
|---------|-------------|---------|----------------|
| `quarkdown.cliPath` | Path to Quarkdown CLI | `quarkdown` | **Windows**: Use full path to `.bat` file |
| `quarkdown.previewTheme` | Preview theme | `darko` | All platforms |
| `quarkdown.previewLayout` | Preview layout | `minimal` | All platforms |
| `quarkdown.enableMath` | Enable MathJax | `true` | All platforms |
| `quarkdown.enableAutoPreview` | Auto-refresh preview | `true` | All platforms |

### Example Complete Configuration

```json
{
  "quarkdown.cliPath": "C:\\Users\\yourname\\Project\\quarkdown\\bin\\quarkdown.bat",
  "quarkdown.previewTheme": "darko",
  "quarkdown.previewLayout": "minimal", 
  "quarkdown.enableMath": true,
  "quarkdown.enableAutoPreview": true
}
```

## 🔧 Troubleshooting

### Windows Issues

**Preview shows "Configuration Required" error:**
1. Verify Quarkdown CLI is installed and working:
   ```powershell
   quarkdown --version
   ```
2. Find the exact path:
   ```powershell
   Get-Command quarkdown | Select-Object Source
   ```
3. Configure the full path in VS Code settings
4. Restart VS Code

**Permission or execution errors:**
- Ensure Java 17+ is installed
- Check Windows execution policies
- Try running VS Code as administrator (temporarily)

### Cross-Platform Issues

**Preview Not Working:**
- Ensure file has `.qmd` extension
- Check that VS Code recognizes language as "Quarkdown"
- Verify Quarkdown CLI is accessible from command line

**Export Issues:**
- Install Quarkdown CLI and Java 17+
- Check CLI is in system PATH
- Verify file syntax is valid

**Syntax Highlighting Problems:**
- Reload VS Code window (`Ctrl+Shift+P` → "Developer: Reload Window")
- Check file is recognized as Quarkdown language

### Getting Help

1. **Check the Console**: Open Developer Tools (`Help` → `Toggle Developer Tools`) for detailed error logs
2. **Use Quick Actions**: The error page provides quick buttons to open settings
3. **Verify Installation**: Run `quarkdown --version` in your terminal
4. **Path Detection**: Check the detailed logs in VS Code Developer Console