# claude-code-haptic

Trackpad haptic feedback for [Claude Code](https://docs.claude.com/en/docs/claude-code) on macOS — buzz your wrist when Claude needs input or finishes a task.

Wraps Apple's `NSHapticFeedbackManager` in a tiny `.app` bundle so it works from Claude Code hooks (which run as background processes that the bare API silently ignores).

## Requirements

- macOS 11+ (Apple Silicon or Intel)
- MacBook with Force Touch trackpad
- Xcode Command Line Tools (`xcode-select --install`)
- **System Settings → Trackpad → "Force Click and haptic feedback" must be ON**

## Install

### Option A — VS Code extension (recommended)

Search **Claude Code Haptic** in the Marketplace, or sideload from `vscode-extension/`. Then run `Claude Code Haptic: Install hooks` from the Command Palette. See [vscode-extension/README.md](vscode-extension/README.md).

### Option B — Shell installer

```bash
git clone https://github.com/sviatil0/claude-code-haptic.git
cd claude-code-haptic
./scripts/install.sh
```

This builds `~/.claude/bin/Haptic.app` and prints the hook snippet to add to your Claude Code settings.

### Recommended backend on Apple Silicon

`NSHapticFeedbackManager` is unreliable from background hooks on M-series Macs. Install [mactic](https://github.com/MatMercer/mactic) for direct actuator control:

```bash
brew tap matmercer/tap && brew install mactic
mactic -w 2   # test
```

Then set hook command to use `mactic -w 2` instead of `open -gW Haptic.app`.

## Test

```bash
open -W ~/.claude/bin/Haptic.app
```

You should feel 3 taps on the trackpad. If not, check the Trackpad setting above.

## Claude Code integration

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "open -gW ~/.claude/bin/Haptic.app & afplay /System/Library/Sounds/Frog.aiff"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "open -gW ~/.claude/bin/Haptic.app & afplay /System/Library/Sounds/Hero.aiff"
          }
        ]
      }
    ]
  }
}
```

`open -g` keeps Claude Code focused (no app switch). `&` plays sound in parallel.

Hook events:

- `Notification` — fires when Claude is waiting for input or permission
- `Stop` — fires when Claude finishes responding

Restart your Claude Code session after editing settings.

## CLI usage

```bash
~/.claude/bin/Haptic.app/Contents/MacOS/haptic --help

# 5 quick taps
haptic -n 5 -g 0.15

# 2 strong alignment pulses
haptic -n 2 -g 0.4 -p alignment
```

Patterns: `generic`, `alignment`, `levelChange` (default).

## Why an .app bundle and not just a binary?

`NSHapticFeedbackManager` requires an active `NSApplication` run loop with a UI activation policy. A plain CLI binary launched from a hook has no UI session — the API call is silently dropped on Apple Silicon.

Wrapping in a `.app` bundle launched via `open -gW` gives macOS enough context to actually fire the haptic without stealing focus from your terminal.

## Troubleshooting

**No haptic felt:**
- Confirm `System Settings → Trackpad → Force Click and haptic feedback` is ON
- Hand must be resting on the trackpad — haptic only fires when touched
- External (USB/Bluetooth) trackpad: only Magic Trackpad 2+ has haptic

**Sound but no vibration in Claude Code:**
- Make sure hook uses `open -gW path/to/Haptic.app`, not the bare `haptic` binary
- Check Console.app for `Haptic` crashes (rare; usually codesign)

**Want a stronger buzz:**
- Use pattern `alignment` and crank `-n 6 -g 0.12` for a rapid burst

## License

MIT — see [LICENSE](LICENSE)
