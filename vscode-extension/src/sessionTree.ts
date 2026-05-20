import * as vscode from "vscode";
import * as fs from "fs";
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

  constructor() {
    this.startWatching();
  }

  getTreeItem(item: SessionItem): vscode.TreeItem {
    return item;
  }

  getChildren(): SessionItem[] {
    return readSessions().map((s) => new SessionItem(s));
  }

  refresh(): void {
    this._onDidChange.fire();
  }

  private startWatching(): void {
    // fs.watch on the directory survives the atomic rename the writer
    // performs (watching the file directly breaks after a rename).
    const dir = SESSIONS_PATH.slice(0, SESSIONS_PATH.lastIndexOf("/"));
    try {
      this.watcher = fs.watch(dir, (_event, filename) => {
        if (filename === "haptic-sessions.json") this.refresh();
      });
    } catch {
      // Directory may not exist yet; the panel simply shows nothing
      // until the first hook fires and creates ~/.claude.
    }
  }

  dispose(): void {
    this.watcher?.close();
    this._onDidChange.dispose();
  }
}
