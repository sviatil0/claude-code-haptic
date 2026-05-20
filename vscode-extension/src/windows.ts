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
    throw err;
  }
}
