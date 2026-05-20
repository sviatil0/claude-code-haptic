import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { parseSessions, readSessions, removeSession, Session } from "../src/sessionStore";

const validSession = (over: Partial<Session> = {}): Session => ({
  id: "s1",
  cwd: "/Users/x/proj",
  label: "proj",
  status: "waiting",
  updated: 100,
  ...over,
});

function wrap(...sessions: Session[]) {
  return JSON.stringify({
    sessions: Object.fromEntries(sessions.map((s) => [s.id, s])),
  });
}

describe("parseSessions", () => {
  it("parses valid sessions, no parseError", () => {
    const result = parseSessions(wrap(validSession()));
    expect(result).toEqual({ sessions: [validSession()], parseError: false });
  });

  it("flags parseError on invalid JSON", () => {
    expect(parseSessions("{not json")).toEqual({ sessions: [], parseError: true });
  });

  it("flags parseError when sessions key missing", () => {
    expect(parseSessions(JSON.stringify({ foo: 1 }))).toEqual({
      sessions: [],
      parseError: true,
    });
  });

  it("skips entries with missing fields WITHOUT parseError", () => {
    const raw = JSON.stringify({
      sessions: { bad: { id: "bad", cwd: "/x" }, good: validSession({ id: "good" }) },
    });
    const result = parseSessions(raw);
    expect(result.sessions.map((s) => s.id)).toEqual(["good"]);
    expect(result.parseError).toBe(false);
  });

  it("skips entries with an invalid status, no parseError", () => {
    const raw = JSON.stringify({
      sessions: { x: { ...validSession(), status: "exploded" } },
    });
    expect(parseSessions(raw)).toEqual({ sessions: [], parseError: false });
  });

  it("sorts most-recently-updated first", () => {
    const result = parseSessions(
      wrap(
        validSession({ id: "old", updated: 10 }),
        validSession({ id: "new", updated: 99 })
      )
    );
    expect(result.sessions.map((s) => s.id)).toEqual(["new", "old"]);
  });
});

describe("readSessions / removeSession", () => {
  let tmpDir: string;
  let file: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cch-sess-"));
    file = path.join(tmpDir, "haptic-sessions.json");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("readSessions returns empty result for a missing file", () => {
    expect(readSessions(file)).toEqual({ sessions: [], parseError: false });
  });

  it("readSessions reads a real file", () => {
    fs.writeFileSync(file, wrap(validSession()));
    expect(readSessions(file).sessions).toEqual([validSession()]);
  });

  it("readSessions flags parseError on a corrupt file", () => {
    fs.writeFileSync(file, "{corrupt");
    expect(readSessions(file)).toEqual({ sessions: [], parseError: true });
  });

  it("removeSession deletes one entry, keeps the rest", () => {
    fs.writeFileSync(
      file,
      wrap(validSession({ id: "a" }), validSession({ id: "b" }))
    );
    removeSession("a", file);
    expect(readSessions(file).sessions.map((s) => s.id)).toEqual(["b"]);
  });

  it("removeSession is a no-op for an unknown id", () => {
    fs.writeFileSync(file, wrap(validSession({ id: "a" })));
    removeSession("zzz", file);
    expect(readSessions(file).sessions.map((s) => s.id)).toEqual(["a"]);
  });

  it("removeSession is a no-op when the file is missing", () => {
    expect(() => removeSession("a", file)).not.toThrow();
  });
});
