import { describe, expect, it } from "vitest";
import type { GlossaryFormMatchBoundary } from "../../src/shared/glossary";
import { shouldAcceptGlossarySurfaceBoundary } from "../../src/shared/glossarySurfaceBoundary";

function acceptBoundary(
  text: string,
  matchedText: string,
  matchBoundaryLeft: GlossaryFormMatchBoundary = "auto",
  matchBoundaryRight: GlossaryFormMatchBoundary = "auto",
  occurrence = 0
): boolean {
  let start = -1;
  let cursor = 0;

  for (let index = 0; index <= occurrence; index += 1) {
    start = text.indexOf(matchedText, cursor);
    cursor = start + matchedText.length;
  }

  expect(start).toBeGreaterThanOrEqual(0);

  return shouldAcceptGlossarySurfaceBoundary({
    text,
    start,
    end: start + matchedText.length,
    matchBoundaryLeft,
    matchBoundaryRight
  });
}

describe("glossary surface boundary resolver", () => {
  it("accepts text boundary edges", () => {
    expect(acceptBoundary("PergamumIDE", "Pergamum", "auto", "none")).toBe(
      true
    );
    expect(
      acceptBoundary("SuperPergamum", "Pergamum", "none", "auto")
    ).toBe(true);
  });

  it("applies Katakana continuation checks for auto policy", () => {
    expect(acceptBoundary("オーダーメイド", "オーダ")).toBe(false);
    expect(acceptBoundary("オーダは沈黙した。", "オーダ")).toBe(true);
    expect(acceptBoundary("オーダーメイド", "オーダー")).toBe(false);
    expect(acceptBoundary("オーダーは沈黙した。", "オーダー")).toBe(true);
  });

  it("treats Katakana marks and punctuation-like characters as Other", () => {
    expect(acceptBoundary("ヤマダノヽ", "ヤマダノ")).toBe(true);
    expect(acceptBoundary("ヤマダノヾ", "ヤマダノ")).toBe(true);
    expect(acceptBoundary("ジャン・ヴァルジャン", "ジャン")).toBe(true);
    expect(acceptBoundary("ジャン゠ヴァルジャン", "ジャン")).toBe(true);
  });

  it("rejects a later Katakana occurrence with a Katakana left continuation", () => {
    expect(
      acceptBoundary("ジャン・ヴァルジャン", "ジャン", "auto", "auto", 1)
    ).toBe(false);
  });

  it("applies ASCII word continuation checks for auto policy", () => {
    expect(acceptBoundary("PergamumIDE", "Pergamum")).toBe(false);
    expect(acceptBoundary("Pergamum2", "Pergamum")).toBe(false);
    expect(acceptBoundary("Pergamum_IDE", "Pergamum")).toBe(false);
    expect(acceptBoundary("Pergamum is an IDE.", "Pergamum")).toBe(true);
    expect(acceptBoundary("Pergamum.IDE", "Pergamum")).toBe(true);
  });

  it("lets none disable a target edge independently", () => {
    expect(acceptBoundary("オーダーメイド", "オーダ", "auto", "none")).toBe(
      true
    );
    expect(acceptBoundary("オーダーメイド", "メイド", "auto", "auto")).toBe(
      false
    );
    expect(acceptBoundary("オーダーメイド", "メイド", "none", "auto")).toBe(
      true
    );
  });

  it("uses the same implemented concrete checks for strict and auto", () => {
    expect(acceptBoundary("オーダーメイド", "オーダ", "auto", "auto")).toBe(
      acceptBoundary("オーダーメイド", "オーダ", "strict", "strict")
    );
    expect(acceptBoundary("PergamumIDE", "Pergamum", "auto", "auto")).toBe(
      acceptBoundary("PergamumIDE", "Pergamum", "strict", "strict")
    );
    expect(acceptBoundary("お館さまがお呼びです。", "お館さま")).toBe(
      acceptBoundary("お館さまがお呼びです。", "お館さま", "strict", "strict")
    );
  });

  it("passes unresolved Hiragana, Kanji, Odoriji, and mixed-script edges", () => {
    expect(acceptBoundary("お館さまがお呼びです。", "お館さま")).toBe(true);
    expect(acceptBoundary("領主館", "領主")).toBe(true);
    expect(acceptBoundary("オー領主", "領主")).toBe(true);
    expect(acceptBoundary("山田野々", "山田")).toBe(true);
    expect(acceptBoundary("やまだのゝ", "やまだの")).toBe(true);
  });
});
