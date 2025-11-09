# Changelog

All notable changes to the "strudel-vscode" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-09

### Added
- Initial release of Strudel VS Code Extension
- Real-time synchronization between VS Code and Strudel web editor
- Browser automation using Puppeteer
- Support for `.str` and `.std` Strudel files with JavaScript syntax highlighting
- Comprehensive command palette integration:
  - Launch Strudel browser session
  - Quit Strudel session
  - Toggle play/stop playback
  - Update/evaluate code
  - Stop playback
  - Set active editor for synchronization
  - Combined set editor and update command
- Extensive configuration options:
  - UI customization (hide/show panels, maximize menu)
  - Behavior settings (auto-update on save, cursor sync, error reporting)
  - Advanced browser configuration (headless mode, custom CSS, browser path)
- Two-way cursor position synchronization
- Real-time content synchronization with conflict resolution
- Error reporting from Strudel back to VS Code
- Custom CSS injection support
- Session persistence with browser user data directory
- Headless mode support for pure VS Code workflow
- Comprehensive keyboard shortcuts
- Status bar integration

### Technical Features
- TypeScript codebase with strict typing
- Modular architecture with separate controller and browser management
- Intelligent content diffing for minimal editor updates
- Event-driven communication between components
- Proper resource cleanup and disposal
- VS Code extension best practices compliance

### Documentation
- Comprehensive README with usage instructions
- Configuration documentation for all settings
- Troubleshooting guide
- Setup scripts for both Windows and Unix systems
- VS Code development environment configuration