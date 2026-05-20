#!/usr/bin/env bash
# focus-vscode-window.sh — bring a specific VS Code window to the front.
#
# Usage: focus-vscode-window.sh "<workspace-name-substring>"
#
# Focuses the VS Code window whose title contains the given substring
# (VS Code window titles include the workspace folder name). Falls back
# to activating the VS Code app if the substring is empty, no window
# matches, or Accessibility permission is not granted.

set -euo pipefail

NEEDLE="${1:-}"

# Always bring the app forward first — works without any permissions.
open -b com.microsoft.VSCode 2>/dev/null || true

[ -z "$NEEDLE" ] && exit 0

# Window-specific raise requires Accessibility (System Events). If the
# permission is missing this osascript exits non-zero; we swallow it so
# the app-level focus above is still the effective result.
osascript - "$NEEDLE" <<'APPLESCRIPT' 2>/dev/null || true
on run argv
  set needle to item 1 of argv
  tell application "System Events"
    if not (exists process "Code") then return
    tell process "Code"
      set frontmost to true
      repeat with w in windows
        if name of w contains needle then
          perform action "AXRaise" of w
          return
        end if
      end repeat
    end tell
  end tell
end run
APPLESCRIPT
