import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("application menu command wiring", () => {
  it("subscribes to application menu commands through the cleanup-returning bridge", () => {
    const source = readFileSync("src/renderer/App.tsx", "utf8");

    expect(source).toContain("subscribeApplicationMenuCommands(");
    expect(source).toContain("window.pergamum.applicationMenu.onCommand");
  });

  it("delegates application menu command execution through a ref", () => {
    const source = readFileSync("src/renderer/App.tsx", "utf8");

    expect(source).toContain("executeUiCommandRef.current");
    expect(source).toContain("() => executeUiCommandRef.current");
  });
});
