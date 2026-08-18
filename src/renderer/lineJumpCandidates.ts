import { formatLineJumpLinePreview, type LineJumpLinePreview } from "./lineJumpPreview";

/**
 * Hard-coded for now (#148); a later settings-backed issue can override it
 * at the call site the same way `formatLineJumpLinePreview`'s
 * length/ellipsis are overridable.
 */
export const DEFAULT_MAX_LINE_JUMP_CANDIDATES = 20;

export interface LineJumpCandidate {
  readonly line: number;
  readonly preview: LineJumpLinePreview;
}

export interface LineJumpCandidateResolution {
  readonly candidates: readonly LineJumpCandidate[];
  /** Total prefix matches in `1..lineCount`, including any not displayed. */
  readonly totalMatchCount: number;
}

export interface ResolveLineJumpCandidatesInput {
  /** The normalized decimal string of the already-valid line query, e.g. "7" for ":007". */
  readonly prefixQuery: string;
  readonly lineCount: number;
  readonly maxCandidates?: number;
  readonly getLineText: (line: number) => string;
}

/**
 * Line-number prefix matching, not text search: a candidate line number's
 * decimal string must start with `prefixQuery` (`String(line).startsWith(
 * prefixQuery)`), so `:1` matches 1, 10-19, 100-199, ... but never 21 or 31.
 *
 * Ordering: the exact match (`Number(prefixQuery)`) always comes first when
 * it exists, followed by every other prefix match in ascending line-number
 * order. Every prefix match other than the exact one is numerically >= the
 * exact value (a same-length match can only be the exact value itself; a
 * longer match is a superset of the same leading digits and therefore
 * larger) — so if the exact value exceeds `lineCount`, no candidate can
 * exist at all, which is exactly the caller's out-of-range signal.
 *
 * `candidates` stops growing at `maxCandidates`, but the scan continues to
 * `lineCount` regardless so `totalMatchCount` (used for the "N more
 * candidates" footer, #148 follow-up) is accurate. `getLineText` (the
 * potentially expensive part — see `createLineJumpEditorSnapshot`) is only
 * called for lines that actually become a *displayed* candidate; matching a
 * line past the display limit only increments a counter.
 */
export function resolveLineJumpCandidates(
  input: ResolveLineJumpCandidatesInput
): LineJumpCandidateResolution {
  const {
    prefixQuery,
    lineCount,
    maxCandidates = DEFAULT_MAX_LINE_JUMP_CANDIDATES,
    getLineText
  } = input;
  const exactLine = Number(prefixQuery);
  const candidates: LineJumpCandidate[] = [];
  let totalMatchCount = 0;

  function pushCandidate(line: number): void {
    candidates.push({
      line,
      preview: formatLineJumpLinePreview(getLineText(line))
    });
  }

  const exactLineInRange = exactLine >= 1 && exactLine <= lineCount;

  if (exactLineInRange) {
    totalMatchCount += 1;
    pushCandidate(exactLine);
  }

  for (let line = 1; line <= lineCount; line += 1) {
    if (line === exactLine) {
      continue;
    }

    if (String(line).startsWith(prefixQuery)) {
      totalMatchCount += 1;

      if (candidates.length < maxCandidates) {
        pushCandidate(line);
      }
    }
  }

  return { candidates, totalMatchCount };
}
