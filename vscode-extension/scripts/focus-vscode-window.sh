#!/usr/bin/env bash
# focus-vscode-window.sh — bring a specific VS Code window to the front.
#
# Usage: focus-vscode-window.sh "<workspace-name-substring>"
#
# Focuses the VS Code window whose title contains the given substring
# (VS Code window titles include the workspace folder name). Falls back
# to activating the VS Code app if the substring is empty, no window
# matches, or Accessibility permission is not granted.
#
# Prints one status line on stdout so the caller can tell what happened:
#   APP_ONLY  — only the app was focused (no needle given, or open failed)
#   RAISED    — the specific window was raised
#   NO_MATCH  — needle given but no window title matched
#   NO_AX     — Accessibility permission denied; degraded to app focus

set -uo pipefail

NEEDLE="${1:-}"

# Always bring the app forward first — works without any permissions.
if ! open -b com.microsoft.VSCode 2>/dev/null; then
  echo "APP_ONLY"
  exit 0
fi

if [ -z "$NEEDLE" ]; then
  echo "APP_ONLY"
  exit 0
fi

# macOS truncates long window titles with a trailing ellipsis; a needle
# carrying that character can never substring-match a real title. Strip it.
NEEDLE="${NEEDLE%…}"
# Trim trailing whitespace left after the ellipsis.
NEEDLE="${NEEDLE%"${NEEDLE##*[![:space:]]}"}"

# Window-specific raise requires Accessibility (System Events). The needle
# arrives as argv data — never interpolated into the AppleScript source.
RESULT="$(
  osascript - "$NEEDLE" 2>/dev/null <<'APPLESCRIPT'
on run argv
  set needle to item 1 of argv
  tell application "System Events"
    if not (exists process "Code") then return "NO_MATCH"
    tell process "Code"
      set frontmost to true
      repeat with w in windows
        if name of w contains needle then
          perform action "AXRaise" of w
          return "RAISED"
        end if
      end repeat
    end tell
  end tell
  return "NO_MATCH"
end run
APPLESCRIPT
)"

if [ -z "$RESULT" ]; then
  # osascript produced no output — almost always missing Accessibility.
  echo "NO_AX"
else
  echo "$RESULT"
fi
