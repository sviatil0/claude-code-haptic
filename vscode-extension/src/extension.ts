import * as vscode from "vscode";
import {
  installHooks,
  uninstallHooks,
  testBuzz,
  installBackend,
  openSettings,
  pickSession,
} from "./commands";

function guard<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: Parameters<T>) => {
    if (process.platform !== "darwin") {
      vscode.window.showErrorMessage(
        "Claude Code Haptic requires macOS (uses afplay, osascript, mactic)."
      );
      return;
    }
    return fn(...args);
  }) as T;
}

export function activate(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand("claudeCodeHaptic.install", guard(installHooks)),
    vscode.commands.registerCommand("claudeCodeHaptic.uninstall", guard(uninstallHooks)),
    vscode.commands.registerCommand("claudeCodeHaptic.test", guard(testBuzz)),
    vscode.commands.registerCommand("claudeCodeHaptic.installBackend", guard(installBackend)),
    vscode.commands.registerCommand("claudeCodeHaptic.openSettings", openSettings),
    vscode.commands.registerCommand("claudeCodeHaptic.pickSession", guard(pickSession))
  );
}

export function deactivate(): void {}
