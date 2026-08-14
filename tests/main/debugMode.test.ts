import { describe, expect, it } from "vitest";
import { parseDebugModeFromArgv } from "../../src/main/debugMode";

describe("parseDebugModeFromArgv", () => {
  it("enables debug mode for case-insensitive --pergamum-debug arguments", () => {
    expect(parseDebugModeFromArgv(["electron", ".", "--pergamum-debug"])).toBe(
      true
    );
    expect(parseDebugModeFromArgv(["electron", ".", "--Pergamum-debug"])).toBe(
      true
    );
    expect(parseDebugModeFromArgv(["electron", ".", "--PERGAMUM-DEBUG"])).toBe(
      true
    );
  });

  it("does not treat adjacent debug options as Pergamum debug mode", () => {
    expect(parseDebugModeFromArgv(["electron", ".", "--debug"])).toBe(false);
    expect(parseDebugModeFromArgv(["electron", ".", "--pg-debug"])).toBe(false);
    expect(parseDebugModeFromArgv(["electron", ".", "-d"])).toBe(false);
    expect(
      parseDebugModeFromArgv(["electron", ".", "--pergamum-debug=true"])
    ).toBe(false);
    expect(
      parseDebugModeFromArgv(["electron", ".", "--pergamum-debug=1"])
    ).toBe(false);
    expect(
      parseDebugModeFromArgv(["electron", ".", "--pergamum-debug", "true"])
    ).toBe(false);
  });
});
