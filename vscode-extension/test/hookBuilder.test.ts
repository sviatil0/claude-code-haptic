import { describe, it, expect } from "vitest";
import { buildCommand, resolveMacticPath, HapticConfig } from "../src/hookBuilder";

const baseCfg: HapticConfig = {
  mode: "both",
  notificationSound: "Frog",
  stopSound: "Hero",
  soundVolume: 1,
  haptic: "auto",
  hapticPulses: 5,
  hapticWaveform: 6,
  hapticIntervalMs: 50,
  fallbackAppPath: "/Users/x/.claude/bin/Haptic.app",
};

const macticExists = (p: string) => p === "/opt/homebrew/bin/mactic";
const noMactic = () => false;

describe("buildCommand", () => {
  it("includes mactic + sound + osascript in 'both' mode when mactic exists", () => {
    const cmd = buildCommand("notification", baseCfg, macticExists);
    expect(cmd).toContain("/opt/homebrew/bin/mactic");
    expect(cmd).toContain("-r 5");
    expect(cmd).toContain("-i 50");
    expect(cmd).toContain("-w 6");
    expect(cmd).toContain("afplay -v 1 /System/Library/Sounds/Frog.aiff");
    expect(cmd).toContain("osascript");
    expect(cmd).toContain("Claude needs your input");
  });

  it("uses stopSound and 'finished' title for stop event", () => {
    const cmd = buildCommand("stop", baseCfg, macticExists);
    expect(cmd).toContain("/System/Library/Sounds/Hero.aiff");
    expect(cmd).toContain("Claude finished responding");
  });

  it("omits sound in 'vibration' mode", () => {
    const cmd = buildCommand("notification", { ...baseCfg, mode: "vibration" }, macticExists);
    expect(cmd).not.toContain("afplay");
    expect(cmd).toContain("mactic");
  });

  it("omits haptic in 'sound' mode", () => {
    const cmd = buildCommand("notification", { ...baseCfg, mode: "sound" }, macticExists);
    expect(cmd).not.toContain("mactic");
    expect(cmd).toContain("afplay");
  });

  it("emits only osascript in 'off' mode", () => {
    const cmd = buildCommand("notification", { ...baseCfg, mode: "off" }, macticExists);
    expect(cmd).not.toContain("mactic");
    expect(cmd).not.toContain("afplay");
    expect(cmd).toContain("osascript");
  });

  it("falls back to Haptic.app when mactic not installed and haptic=auto", () => {
    const cmd = buildCommand("notification", baseCfg, noMactic);
    expect(cmd).not.toContain("mactic");
    expect(cmd).toContain("open -gW");
    expect(cmd).toContain("Haptic.app");
  });

  it("skips haptic entirely when haptic=off", () => {
    const cmd = buildCommand("notification", { ...baseCfg, haptic: "off" }, macticExists);
    expect(cmd).not.toContain("mactic");
    expect(cmd).not.toContain("open -gW");
  });

  it("skips sound when sound is 'none'", () => {
    const cmd = buildCommand(
      "notification",
      { ...baseCfg, notificationSound: "none" },
      macticExists
    );
    expect(cmd).not.toContain("afplay");
  });

  it("coerces non-finite numeric configs to defaults", () => {
    const cmd = buildCommand(
      "notification",
      { ...baseCfg, hapticPulses: NaN as unknown as number, hapticIntervalMs: Infinity },
      macticExists
    );
    expect(cmd).toContain("-r 5");
    expect(cmd).toContain("-i 50");
  });

  it("quotes the mactic path to prevent shell injection via override", () => {
    const evil = "/tmp/evil'; rm -rf /; '";
    const cmd = buildCommand(
      "notification",
      { ...baseCfg, macticPathOverride: evil },
      (p) => p === evil
    );
    expect(cmd).toContain("'/tmp/evil'\\''; rm -rf /; '\\'''");
    expect(cmd).not.toContain("'/tmp/evil'; rm -rf /;");
  });

  it("honors Intel Homebrew path when probed", () => {
    const cmd = buildCommand(
      "notification",
      baseCfg,
      (p) => p === "/usr/local/bin/mactic"
    );
    expect(cmd).toContain("/usr/local/bin/mactic");
  });
});

describe("resolveMacticPath", () => {
  it("prefers override if it exists", () => {
    expect(resolveMacticPath("/custom/mactic", (p) => p === "/custom/mactic")).toBe(
      "/custom/mactic"
    );
  });

  it("ignores override when not present and falls back to homebrew arm64", () => {
    expect(resolveMacticPath("/custom/mactic", (p) => p === "/opt/homebrew/bin/mactic")).toBe(
      "/opt/homebrew/bin/mactic"
    );
  });

  it("returns undefined when nothing exists", () => {
    expect(resolveMacticPath(undefined, () => false)).toBeUndefined();
  });
});
