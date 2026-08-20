/**
 * Pure helpers for the safe aggregate document-size metrics attached to
 * `document.open.completed` (#161). These operate on the document's current
 * in-memory content — the same string passed to `markdownPreviewRenderer` —
 * not the raw file bytes read from disk. `src/main/debugLogSanitizer.ts`
 * already has a similarly-named `debugLogLineCount` for the main-process
 * file-read event (`document.open.fileRead.completed`'s `lineCount`); that
 * one is intentionally not reused here so the two measurement boundaries
 * (main-process file read vs. renderer in-memory document) stay independent
 * and neither has to cross the main/renderer project split to share logic.
 */

function documentLines(content: string): string[] {
  return content.split(/\r\n|\r|\n/);
}

/** UTF-16 code unit count of `content` (JavaScript string `.length`). */
export function documentCharCount(content: string): number {
  return content.length;
}

/**
 * Logical line count, splitting on any line-ending style (LF/CRLF/CR mixed
 * or not). 0 for empty content, matching `debugLogLineCount`'s convention.
 */
export function documentLineCount(content: string): number {
  return content.length === 0 ? 0 : documentLines(content).length;
}

/**
 * Length (UTF-16 code units) of the longest logical line. 0 for empty
 * content.
 */
export function documentMaxLineLength(content: string): number {
  if (content.length === 0) {
    return 0;
  }

  return documentLines(content).reduce(
    (longest, line) => Math.max(longest, line.length),
    0
  );
}
