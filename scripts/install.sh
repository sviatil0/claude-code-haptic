#!/usr/bin/env bash
set -euo pipefail

# claude-code-haptic installer
# Builds the Haptic.app and prints Claude Code hook config

PREFIX="${PREFIX:-$HOME/.claude/bin}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Building Haptic.app into $PREFIX"
make -C "$REPO_DIR" install PREFIX="$PREFIX"

echo
echo "==> Test:"
echo "    open -W $PREFIX/Haptic.app"
echo
echo "==> Claude Code hook (add to ~/.claude/settings.json):"
cat <<EOF

"hooks": {
  "Notification": [
    {
      "matcher": "",
      "hooks": [
        {
          "type": "command",
          "command": "open -gW $PREFIX/Haptic.app & afplay /System/Library/Sounds/Frog.aiff"
        }
      ]
    }
  ]
}
EOF
echo
echo "Done. Enable: System Settings → Trackpad → Force Click and haptic feedback"
