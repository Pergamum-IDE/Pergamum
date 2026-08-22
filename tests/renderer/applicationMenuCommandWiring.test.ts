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
    expect(source).toContain("imeCompositionSaveGuard.handleCommand(");
    expect(source.indexOf('event: "application_menu.command.received"')).toBeLessThan(
      source.indexOf("imeCompositionSaveGuard.handleCommand(")
    );
  });

  it("observes IME composition at the app shell without keydown shortcuts", () => {
    const source = readFileSync("src/renderer/App.tsx", "utf8");

    expect(source).toContain("onCompositionStartCapture=");
    expect(source).toContain("onCompositionEndCapture=");
    expect(source).toContain("onBlurCapture=");
    expect(source).not.toContain("onKeyDown");
    expect(source).not.toContain("addEventListener(\"keydown\"");
    expect(source).not.toContain("addEventListener('keydown'");
  });

  it("clears pending save when the active editor or project context changes", () => {
    const source = readFileSync("src/renderer/App.tsx", "utf8");

    expect(source).toContain(
      'imeCompositionSaveGuard.clearPendingSave("active_editor_changed")'
    );
    expect(source).toContain(
      'imeCompositionSaveGuard.clearPendingSave("project_context_changed")'
    );
    expect(source).toContain("activeDocument.id");
    expect(source).toContain("activeProjectContext?.rootPath");
    expect(source).toContain("onBlurCapture={handleAppBlurCapture}");
    expect(source).toContain("() => {");
    expect(source).toContain(
      'imeCompositionSaveGuard.clearPendingSave("unmount")'
    );
    expect(source).toContain(
      'imeCompositionSaveGuard.clearPendingSave("focus_left_app_shell")'
    );
    expect(source).toContain('event: "ime.focus.checked"');
  });

  it("keeps save in-flight guarding in the save function", () => {
    const source = readFileSync("src/renderer/App.tsx", "utf8");

    expect(source).toContain("async function saveFile(");
    expect(source).toContain("saveInFlightGuard.run<SaveFileOutcome>(");
    expect(source).toContain('event: "save.requested"');
    expect(source).toContain('event: "save.in_flight.ignored"');
    expect(source).toContain('event: "save.started"');
    expect(source).toContain('event: "save.skipped"');
    expect(source).toContain('event: "save.succeeded"');
    expect(source).toContain('event: "save.failed"');
    expect(source).not.toContain("isEnabled: () => saveInFlight");
  });
});
