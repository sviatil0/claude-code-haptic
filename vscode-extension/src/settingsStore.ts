import * as fs from "fs";
import * as path from "path";

export interface HookCommand {
  type: "command";
  command: string;
}

export interface HookEntry {
  matcher: string;
  hooks: HookCommand[];
}

export interface ClaudeSettings {
  hooks?: Record<string, HookEntry[]>;
  [key: string]: unknown;
}

export class SettingsParseError extends Error {
  constructor(public readonly filePath: string, public readonly cause: unknown) {
    super(`Failed to parse ${filePath}: ${(cause as Error).message ?? cause}`);
    this.name = "SettingsParseError";
  }
}

export class SettingsWriteError extends Error {
  constructor(public readonly filePath: string, public readonly cause: unknown) {
    super(`Failed to write ${filePath}: ${(cause as Error).message ?? cause}`);
    this.name = "SettingsWriteError";
  }
}

export function readSettings(filePath: string): ClaudeSettings {
  if (!fs.existsSync(filePath)) return {};
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8").replace(/^﻿/, "");
  } catch (err) {
    throw new SettingsParseError(filePath, err);
  }
  try {
    return JSON.parse(raw) as ClaudeSettings;
  } catch (err) {
    throw new SettingsParseError(filePath, err);
  }
}

export function writeSettings(filePath: string, data: ClaudeSettings): void {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
    fs.renameSync(tmp, filePath);
  } catch (err) {
    throw new SettingsWriteError(filePath, err);
  }
}

export function setHookEntries(
  settings: ClaudeSettings,
  event: string,
  entries: HookEntry[]
): ClaudeSettings {
  const next: ClaudeSettings = { ...settings };
  next.hooks = { ...(next.hooks ?? {}) };
  next.hooks[event] = entries;
  return next;
}

export function removeHookEntries(settings: ClaudeSettings, event: string): ClaudeSettings {
  const next: ClaudeSettings = { ...settings };
  if (!next.hooks) return next;
  next.hooks = { ...next.hooks };
  delete next.hooks[event];
  if (Object.keys(next.hooks).length === 0) delete next.hooks;
  return next;
}
