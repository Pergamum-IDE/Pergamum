import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("WelcomeScreen project commands", () => {
  it("wires Create Project and Open Project controls from App", () => {
    const appSource = readFileSync("src/renderer/App.tsx", "utf8");
    const welcomeSource = readFileSync("src/renderer/WelcomeScreen.tsx", "utf8");

    expect(welcomeSource).toContain("onCreateProject");
    expect(welcomeSource).toContain('translate("welcome.createProject")');
    expect(welcomeSource).toContain("onOpenProject");
    expect(welcomeSource).toContain('translate("welcome.openProject")');
    expect(appSource).toContain("window.pergamum.projects.createProject()");
    expect(appSource).toContain("onCreateProject={() =>");
  });
});
