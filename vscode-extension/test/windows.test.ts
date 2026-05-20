import { describe, it, expect } from "vitest";
import {
  workspaceFromTitle,
  listVsCodeWindows,
  withCurrentWindow,
  AccessibilityError,
  AutomationError,
} from "../src/windows";

describe("workspaceFromTitle", () => {
  it("extracts workspace after last em-dash separator", () => {
    expect(workspaceFromTitle("extension.ts — claude-code-haptic")).toBe("claude-code-haptic");
  });

  it("handles titles with multiple separators", () => {
    expect(workspaceFromTitle("file.ts — src — my-project")).toBe("my-project");
  });

  it("returns the whole title when no separator", () => {
    expect(workspaceFromTitle("claude-code-haptic")).toBe("claude-code-haptic");
  });

  it("trims whitespace", () => {
    expect(workspaceFromTitle("a —  spaced-project ")).toBe("spaced-project");
  });
});

describe("listVsCodeWindows", () => {
  it("parses osascript output into window objects", async () => {
    const fakeOutput = "ext.ts — proj-a\nREADME.md — proj-b\nproj-c\n";
    const windows = await listVsCodeWindows(async () => fakeOutput);
    expect(windows).toEqual([
      { title: "ext.ts — proj-a", workspace: "proj-a" },
      { title: "README.md — proj-b", workspace: "proj-b" },
      { title: "proj-c", workspace: "proj-c" },
    ]);
  });

  it("returns empty array for empty output", async () => {
    expect(await listVsCodeWindows(async () => "")).toEqual([]);
  });

  it("ignores blank lines", async () => {
    const windows = await listVsCodeWindows(async () => "\n\nproj-a\n\n");
    expect(windows).toEqual([{ title: "proj-a", workspace: "proj-a" }]);
  });

  it("propagates AccessibilityError from the runner", async () => {
    await expect(
      listVsCodeWindows(async () => {
        throw new AccessibilityError();
      })
    ).rejects.toBeInstanceOf(AccessibilityError);
  });

  it("propagates AutomationError from the runner", async () => {
    await expect(
      listVsCodeWindows(async () => {
        throw new AutomationError();
      })
    ).rejects.toBeInstanceOf(AutomationError);
  });
});

describe("withCurrentWindow", () => {
  it("prepends the current window flagged isCurrent", () => {
    const result = withCurrentWindow(
      [{ title: "x — proj-a", workspace: "proj-a" }],
      "my-session"
    );
    expect(result[0]).toEqual({
      title: "my-session",
      workspace: "my-session",
      isCurrent: true,
    });
    expect(result).toHaveLength(2);
  });

  it("drops a truncated enumerated window that matches the current label", () => {
    const result = withCurrentWindow(
      [{ title: "Add notification system …", workspace: "Add notification system …" }],
      "Add notification system to claude code"
    );
    expect(result).toHaveLength(1);
    expect(result[0].isCurrent).toBe(true);
  });

  it("keeps a truncated window that does NOT match the current label", () => {
    const result = withCurrentWindow(
      [{ title: "Some other long title …", workspace: "Some other long title …" }],
      "my-session"
    );
    expect(result).toHaveLength(2);
  });

  it("keeps non-truncated windows untouched", () => {
    const result = withCurrentWindow(
      [
        { title: "a.ts — proj-a", workspace: "proj-a" },
        { title: "b.ts — proj-b", workspace: "proj-b" },
      ],
      "current"
    );
    expect(result.map((w) => w.workspace)).toEqual(["current", "proj-a", "proj-b"]);
  });

  it("returns only the current window when enumeration is empty", () => {
    const result = withCurrentWindow([], "current");
    expect(result).toEqual([
      { title: "current", workspace: "current", isCurrent: true },
    ]);
  });
});
