import { describe, expect, it } from "vitest";
import { createDocumentOpenIdFactory } from "../../src/renderer/documentOpenId";

describe("createDocumentOpenIdFactory", () => {
  it("returns a different id on every call", () => {
    const nextId = createDocumentOpenIdFactory();

    const first = nextId();
    const second = nextId();
    const third = nextId();

    expect(new Set([first, second, third]).size).toBe(3);
  });

  it("returns ids matching the safe-code pattern used by the debug log sanitizer", () => {
    const nextId = createDocumentOpenIdFactory();
    const safeCodePattern = /^[A-Za-z0-9_.-]{1,80}$/;

    expect(nextId()).toMatch(safeCodePattern);
    expect(nextId()).toMatch(safeCodePattern);
  });

  it("does not derive ids from any file path or content — each factory starts its own independent counter", () => {
    const first = createDocumentOpenIdFactory();
    const second = createDocumentOpenIdFactory();

    expect(first()).toBe(second());
  });
});
