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
# On any failure the script appends a line to ~/.claude/haptic-session-writer.log
# so the extension can detect that tracking is broken and warn the user.
# It always exits 0 so it never blocks the rest of the hook command.
#
# Concurrency: two hooks firing at the same instant do a read-modify-write
# on the same file; last write wins, so one session's update can be lost
# for one tick. The next hook for that session repairs it. This is
# accepted — hook frequency is low and user-driven.

set -uo pipefail

STATUS="${1:-waiting}"
STATE_FILE="${HOME}/.claude/haptic-sessions.json"
LOG_FILE="${HOME}/.claude/haptic-session-writer.log"

note_failure() {
  mkdir -p "${HOME}/.claude" 2>/dev/null || true
  printf '%s  %s\n' "$(date '+%Y-%m-%dT%H:%M:%S')" "$1" >>"$LOG_FILE" 2>/dev/null || true
  echo "haptic session-writer: $1" >&2
}

PAYLOAD="$(cat)"

if ! STATUS="$STATUS" STATE_FILE="$STATE_FILE" PAYLOAD="$PAYLOAD" python3 - <<'PYEOF'
import json, os, sys, time, pathlib

status = os.environ["STATUS"]
state_file = pathlib.Path(os.environ["STATE_FILE"])
payload_raw = os.environ.get("PAYLOAD", "")

try:
    payload = json.loads(payload_raw) if payload_raw.strip() else {}
except json.JSONDecodeError:
    sys.stderr.write("payload is not valid JSON\n")
    sys.exit(1)

session_id = payload.get("session_id")
if not session_id:
    # Never invent a key — an "unknown" id would collapse every
    # unidentified session into one row, masking real data.
    sys.stderr.write("payload missing session_id; not recording\n")
    sys.exit(1)

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

state_file.parent.mkdir(parents=True, exist_ok=True)
tmp = state_file.with_suffix(f".tmp-{os.getpid()}")
tmp.write_text(json.dumps(state, indent=2) + "\n")
tmp.replace(state_file)
PYEOF
then
  note_failure "could not record session (python3 missing, bad payload, or write error)"
fi

exit 0
