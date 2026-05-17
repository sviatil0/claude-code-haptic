# Claude Code Haptic — VS Code Extension

One-click setup for trackpad haptic + sound notifications when Claude Code needs input or finishes a task.

## Install

From VS Code Marketplace: search **Claude Code Haptic** (publisher: sviatil0).

Or sideload:

```bash
git clone https://github.com/sviatil0/claude-code-haptic.git
cd claude-code-haptic/vscode-extension
npm install
npm run compile
npx vsce package
code --install-extension claude-code-haptic-0.1.0.vsix
```

## Usage

Command Palette (`Cmd+Shift+P`) → run any of:

- **Claude Code Haptic: Install hooks** — writes `Notification` + `Stop` hooks into `~/.claude/settings.json`
- **Claude Code Haptic: Test buzz + sound** — fires once so you can verify it works
- **Claude Code Haptic: Install mactic backend** — opens terminal and runs `brew tap matmercer/tap && brew install mactic` (recommended on Apple Silicon for reliable haptic)
- **Claude Code Haptic: Remove hooks** — clean uninstall

## Settings

| Setting | Default | Description |
|---|---|---|
| `claudeCodeHaptic.notificationSound` | `Frog` | macOS system sound on input-needed event |
| `claudeCodeHaptic.stopSound` | `Hero` | macOS system sound when Claude finishes |
| `claudeCodeHaptic.haptic` | `auto` | `auto` / `mactic` / `nshaptic` / `off` |
| `claudeCodeHaptic.hapticPulses` | `3` | Number of haptic pulses per event |

## Requirements

- macOS only
- MacBook with Force Touch trackpad (for haptic)
- Claude Code CLI installed
- (Recommended) mactic — `brew tap matmercer/tap && brew install mactic`

## Why mactic?

Apple's public `NSHapticFeedbackManager` is unreliable when called from background hook processes on Apple Silicon — pointer authentication silently drops the call. [mactic](https://github.com/MatMercer/mactic) bypasses this by driving the haptic actuator via the private MultitouchSupport framework using `dlopen`/`dlsym`. The extension auto-detects mactic and falls back to a bundled `.app` wrapper if not installed.

## License

MIT
