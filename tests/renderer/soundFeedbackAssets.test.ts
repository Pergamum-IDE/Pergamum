import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("sound feedback assets (#200)", () => {
  it("documents the third-party typewriter sound source, license, and Pergamum usage", () => {
    const readme = readFileSync("assets/sounds/README.md", "utf8");

    expect(readme).toContain("OpenGameArt - Typewriter sounds");
    expect(readme).toContain("https://opengameart.org/content/typewriter-sounds");
    expect(readme).toContain("License: CC0");
    expect(readme).toContain("License checked: 2026-08-22");
    expect(readme).toContain("newline sound: `typewriter8.wav`");
    expect(readme).toContain("keypress sound: `typewriter1.wav`");
  });

  it("keeps the committed typewriter wav set at typewriter1-8", () => {
    for (let index = 1; index <= 8; index += 1) {
      expect(existsSync(`assets/sounds/typewriter${index}.wav`)).toBe(true);
    }
  });
});
