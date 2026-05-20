# Changelog

## 0.2.0

- Clickable notifications: when `terminal-notifier` is installed, clicking the
  banner brings VS Code to the front (`-activate com.microsoft.VSCode`).
  Falls back to `osascript` notifications when not installed.
- New command **Focus a Claude session window**: quick-pick list of open
  VS Code windows by workspace folder; selecting one raises that window.
- Bundled `scripts/focus-vscode-window.sh` — focuses a specific window by
  workspace name (requires Accessibility permission; degrades to app focus).

## 0.1.0

- Initial release
- Install/uninstall Notification + Stop hooks in `~/.claude/settings.json`
- Auto-detect mactic backend, fall back to bundled `.app`
- Test command, configurable sounds + pulse count
