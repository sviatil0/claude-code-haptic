import { describe, it, expect } from "vitest";
import { workspaceFromTitle, listVsCodeWindows, AccessibilityError } from "../src/windows";

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
});
