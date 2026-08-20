import { beforeEach, describe, expect, it, vi } from "vitest";

const fsMock = vi.hoisted(() => ({
  readFile: vi.fn()
}));

vi.mock("node:fs", () => ({
  promises: fsMock
}));

import { readProjectConfig } from "../../src/main/projectConfigStore";

describe("projectConfigStore preview.renderer (#150 consumer replacement)", () => {
  beforeEach(() => {
    fsMock.readFile.mockReset();
  });

  it("returns null when pergamum.json is missing (unchanged behavior)", async () => {
    fsMock.readFile.mockRejectedValue(
      Object.assign(new Error("not found"), { code: "ENOENT" })
    );

    const config = await readProjectConfig("C:\\fake-project");

    expect(config).toBeNull();
  });

  it("accepts a valid settings.preview.renderer value", async () => {
    fsMock.readFile.mockResolvedValue(
      JSON.stringify({
        name: "My Project",
        settings: { preview: { renderer: "markdown" } }
      })
    );

    const config = await readProjectConfig("C:\\fake-project");

    expect(config?.settings?.preview?.renderer).toBe("markdown");
  });

  it("still throws (project open fails) on an invalid settings.preview.renderer value — #150 does not implement ADR-0006 S-23's reject-entry-and-continue behavior", async () => {
    fsMock.readFile.mockResolvedValue(
      JSON.stringify({
        name: "My Project",
        settings: { preview: { renderer: "html" } }
      })
    );

    await expect(readProjectConfig("C:\\fake-project")).rejects.toThrow(
      /settings\.preview\.renderer must be "markdown"/
    );
  });

  it("returns undefined settings when the settings.preview section is absent (unchanged behavior)", async () => {
    fsMock.readFile.mockResolvedValue(
      JSON.stringify({
        name: "My Project"
      })
    );

    const config = await readProjectConfig("C:\\fake-project");

    expect(config?.settings).toBeUndefined();
  });

  it("still throws on a non-object settings.preview.renderer value (e.g. a number)", async () => {
    fsMock.readFile.mockResolvedValue(
      JSON.stringify({
        name: "My Project",
        settings: { preview: { renderer: 1 } }
      })
    );

    await expect(readProjectConfig("C:\\fake-project")).rejects.toThrow(
      /settings\.preview\.renderer must be "markdown"/
    );
  });

  it("throws when settings.preview is present but empty (renderer missing) — an explicitly declared preview section requires a valid renderer", async () => {
    fsMock.readFile.mockResolvedValue(
      JSON.stringify({
        name: "My Project",
        settings: { preview: {} }
      })
    );

    await expect(readProjectConfig("C:\\fake-project")).rejects.toThrow(
      /settings\.preview\.renderer must be "markdown"/
    );
  });
});
