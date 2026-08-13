import type { GlossarySurfaceTextMatch } from "./glossarySurfaceMatching";

export function renderGlossaryMatchesForDebug(
  text: string,
  matches: readonly GlossarySurfaceTextMatch[]
): string {
  let cursor = 0;
  let rendered = "";

  for (const match of matches) {
    rendered += text.slice(cursor, match.range.start);
    rendered += `[${text.slice(match.range.start, match.range.end)}]`;
    cursor = match.range.end;
  }

  return rendered + text.slice(cursor);
}
