import { describe, expect, it } from "vitest";
import { resolveQuickAccessInput } from "../../src/renderer/quickAccessPrefixResolver";

describe("resolveQuickAccessInput", () => {
  it("trims the whole input before deciding mode", () => {
    expect(resolveQuickAccessInput(" >save")).toEqual({
      mode: "command",
      query: "save"
    });
    expect(resolveQuickAccessInput(" save")).toEqual({
      mode: "reservedNoPrefix",
      query: "save"
    });
  });

  it("treats an empty string as command mode with an empty query", () => {
    expect(resolveQuickAccessInput("")).toEqual({ mode: "command", query: "" });
  });

  it("treats whitespace-only input (including full-width space) as command mode with an empty query", () => {
    expect(resolveQuickAccessInput("   ")).toEqual({
      mode: "command",
      query: ""
    });
    expect(resolveQuickAccessInput("　")).toEqual({
      mode: "command",
      query: ""
    });
  });

  it("resolves > and ＞ to command mode", () => {
    expect(resolveQuickAccessInput(">save")).toEqual({
      mode: "command",
      query: "save"
    });
    expect(resolveQuickAccessInput("＞save")).toEqual({
      mode: "command",
      query: "save"
    });
  });

  it("treats a lone > or ＞ as command mode with an empty query", () => {
    expect(resolveQuickAccessInput(">")).toEqual({ mode: "command", query: "" });
    expect(resolveQuickAccessInput("＞")).toEqual({
      mode: "command",
      query: ""
    });
  });

  it("trims the space after the prefix so >save and > save produce the same query", () => {
    expect(resolveQuickAccessInput(">save")).toEqual(
      resolveQuickAccessInput("> save")
    );
    expect(resolveQuickAccessInput("＞save")).toEqual(
      resolveQuickAccessInput("＞ save")
    );
  });

  it("resolves # and ＃ to reservedGlossary", () => {
    expect(resolveQuickAccessInput("#オーダ")).toEqual({
      mode: "reservedGlossary",
      query: "オーダ"
    });
    expect(resolveQuickAccessInput("＃オーダ")).toEqual({
      mode: "reservedGlossary",
      query: "オーダ"
    });
  });

  it("resolves / and ／ to reservedSearch", () => {
    expect(resolveQuickAccessInput("/検索")).toEqual({
      mode: "reservedSearch",
      query: "検索"
    });
    expect(resolveQuickAccessInput("／検索")).toEqual({
      mode: "reservedSearch",
      query: "検索"
    });
  });

  it("resolves non-empty input without a known prefix to reservedNoPrefix", () => {
    expect(resolveQuickAccessInput("plain text")).toEqual({
      mode: "reservedNoPrefix",
      query: "plain text"
    });
  });

  it("does not normalize the query body beyond trimming", () => {
    expect(resolveQuickAccessInput(">  Save   Now  ")).toEqual({
      mode: "command",
      query: "Save   Now"
    });
  });
});
