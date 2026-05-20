import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import { spawn, execFile } from "child_process";
import { buildCommand, HapticConfig } from "./hookBuilder";
import {
  readSettings,
  writeSettings,
  setHookEntries,
  removeHookEntries,
  SettingsParseError,
  SettingsWriteError,
} from "./settingsStore";
import { listVsCodeWindows, AccessibilityError } from "./windows";

export const SETTINGS_PATH = path.join(os.homedir(), ".claude", "settings.json");

function loadConfig(): HapticConfig {
  const c = vscode.workspace.getConfiguration("claudeCodeHaptic");
  return {
    mode: c.get("mode", "both"),
    notificationSound: c.get("notificationSound", "Frog"),
    stopSound: c.get("stopSound", "Hero"),
    soundVolume: c.get("soundVolume", 1.0),
    haptic: c.get("haptic", "auto"),
    hapticPulses: c.get("hapticPulses", 5),
    hapticWaveform: c.get("hapticWaveform", 6),
    hapticIntervalMs: c.get("hapticIntervalMs", 50),
    fallbackAppPath: path.join(os.homedir(), ".claude/bin/Haptic.app"),
  };
}

async function showSettingsError(err: unknown): Promise<void> {
  const msg = err instanceof Error ? err.message : String(err);
  const sel = await vscode.window.showErrorMessage(
    `Claude Code Haptic: ${msg}`,
    "Open settings.json"
  );
  if (sel) await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(SETTINGS_PATH));
}

export async function installHooks(): Promise<void> {
  try {
    const cfg = loadConfig();
    const settings = readSettings(SETTINGS_PATH);
    const notif = { matcher: "", hooks: [{ type: "command" as const, command: buildCommand("notification", cfg) }] };
    const stop = { matcher: "", hooks: [{ type: "command" as const, command: buildCommand("stop", cfg) }] };
    const next1 = setHookEntries(settings, "Notification", [notif]);
    const next2 = setHookEntries(next1, "Stop", [stop]);
    writeSettings(SETTINGS_PATH, next2);
    vscode.window.showInformationMessage(
      `Claude Code Haptic hooks written to ${SETTINGS_PATH}. Restart your Claude Code session.`
    );
  } catch (err) {
    if (err instanceof SettingsParseError || err instanceof SettingsWriteError) {
      await showSettingsError(err);
    } else {
      throw err;
    }
  }
}

export async function uninstallHooks(): Promise<void> {
  try {
    const settings = readSettings(SETTINGS_PATH);
    const next1 = removeHookEntries(settings, "Notification");
    const next2 = removeHookEntries(next1, "Stop");
    writeSettings(SETTINGS_PATH, next2);
    vscode.window.showInformationMessage("Claude Code Haptic hooks removed.");
  } catch (err) {
    if (err instanceof SettingsParseError || err instanceof SettingsWriteError) {
      await showSettingsError(err);
    } else {
      throw err;
    }
  }
}

export function testBuzz(): void {
  const cfg = loadConfig();
  const cmd = buildCommand("notification", cfg);
  const child = spawn("bash", ["-c", cmd], { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
  child.on("error", (e) => {
    vscode.window.showErrorMessage(`Test buzz failed to start: ${e.message}`);
  });
  child.on("exit", (code) => {
    if (code === 0) {
      vscode.window.showInformationMessage("Test buzz fired.");
    } else {
      vscode.window.showErrorMessage(
        `Test buzz failed (exit ${code}): ${stderr.trim() || "no stderr output"}`
      );
    }
  });
}

export function installBackend(): void {
  const term = vscode.window.createTerminal("Install mactic");
  term.show();
  term.sendText(
    'brew tap matmercer/tap; ' +
      'brew install mactic || { echo "ERROR: mactic install failed — see output above"; exit 1; }; ' +
      'mactic -w 6 && echo "OK: mactic installed and tested"'
  );
}

export function openSettings(): void {
  vscode.commands.executeCommand("workbench.action.openSettings", "claudeCodeHaptic");
}

function focusVsCodeWindow(workspace: string): void {
  const script = path.join(__dirname, "..", "scripts", "focus-vscode-window.sh");
  execFile("bash", [script, workspace], (err) => {
    if (err) {
      vscode.window.showErrorMessage(`Could not focus window: ${err.message}`);
    }
  });
}

export async function pickSession(): Promise<void> {
  let windows;
  try {
    windows = await listVsCodeWindows();
  } catch (err) {
    if (err instanceof AccessibilityError) {
      const sel = await vscode.window.showErrorMessage(
        err.message,
        "Open Accessibility Settings"
      );
      if (sel) {
        await vscode.commands.executeCommand(
          "vscode.open",
          vscode.Uri.parse(
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
          )
        );
      }
      return;
    }
    throw err;
  }

  if (windows.length === 0) {
    vscode.window.showInformationMessage("No VS Code windows found.");
    return;
  }

  const items = windows.map((w) => ({
    label: w.workspace,
    description: w.title !== w.workspace ? w.title : undefined,
    workspace: w.workspace,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: "Select a Claude Code session window to focus",
  });
  if (picked) focusVsCodeWindow(picked.workspace);
}
