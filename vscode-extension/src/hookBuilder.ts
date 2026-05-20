import * as fs from "fs";

export type HapticEvent = "notification" | "stop";
export type Mode = "sound" | "vibration" | "both" | "off";
export type HapticBackend = "auto" | "mactic" | "nshaptic" | "off";

export interface HapticConfig {
  mode: Mode;
  notificationSound: string;
  stopSound: string;
  soundVolume: number;
  haptic: HapticBackend;
  hapticPulses: number;
  hapticWaveform: number;
  hapticIntervalMs: number;
  macticPathOverride?: string;
  terminalNotifierPathOverride?: string;
  fallbackAppPath: string;
  /** Absolute path to session-writer.sh; when set, the hook records
   *  session status into ~/.claude/haptic-sessions.json for the panel. */
  sessionWriterPath?: string;
}

const MACTIC_CANDIDATES = ["/opt/homebrew/bin/mactic", "/usr/local/bin/mactic"];
const TERMINAL_NOTIFIER_CANDIDATES = [
  "/opt/homebrew/bin/terminal-notifier",
  "/usr/local/bin/terminal-notifier",
];

export function resolveMacticPath(
  override: string | undefined,
  exists: (p: string) => boolean = fs.existsSync
): string | undefined {
  if (override && exists(override)) return override;
  return MACTIC_CANDIDATES.find(exists);
}

export function resolveTerminalNotifierPath(
  override: string | undefined,
  exists: (p: string) => boolean = fs.existsSync
): string | undefined {
  if (override && exists(override)) return override;
  return TERMINAL_NOTIFIER_CANDIDATES.find(exists);
}

function safeNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

export function buildCommand(
  event: HapticEvent,
  cfg: HapticConfig,
  exists: (p: string) => boolean = fs.existsSync
): string {
  const wantSound = cfg.mode === "sound" || cfg.mode === "both";
  const wantHaptic = cfg.mode === "vibration" || cfg.mode === "both";

  const parts: string[] = [];

  if (wantHaptic && cfg.haptic !== "off") {
    const macticPath = resolveMacticPath(cfg.macticPathOverride, exists);
    if (cfg.haptic === "mactic" || (cfg.haptic === "auto" && macticPath)) {
      if (macticPath) {
        const r = safeNumber(cfg.hapticPulses, 5);
        const i = safeNumber(cfg.hapticIntervalMs, 50);
        const w = safeNumber(cfg.hapticWaveform, 6);
        parts.push(`${shellQuote(macticPath)} -r ${r} -i ${i} -w ${w}`);
      }
    } else if (cfg.haptic === "nshaptic" || cfg.haptic === "auto") {
      parts.push(`open -gW ${shellQuote(cfg.fallbackAppPath)}`);
    }
  }

  if (wantSound) {
    const soundName = event === "notification" ? cfg.notificationSound : cfg.stopSound;
    if (soundName && soundName !== "none") {
      const volume = safeNumber(cfg.soundVolume, 1);
      parts.push(`afplay -v ${volume} /System/Library/Sounds/${soundName}.aiff`);
    }
  }

  const title = event === "notification" ? "Claude needs your input" : "Claude finished responding";
  const tnPath = resolveTerminalNotifierPath(cfg.terminalNotifierPathOverride, exists);
  if (tnPath) {
    parts.push(
      `${shellQuote(tnPath)} -title 'Claude Code' -message ${shellQuote(title)} ` +
        `-activate com.microsoft.VSCode -sender com.microsoft.VSCode`
    );
  } else {
    parts.push(
      `osascript -e ${shellQuote(`display notification "${title}" with title "Claude Code"`)}`
    );
  }

  const alerts = parts.length > 0 ? parts.join(" & ") + "; wait" : "true";

  // The session writer must run first and synchronously: it is the only
  // part that consumes the hook's stdin JSON (session_id, cwd). The alert
  // parts are backgrounded and never read stdin, so ordering is safe.
  if (cfg.sessionWriterPath) {
    const status = event === "notification" ? "waiting" : "done";
    return `bash ${shellQuote(cfg.sessionWriterPath)} ${status}; ${alerts}`;
  }
  return alerts;
}
