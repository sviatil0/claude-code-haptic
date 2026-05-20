import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export type SessionStatus = "working" | "waiting" | "done";

export interface Session {
  id: string;
  cwd: string;
  label: string;
  status: SessionStatus;
  updated: number;
}

export const SESSIONS_PATH = path.join(os.homedir(), ".claude", "haptic-sessions.json");

const VALID_STATUS: ReadonlySet<string> = new Set(["working", "waiting", "done"]);

export interface ParseResult {
  sessions: Session[];
  /** True when the file existed but could not be parsed at the top level
   *  (corrupt JSON, wrong shape). Malformed individual entries are skipped
   *  silently and do NOT set this flag. */
  parseError: boolean;
}

/**
 * Parse the raw state-file contents into a Session list. A top-level parse
 * failure sets `parseError` so the caller can warn the user; individual
 * malformed entries are skipped silently (fewer rows beats a crash).
 */
export function parseSessions(raw: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { sessions: [], parseError: true };
  }
  if (typeof data !== "object" || data === null) {
    return { sessions: [], parseError: true };
  }
  const sessions = (data as { sessions?: unknown }).sessions;
  if (typeof sessions !== "object" || sessions === null) {
    return { sessions: [], parseError: true };
  }

  const out: Session[] = [];
  for (const entry of Object.values(sessions as Record<string, unknown>)) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (
      typeof e.id === "string" &&
      typeof e.cwd === "string" &&
      typeof e.label === "string" &&
      typeof e.status === "string" &&
      VALID_STATUS.has(e.status) &&
      typeof e.updated === "number"
    ) {
      out.push({
        id: e.id,
        cwd: e.cwd,
        label: e.label,
        status: e.status as SessionStatus,
        updated: e.updated,
      });
    }
  }
  out.sort((a, b) => b.updated - a.updated);
  return { sessions: out, parseError: false };
}

/** Read + parse the state file. A missing file is not an error. */
export function readSessions(filePath: string = SESSIONS_PATH): ParseResult {
  if (!fs.existsSync(filePath)) return { sessions: [], parseError: false };
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    return { sessions: [], parseError: true };
  }
  return parseSessions(raw);
}

/** Remove one session from the state file (used when a session is resumed). */
export function removeSession(id: string, filePath: string = SESSIONS_PATH): void {
  if (!fs.existsSync(filePath)) return;
  let data: { sessions?: Record<string, unknown> };
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return;
  }
  if (!data.sessions || !(id in data.sessions)) return;
  delete data.sessions[id];
  const tmp = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  fs.renameSync(tmp, filePath);
}
