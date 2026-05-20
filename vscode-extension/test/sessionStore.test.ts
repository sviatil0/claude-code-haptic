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
  it("parses valid sessions", () => {
    const result = parseSessions(wrap(validSession()));
    expect(result).toEqual([validSession()]);
  });

  it("returns [] on invalid JSON", () => {
    expect(parseSessions("{not json")).toEqual([]);
  });

  it("returns [] when sessions key missing", () => {
    expect(parseSessions(JSON.stringify({ foo: 1 }))).toEqual([]);
  });

  it("skips entries with missing fields", () => {
    const raw = JSON.stringify({
      sessions: { bad: { id: "bad", cwd: "/x" }, good: validSession({ id: "good" }) },
    });
    const result = parseSessions(raw);
    expect(result.map((s) => s.id)).toEqual(["good"]);
  });

  it("skips entries with an invalid status", () => {
    const raw = JSON.stringify({
      sessions: { x: { ...validSession(), status: "exploded" } },
    });
    expect(parseSessions(raw)).toEqual([]);
  });

  it("sorts most-recently-updated first", () => {
    const result = parseSessions(
      wrap(
        validSession({ id: "old", updated: 10 }),
        validSession({ id: "new", updated: 99 })
      )
    );
    expect(result.map((s) => s.id)).toEqual(["new", "old"]);
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

  it("readSessions returns [] for a missing file", () => {
    expect(readSessions(file)).toEqual([]);
  });

  it("readSessions reads a real file", () => {
    fs.writeFileSync(file, wrap(validSession()));
    expect(readSessions(file)).toEqual([validSession()]);
  });

  it("removeSession deletes one entry, keeps the rest", () => {
    fs.writeFileSync(
      file,
      wrap(validSession({ id: "a" }), validSession({ id: "b" }))
    );
    removeSession("a", file);
    expect(readSessions(file).map((s) => s.id)).toEqual(["b"]);
  });

  it("removeSession is a no-op for an unknown id", () => {
    fs.writeFileSync(file, wrap(validSession({ id: "a" })));
    removeSession("zzz", file);
    expect(readSessions(file).map((s) => s.id)).toEqual(["a"]);
  });

  it("removeSession is a no-op when the file is missing", () => {
    expect(() => removeSession("a", file)).not.toThrow();
  });
});
