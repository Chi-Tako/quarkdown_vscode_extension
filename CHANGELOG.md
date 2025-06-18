# Changelog

All notable changes to the Quarkdown VS Code Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2024-12-18

### 🔒 Security
- **CRITICAL**: Fixed command injection vulnerability in export utilities by replacing shell command concatenation with secure `execFile` API
- Enhanced input validation and sanitization for file paths and user inputs
- Implemented proper shell escaping for all CLI interactions

### 🐛 Fixed
- **CRITICAL**: Resolved Node.js compatibility issue with `document.createElement` in server environment - replaced with pure string manipulation
- **MAJOR**: Fixed shared state issue where all preview windows used the same settings - each document now maintains independent settings
- **MAJOR**: Fixed debounce logic in file watcher that could cause multiple concurrent updates
- **MAJOR**: Fixed webview panel restoration after VS Code restart - preview content now properly restores
- Fixed deprecated `substr()` usage, replaced with `substring()` for future compatibility
- Fixed settings save/load inconsistency between individual keys and global settings object
- Improved error handling with comprehensive try-catch blocks throughout the codebase

### ⚡ Performance
- Implemented proper resource cleanup on extension deactivation to prevent memory leaks
- Optimized file watching with improved debounce mechanism and timer management
- Enhanced memory management in preview providers
- Reduced extension startup time with better error handling

### 🎯 Reliability
- Added comprehensive error handling during extension activation and deactivation
- Improved user-friendly error messages with actionable troubleshooting guidance
- Enhanced extension stability with proper disposal of resources
- Added robust cleanup methods for all managed resources (panels, watchers, timers)

### 📦 Dependencies
- Updated package.json with proper repository information and license details
- Added activation events for better command registration
- Enhanced extension metadata for marketplace visibility

### 🔧 Internal
- Refactored preview provider to use per-document settings management
- Implemented secure command execution patterns throughout the codebase
- Added proper TypeScript types and improved code organization
- Enhanced logging and debugging capabilities

## [1.0.0] - Previous Release

### Added
- Initial release with comprehensive Quarkdown support
- Advanced syntax highlighting for .qmd files
- Live preview functionality with multiple themes
- Project management capabilities
- Export to PDF and slides functionality
- Multi-platform support (Windows, Linux, macOS)
- Comprehensive language features (completion, hover, definition providers)
- Configurable CLI path settings
- Auto-refresh preview on file changes
- MathJax support for mathematical expressions