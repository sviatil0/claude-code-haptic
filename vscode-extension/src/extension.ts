import * as vscode from "vscode";
import {
  installHooks,
  uninstallHooks,
  testBuzz,
  installBackend,
  openSettings,
  pickSession,
  focusSession,
  resumeSession,
  clearFinishedSessions,
} from "./commands";
import { SessionTreeProvider, SessionItem } from "./sessionTree";
import { Session } from "./sessionStore";

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

/** Tree commands receive a SessionItem; unwrap it to the Session. */
function withSession(fn: (s: Session) => void): (item: SessionItem) => void {
  return (item: SessionItem) => {
    if (item?.session) fn(item.session);
  };
}

export function activate(ctx: vscode.ExtensionContext): void {
  const treeProvider = new SessionTreeProvider();
  ctx.subscriptions.push(treeProvider);
  ctx.subscriptions.push(
    vscode.window.registerTreeDataProvider("claudeCodeHapticSessions", treeProvider)
  );

  ctx.subscriptions.push(
    vscode.commands.registerCommand("claudeCodeHaptic.install", guard(installHooks)),
    vscode.commands.registerCommand("claudeCodeHaptic.uninstall", guard(uninstallHooks)),
    vscode.commands.registerCommand("claudeCodeHaptic.test", guard(testBuzz)),
    vscode.commands.registerCommand("claudeCodeHaptic.installBackend", guard(installBackend)),
    vscode.commands.registerCommand("claudeCodeHaptic.openSettings", openSettings),
    vscode.commands.registerCommand("claudeCodeHaptic.pickSession", guard(pickSession)),
    vscode.commands.registerCommand(
      "claudeCodeHaptic.focusSession",
      guard(withSession(focusSession))
    ),
    vscode.commands.registerCommand(
      "claudeCodeHaptic.resumeSession",
      guard(withSession(resumeSession))
    ),
    vscode.commands.registerCommand(
      "claudeCodeHaptic.refreshSessions",
      () => treeProvider.refresh()
    ),
    vscode.commands.registerCommand(
      "claudeCodeHaptic.clearFinished",
      guard(clearFinishedSessions)
    )
  );
}

export function deactivate(): void {}
