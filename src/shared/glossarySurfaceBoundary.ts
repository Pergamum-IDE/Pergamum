import type { GlossaryFormMatchBoundary } from "./glossary";

export interface GlossaryBoundaryContext {
  text: string;
  start: number;
  end: number;
  matchBoundaryLeft: GlossaryFormMatchBoundary;
  matchBoundaryRight: GlossaryFormMatchBoundary;
}

type GlossaryBoundaryCharacterClass = "asciiWord" | "katakana" | "other";

function isAsciiWordCodeUnit(codeUnit: number): boolean {
  return (
    (codeUnit >= 0x30 && codeUnit <= 0x39) ||
    (codeUnit >= 0x41 && codeUnit <= 0x5a) ||
    codeUnit === 0x5f ||
    (codeUnit >= 0x61 && codeUnit <= 0x7a)
  );
}

function isKatakanaCodeUnit(codeUnit: number): boolean {
  return (codeUnit >= 0x30a1 && codeUnit <= 0x30fa) || codeUnit === 0x30fc;
}

function boundaryCharacterClass(
  codeUnit: number
): GlossaryBoundaryCharacterClass {
  if (isKatakanaCodeUnit(codeUnit)) {
    return "katakana";
  }

  if (isAsciiWordCodeUnit(codeUnit)) {
    return "asciiWord";
  }

  return "other";
}

function shouldAcceptConcreteBoundary(
  matchedEdgeCodeUnit: number,
  adjacentCodeUnit: number
): boolean {
  const matchedEdgeClass = boundaryCharacterClass(matchedEdgeCodeUnit);

  if (matchedEdgeClass === "other") {
    return true;
  }

  return matchedEdgeClass !== boundaryCharacterClass(adjacentCodeUnit);
}

function shouldAcceptBoundaryEdge(
  text: string,
  matchedEdgeIndex: number,
  adjacentIndex: number,
  policy: GlossaryFormMatchBoundary
): boolean {
  if (policy === "none") {
    return true;
  }

  if (adjacentIndex < 0 || adjacentIndex >= text.length) {
    return true;
  }

  const matchedEdgeCodeUnit = text.charCodeAt(matchedEdgeIndex);
  const adjacentCodeUnit = text.charCodeAt(adjacentIndex);

  switch (policy) {
    case "auto":
      return shouldAcceptConcreteBoundary(
        matchedEdgeCodeUnit,
        adjacentCodeUnit
      );
    case "strict":
      return shouldAcceptConcreteBoundary(
        matchedEdgeCodeUnit,
        adjacentCodeUnit
      );
  }
}

export function shouldAcceptGlossarySurfaceBoundary(
  context: GlossaryBoundaryContext
): boolean {
  return (
    shouldAcceptBoundaryEdge(
      context.text,
      context.start,
      context.start - 1,
      context.matchBoundaryLeft
    ) &&
    shouldAcceptBoundaryEdge(
      context.text,
      context.end - 1,
      context.end,
      context.matchBoundaryRight
    )
  );
}
