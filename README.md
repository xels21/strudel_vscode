# Strudel VS Code Extension

> This project is an adaptadion of the neovim extension (strudel.nvim)[https://github.com/gruvw/strudel.nvim]

A VS Code extension that integrates with [Strudel](https://strudel.cc/), a live coding web editor for algorithmic music and visuals.

This extension launches Strudel in a browser window and provides real-time two-way synchronization between VS Code and the Strudel editor, as well as remote Strudel controls (play/stop, update), and much more!

## Features

- **Real-time sync** - Two-way synchronization between VS Code and Strudel editor
- **Playback control** - Control Strudel's Play/Stop and Update functions directly from VS Code
- **Side by side workflow** - Maximized Strudel menu panel and (optionally) hidden top bar for seamless workflow
- **File based** - Save your files as `*.str` or `*.std` and open them right away in Strudel through VS Code
- **Two-way cursor sync** - The cursor position is synchronized in real-time between VS Code and Strudel
- **Swap files** - Change the file that is synced to Strudel with the "Set Active Editor" command
- **File type support** - The extension automatically provides syntax highlighting for `.str` and `.std` files
- **Hydra support** - Live code stunning visuals directly from VS Code
- **Error reporting** - Reports Strudel evaluation errors back into VS Code
- **Custom CSS injection** - Optionally inject custom CSS into the Strudel web editor
- **Auto update** - Optionally trigger Strudel Update when saving files
- **Customizable** - Extensive configuration options to customize your experience
- **Headless mode** - Optionally launch Strudel without opening the browser window

## Installation

1. Install the extension from the VS Code marketplace
2. Install Node.js (16.0 or higher) if not already installed
3. The extension will automatically install Puppeteer for browser automation

## Usage

### Basic Workflow

1. **Launch Strudel** - Open a `.str` file or any JavaScript file and run `Strudel: Launch Strudel` from the command palette
2. **Start Coding** - The Strudel editor will open in your browser. Any changes you make in VS Code will be automatically synced to Strudel (and vice versa)
3. **Control Playback** - Use `Strudel: Toggle Play/Stop` to start/stop playback, and `Strudel: Update/Evaluate Code` to update your code
4. **Exit Session** - Run `Strudel: Quit Strudel` or close your browser/VS Code when done

### Commands

| Command | Keybinding | Description |
|---------|------------|-------------|
| `Strudel: Launch Strudel` | `Ctrl+Shift+S L` | Launch Strudel browser session and start syncing |
| `Strudel: Quit Strudel` | `Ctrl+Shift+S Q` | Quit the Strudel session and close browser |
| `Strudel: Toggle Play/Stop` | `Ctrl+Shift+S T` | Toggle playback in Strudel |
| `Strudel: Update/Evaluate Code` | `Ctrl+Shift+S U` | Trigger code evaluation in Strudel |
| `Strudel: Stop Playback` | `Ctrl+Shift+S S` | Stop playback in Strudel |
| `Strudel: Set Active Editor` | - | Change which file is synced to Strudel |
| `Strudel: Set Active Editor and Update` | `Ctrl+Shift+S X` | Set current editor and trigger update |

### Configuration

The extension provides extensive configuration options in VS Code settings:

#### UI Configuration
- `strudel.ui.maximizeMenuPanel` - Maximize the menu panel for side-by-side workflow (default: true)
- `strudel.ui.hideMenuPanel` - Hide the Strudel menu panel completely (default: false)
- `strudel.ui.hideTopBar` - Hide the default Strudel top bar (default: false)
- `strudel.ui.hideCodeEditor` - Hide the Strudel code editor (default: false)
- `strudel.ui.hideErrorDisplay` - Hide the Strudel eval error display (default: false)

#### Behavior Configuration
- `strudel.updateOnSave` - Automatically trigger code evaluation after saving (default: false)
- `strudel.syncCursor` - Enable two-way cursor position sync (default: true)
- `strudel.reportEvalErrors` - Report evaluation errors as VS Code notifications (default: true)

#### Advanced Configuration
- `strudel.customCssFile` - Path to a custom CSS file to style Strudel
- `strudel.headless` - Run browser without launching a window (default: false)
- `strudel.browserDataDir` - Custom directory for browser user data
- `strudel.browserExecutablePath` - Custom path to browser executable

### File Types

The extension automatically recognizes:
- `.str` files (Strudel files)
- `.std` files (Strudel files)
- JavaScript files (when working with Strudel code)

## How It Works

The extension uses Puppeteer to control a real Chromium browser instance, allowing seamless integration between VS Code and the Strudel web application. Changes are synchronized in real-time using browser automation and VS Code's text editor APIs.

## Troubleshooting

- **Browser doesn't open** - Ensure Node.js is properly installed and Puppeteer can access a Chromium browser
- **Permission errors** - Ensure VS Code has permission to launch external processes
- **Sync not working** - Check that the correct file type is open and the Strudel session is active

## Requirements

- VS Code 1.74.0 or higher
- Node.js 16.0 or higher
- Chromium-based browser (automatically provided by Puppeteer)

## License

This project is licensed under the AGPL-3.0 License - see the LICENSE file for details.

## Acknowledgments

- [Strudel](https://strudel.cc/) - The amazing live coding environment this extension integrates with
- [Puppeteer](https://pptr.dev/) - Browser automation library
- [strudel.nvim](https://github.com/gruvw/strudel.nvim) - The original Neovim plugin that inspired this extension