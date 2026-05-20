# Changelog

## 0.3.1

- Session writer no longer invents an "unknown" id when the payload is
  bad — it skips the write so failed sessions can't collapse into one
  masked row.
- Writer logs failures to `~/.claude/haptic-session-writer.log` and
  always exits 0 so it never blocks the rest of the hook.
- Panel warns once when the session file is corrupt instead of silently
  showing an empty list.
- Session file watcher retries every 5s if `~/.claude` does not exist
  yet, so tracking starts without a VS Code restart.
- `resumeSession` / `clearFinished` surface write errors instead of
  failing with a raw "command failed" toast.

## 0.3.0

- **Claude Sessions panel**: a new view in the activity bar lists every
  Claude Code session with its status — working, waiting for input, or
  finished. Click a row to focus that session's VS Code window.
- Hooks now record session status (session id + workspace) into
  `~/.claude/haptic-sessions.json` via the bundled `session-writer.sh`;
  the panel watches that file and updates live.
- Panel actions: refresh, clear finished sessions, and "Focus & dismiss"
  on each row.
- New setting `claudeCodeHaptic.trackSessions` (default on) — re-run
  "Install hooks" after toggling.

## 0.2.1

- Focus script now reports a status sentinel (RAISED / NO_MATCH / NO_AX /
  APP_ONLY); the picker surfaces a warning when a window can't be raised
  instead of silently doing nothing.
- Strip the macOS truncation ellipsis from the match needle so long
  window titles can still be matched.
- Map the Automation-permission error (-1743) to an actionable message
  with an "Open Automation Settings" action; wrap other osascript
  failures in a clear WindowListError.

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
