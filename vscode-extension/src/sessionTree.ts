import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Session, SessionStatus, readSessions, SESSIONS_PATH } from "./sessionStore";

const STATUS_ICON: Record<SessionStatus, string> = {
  working: "sync~spin",
  waiting: "bell-dot",
  done: "check",
};

const STATUS_TEXT: Record<SessionStatus, string> = {
  working: "working",
  waiting: "waiting for input",
  done: "finished",
};

export class SessionItem extends vscode.TreeItem {
  constructor(public readonly session: Session) {
    super(session.label, vscode.TreeItemCollapsibleState.None);
    this.description = STATUS_TEXT[session.status];
    this.tooltip = `${session.cwd}\n${STATUS_TEXT[session.status]}`;
    this.iconPath = new vscode.ThemeIcon(STATUS_ICON[session.status]);
    this.contextValue = `session-${session.status}`;
    this.command = {
      command: "claudeCodeHaptic.focusSession",
      title: "Focus session",
      arguments: [session],
    };
  }
}

export class SessionTreeProvider implements vscode.TreeDataProvider<SessionItem> {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  private watcher: fs.FSWatcher | undefined;
  private retryTimer: NodeJS.Timeout | undefined;
  private warnedParseError = false;

  constructor() {
    this.startWatching();
  }

  getTreeItem(item: SessionItem): vscode.TreeItem {
    return item;
  }

  getChildren(): SessionItem[] {
    const { sessions, parseError } = readSessions();
    if (parseError && !this.warnedParseError) {
      this.warnedParseError = true;
      vscode.window.showWarningMessage(
        "Claude Code Haptic: the session file is unreadable — the panel may be incomplete."
      );
    } else if (!parseError) {
      this.warnedParseError = false;
    }
    return sessions.map((s) => new SessionItem(s));
  }

  refresh(): void {
    this._onDidChange.fire();
  }

  /**
   * Watch the ~/.claude directory (not the file) so the writer's atomic
   * tmp+rename still produces an event. If the directory does not exist
   * yet, retry on a timer so tracking starts working once the first hook
   * creates ~/.claude — without requiring a VS Code restart.
   */
  private startWatching(): void {
    if (this.watcher) return;
    const dir = path.dirname(SESSIONS_PATH);
    const fileName = path.basename(SESSIONS_PATH);
    try {
      this.watcher = fs.watch(dir, (_event, filename) => {
        if (filename === fileName) this.refresh();
      });
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = undefined;
      }
      this.refresh();
    } catch {
      // Directory missing or watch limit hit — retry shortly.
      this.retryTimer = setTimeout(() => {
        this.retryTimer = undefined;
        this.startWatching();
      }, 5000);
    }
  }

  dispose(): void {
    this.watcher?.close();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this._onDidChange.dispose();
  }
}
