import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync, spawn } from "child_process";

const SETTINGS_PATH = path.join(os.homedir(), ".claude", "settings.json");

type HookEntry = {
  matcher: string;
  hooks: Array<{ type: "command"; command: string }>;
};

function buildCommand(event: "notification" | "stop"): string {
  const cfg = vscode.workspace.getConfiguration("claudeCodeHaptic");
  const sound =
    event === "notification"
      ? cfg.get<string>("notificationSound", "Frog")
      : cfg.get<string>("stopSound", "Hero");
  const haptic = cfg.get<string>("haptic", "auto");
  const pulses = cfg.get<number>("hapticPulses", 5);
  const waveform = cfg.get<number>("hapticWaveform", 6);
  const interval = cfg.get<number>("hapticIntervalMs", 50);

  const parts: string[] = [];
  const macticPath = "/opt/homebrew/bin/mactic";
  const fallbackApp = path.join(os.homedir(), ".claude/bin/Haptic.app");

  if (haptic !== "off") {
    if (haptic === "mactic" || (haptic === "auto" && fs.existsSync(macticPath))) {
      parts.push(`${macticPath} -r ${pulses} -i ${interval} -w ${waveform}`);
    } else if (haptic === "nshaptic" || haptic === "auto") {
      parts.push(`open -gW "${fallbackApp}"`);
    }
  }

  if (sound !== "none") {
    parts.push(`afplay /System/Library/Sounds/${sound}.aiff`);
  }

  const title = event === "notification" ? "Claude needs your input" : "Claude finished responding";
  parts.push(
    `osascript -e 'display notification "${title}" with title "Claude Code"' >/dev/null 2>&1`
  );

  return parts.join(" & ") + " ; wait";
}

function readSettings(): any {
  if (!fs.existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
  } catch (err) {
    throw new Error(`Failed to parse ${SETTINGS_PATH}: ${err}`);
  }
}

function writeSettings(data: any) {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2) + "\n");
}

function installHooks() {
  const settings = readSettings();
  settings.hooks = settings.hooks || {};

  const notifEntry: HookEntry = {
    matcher: "",
    hooks: [{ type: "command", command: buildCommand("notification") }],
  };
  const stopEntry: HookEntry = {
    matcher: "",
    hooks: [{ type: "command", command: buildCommand("stop") }],
  };

  settings.hooks.Notification = [notifEntry];
  settings.hooks.Stop = [stopEntry];

  writeSettings(settings);
  vscode.window.showInformationMessage(
    `Claude Code Haptic hooks written to ${SETTINGS_PATH}. Restart Claude Code session to activate.`
  );
}

function uninstallHooks() {
  const settings = readSettings();
  if (settings.hooks) {
    delete settings.hooks.Notification;
    delete settings.hooks.Stop;
    if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  }
  writeSettings(settings);
  vscode.window.showInformationMessage("Claude Code Haptic hooks removed.");
}

function testBuzz() {
  const cmd = buildCommand("notification");
  const child = spawn("bash", ["-c", cmd], { detached: true, stdio: "ignore" });
  child.unref();
  vscode.window.showInformationMessage("Triggered test buzz + sound.");
}

function installBackend() {
  const term = vscode.window.createTerminal("Install mactic");
  term.show();
  term.sendText("brew tap matmercer/tap && brew install mactic && mactic -w 2");
}

export function activate(ctx: vscode.ExtensionContext) {
  if (process.platform !== "darwin") {
    vscode.window.showWarningMessage("Claude Code Haptic only supports macOS.");
    return;
  }

  ctx.subscriptions.push(
    vscode.commands.registerCommand("claudeCodeHaptic.install", installHooks),
    vscode.commands.registerCommand("claudeCodeHaptic.uninstall", uninstallHooks),
    vscode.commands.registerCommand("claudeCodeHaptic.test", testBuzz),
    vscode.commands.registerCommand("claudeCodeHaptic.installBackend", installBackend)
  );
}

export function deactivate() {}
