import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const LIST_SCRIPT = `
tell application "System Events"
  if not (exists process "Code") then return ""
  set out to ""
  tell process "Code"
    repeat with w in windows
      set out to out & (name of w) & linefeed
    end repeat
  end tell
  return out
end tell
`;

export class AccessibilityError extends Error {
  constructor() {
    super(
      "Accessibility permission required. Grant it in System Settings > Privacy & Security > Accessibility for your editor."
    );
    this.name = "AccessibilityError";
  }
}

export class AutomationError extends Error {
  constructor() {
    super(
      "Automation permission required. Grant it in System Settings > Privacy & Security > Automation for your editor."
    );
    this.name = "AutomationError";
  }
}

export class WindowListError extends Error {
  constructor(cause: unknown) {
    super(`Could not list VS Code windows: ${(cause as Error).message ?? cause}`);
    this.name = "WindowListError";
  }
}

/**
 * VS Code window titles look like:
 *   "extension.ts — claude-code-haptic"
 *   "claude-code-haptic"  (no active editor)
 * The workspace folder is the segment after the last " — ".
 */
export function workspaceFromTitle(title: string): string {
  const parts = title.split(" — ");
  return parts[parts.length - 1].trim();
}

export interface VsCodeWindow {
  title: string;
  workspace: string;
  isCurrent?: boolean;
}

/**
 * Merge the System Events window list with the current window's clean label
 * (from the VS Code API). macOS truncates AX window titles with an ellipsis,
 * so the current window may appear under a truncated, unrecognizable name —
 * or its truncated title may match nothing. This guarantees exactly one
 * entry is flagged `isCurrent` with a full, readable label.
 */
export function withCurrentWindow(
  windows: VsCodeWindow[],
  currentLabel: string
): VsCodeWindow[] {
  const ELLIPSIS = "…";
  const currentEntry: VsCodeWindow = {
    title: currentLabel,
    workspace: currentLabel,
    isCurrent: true,
  };

  // Drop any enumerated window that is a truncated prefix of the current
  // label (the OS-truncated version of the same window) to avoid duplicates.
  const deduped = windows.filter((w) => {
    if (!w.title.endsWith(ELLIPSIS)) return true;
    const prefix = w.title.slice(0, -1).trimEnd();
    return !currentLabel.startsWith(prefix);
  });

  return [currentEntry, ...deduped];
}

export async function listVsCodeWindows(
  runOsascript: (script: string) => Promise<string> = defaultRunOsascript
): Promise<VsCodeWindow[]> {
  const raw = await runOsascript(LIST_SCRIPT);
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((title) => ({ title, workspace: workspaceFromTitle(title) }));
}

async function defaultRunOsascript(script: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("osascript", ["-e", script]);
    return stdout;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("-1728") || msg.includes("assistive access")) {
      throw new AccessibilityError();
    }
    if (msg.includes("-1743") || msg.includes("Not authorized to send")) {
      throw new AutomationError();
    }
    throw new WindowListError(err);
  }
}
