#!/usr/bin/env bash
# session-writer.sh — record a Claude Code session's status for the
# Claude Code Haptic VS Code panel.
#
# Usage (from a Claude Code hook):
#   ... | session-writer.sh <status>
#
# <status> is one of: working | waiting | done
#
# Reads the hook's JSON payload from stdin (fields: session_id, cwd,
# hook_event_name) and upserts an entry into the shared state file
# ~/.claude/haptic-sessions.json. The VS Code extension watches that
# file and renders one row per session.
#
# The state file shape:
#   { "sessions": { "<session_id>": {
#       "id": "...", "cwd": "...", "label": "...",
#       "status": "...", "updated": <epoch-seconds> } } }

set -uo pipefail

STATUS="${1:-waiting}"
STATE_FILE="${HOME}/.claude/haptic-sessions.json"

# The hook payload is a single JSON line on stdin. Pass it plus the
# status and state-file path to Python, which does the parse + upsert.
PAYLOAD="$(cat)"

STATUS="$STATUS" STATE_FILE="$STATE_FILE" PAYLOAD="$PAYLOAD" python3 - <<'PYEOF'
import json, os, sys, time, pathlib

status = os.environ["STATUS"]
state_file = pathlib.Path(os.environ["STATE_FILE"])
payload_raw = os.environ.get("PAYLOAD", "")

try:
    payload = json.loads(payload_raw) if payload_raw.strip() else {}
except json.JSONDecodeError:
    payload = {}

session_id = payload.get("session_id") or "unknown"
cwd = payload.get("cwd") or os.getcwd()
label = os.path.basename(cwd.rstrip("/")) or cwd

# Load existing state, tolerating a missing or corrupt file.
state = {"sessions": {}}
if state_file.exists():
    try:
        loaded = json.loads(state_file.read_text())
        if isinstance(loaded, dict) and isinstance(loaded.get("sessions"), dict):
            state = loaded
    except (json.JSONDecodeError, OSError):
        pass

state["sessions"][session_id] = {
    "id": session_id,
    "cwd": cwd,
    "label": label,
    "status": status,
    "updated": int(time.time()),
}

# Atomic write: tmp file + rename.
state_file.parent.mkdir(parents=True, exist_ok=True)
tmp = state_file.with_suffix(f".tmp-{os.getpid()}")
tmp.write_text(json.dumps(state, indent=2) + "\n")
tmp.replace(state_file)
PYEOF
