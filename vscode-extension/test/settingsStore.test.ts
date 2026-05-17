import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  readSettings,
  writeSettings,
  setHookEntries,
  removeHookEntries,
  SettingsParseError,
} from "../src/settingsStore";

let tmpDir: string;
let settingsPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cch-test-"));
  settingsPath = path.join(tmpDir, "settings.json");
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("readSettings", () => {
  it("returns {} when file does not exist", () => {
    expect(readSettings(settingsPath)).toEqual({});
  });

  it("parses valid JSON", () => {
    fs.writeFileSync(settingsPath, JSON.stringify({ theme: "dark" }));
    expect(readSettings(settingsPath)).toEqual({ theme: "dark" });
  });

  it("strips BOM", () => {
    fs.writeFileSync(settingsPath, "﻿" + JSON.stringify({ a: 1 }));
    expect(readSettings(settingsPath)).toEqual({ a: 1 });
  });

  it("throws SettingsParseError on invalid JSON", () => {
    fs.writeFileSync(settingsPath, "{ not json");
    expect(() => readSettings(settingsPath)).toThrow(SettingsParseError);
  });
});

describe("writeSettings", () => {
  it("round-trips data", () => {
    const data = { theme: "dark", hooks: { Stop: [{ matcher: "", hooks: [] }] } };
    writeSettings(settingsPath, data);
    expect(readSettings(settingsPath)).toEqual(data);
  });

  it("creates parent directories", () => {
    const nested = path.join(tmpDir, "a", "b", "c", "settings.json");
    writeSettings(nested, { x: 1 });
    expect(fs.existsSync(nested)).toBe(true);
  });

  it("writes atomically (no .tmp file left behind)", () => {
    writeSettings(settingsPath, { x: 1 });
    const leftover = fs.readdirSync(tmpDir).filter((f) => f.includes(".tmp-"));
    expect(leftover).toEqual([]);
  });

  it("writes file with 0600 mode", () => {
    writeSettings(settingsPath, { x: 1 });
    const mode = fs.statSync(settingsPath).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});

describe("setHookEntries", () => {
  it("adds entry to empty settings", () => {
    const entry = { matcher: "", hooks: [{ type: "command" as const, command: "echo hi" }] };
    const result = setHookEntries({}, "Notification", [entry]);
    expect(result.hooks).toEqual({ Notification: [entry] });
  });

  it("preserves other top-level keys", () => {
    const result = setHookEntries({ theme: "dark" }, "Stop", []);
    expect(result.theme).toBe("dark");
    expect(result.hooks).toEqual({ Stop: [] });
  });

  it("preserves other hook events", () => {
    const existing = { hooks: { PreToolUse: [{ matcher: "", hooks: [] }] } };
    const result = setHookEntries(existing, "Stop", []);
    expect(result.hooks?.PreToolUse).toEqual([{ matcher: "", hooks: [] }]);
    expect(result.hooks?.Stop).toEqual([]);
  });

  it("does not mutate input", () => {
    const input = { hooks: { Stop: [] } };
    const before = JSON.stringify(input);
    setHookEntries(input, "Notification", [{ matcher: "", hooks: [] }]);
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe("removeHookEntries", () => {
  it("removes the specified event", () => {
    const settings = { hooks: { Stop: [{ matcher: "", hooks: [] }], Notification: [] } };
    const result = removeHookEntries(settings, "Stop");
    expect(result.hooks).toEqual({ Notification: [] });
  });

  it("removes the hooks object entirely when empty", () => {
    const result = removeHookEntries({ hooks: { Stop: [] } }, "Stop");
    expect(result.hooks).toBeUndefined();
  });

  it("is a no-op when hooks does not exist", () => {
    const result = removeHookEntries({ theme: "dark" }, "Stop");
    expect(result).toEqual({ theme: "dark" });
  });
});
