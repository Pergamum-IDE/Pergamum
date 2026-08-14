import { describe, expect, it } from "vitest";
import { parseDebugModeFromArgv } from "../../src/main/debugMode";

describe("parseDebugModeFromArgv", () => {
  it("enables debug mode only for an exact --pergamum-debug argument", () => {
    expect(parseDebugModeFromArgv(["electron", ".", "--pergamum-debug"])).toBe(
      true
    );
  });

  it("does not treat adjacent debug options as Pergamum debug mode", () => {
    expect(parseDebugModeFromArgv(["electron", ".", "--debug"])).toBe(false);
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
