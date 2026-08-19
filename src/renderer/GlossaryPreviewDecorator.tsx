import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from "react";
import {
  isAmbiguousGlossarySurfaceTextMatch,
  type GlossarySurfaceIndex,
  type GlossarySurfaceTextMatch
} from "../shared/glossarySurfaceMatching";
import type { GlossaryEntry } from "../shared/glossary";
import { durationSincePerformanceMark } from "./debugLog";
import { GlossaryHoverCard } from "./GlossaryHoverCard";
import { buildGlossaryHoverCardContent } from "./glossaryHoverCardContent";
import {
  buildGlossarySurfaceDecorationSegments,
  shouldSkipGlossarySurfaceDecorationTextNode
} from "./glossarySurfaceDecoration";

interface GlossaryPreviewDecoratorProps {
  previewHtml: string;
  entries: readonly GlossaryEntry[];
  surfaceIndex: GlossarySurfaceIndex;
  /** In-flight document-open correlation id (#152), or null when idle. */
  documentOpenId: string | null;
  /**
   * `performance.now()` mark from the start of this document's preview
   * render (#154) — the same boundary `previewRender.completed` uses, so
   * `previewDom.committed`'s duration stays comparable to it.
   */
  previewRenderStartedAt: number;
  /** Fired once after the preview HTML has been written into the live DOM. */
  onPreviewDomCommitted: (
    documentOpenId: string,
    durationMs: number,
    previewNodeCount: number
  ) => void;
  /** Fired once after decoratePreviewContainer finishes. */
  onPreviewDecorationCompleted: (
    documentOpenId: string,
    durationMs: number,
    visitedTextNodeCount: number,
    decoratedNodeCount: number,
    matchCount: number
  ) => void;
}

interface PreviewDecorationStats {
  visitedTextNodeCount: number;
  decoratedNodeCount: number;
  matchCount: number;
}

type GlossaryHoverCardState = {
  match: GlossarySurfaceTextMatch;
  anchorRect: DOMRect;
} | null;

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function hoverCardLayerStyle(anchorRect: DOMRect): CSSProperties {
  const margin = 8;
  const cardWidth = 320;
  const topOffset = 6;

  return {
    left: clamp(
      anchorRect.left,
      margin,
      window.innerWidth - cardWidth - margin
    ),
    top: clamp(
      anchorRect.bottom + topOffset,
      margin,
      window.innerHeight - 48
    )
  };
}

function replaceTextNodeWithDecorationSegments(
  textNode: Text,
  segments: ReturnType<typeof buildGlossarySurfaceDecorationSegments>,
  onHoverMatch: (match: GlossarySurfaceTextMatch, anchorRect: DOMRect) => void,
  onLeaveMatch: () => void
): number {
  const parentNode = textNode.parentNode;
  const matchSegmentCount = segments.filter(
    (segment) => segment.kind === "match"
  ).length;

  if (!parentNode || matchSegmentCount === 0) {
    return 0;
  }

  const fragment = textNode.ownerDocument.createDocumentFragment();

  for (const segment of segments) {
    if (segment.kind === "plain") {
      fragment.appendChild(
        textNode.ownerDocument.createTextNode(segment.text)
      );
      continue;
    }

    const span = textNode.ownerDocument.createElement("span");
    span.className = "glossarySurfaceDecoration";
    span.textContent = segment.match.matchedText;
    span.dataset.glossarySurface = segment.match.matchedText;
    span.dataset.glossaryAmbiguous =
      isAmbiguousGlossarySurfaceTextMatch(segment.match) ? "true" : "false";
    span.addEventListener("mouseenter", () => {
      onHoverMatch(segment.match, span.getBoundingClientRect());
    });
    span.addEventListener("mouseleave", onLeaveMatch);
    fragment.appendChild(span);
  }

  parentNode.replaceChild(fragment, textNode);

  return matchSegmentCount;
}

function decoratePreviewContainer(
  container: HTMLElement,
  surfaceIndex: GlossarySurfaceIndex,
  onHoverMatch: (match: GlossarySurfaceTextMatch, anchorRect: DOMRect) => void,
  onLeaveMatch: () => void
): PreviewDecorationStats {
  if (surfaceIndex.entries.length === 0) {
    return { visitedTextNodeCount: 0, decoratedNodeCount: 0, matchCount: 0 };
  }

  const textNodes: Text[] = [];
  const treeWalker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT
  );
  let currentNode = treeWalker.nextNode();

  while (currentNode) {
    if (
      currentNode instanceof Text &&
      !shouldSkipGlossarySurfaceDecorationTextNode(
        currentNode.parentElement
      )
    ) {
      textNodes.push(currentNode);
    }

    currentNode = treeWalker.nextNode();
  }

  let decoratedNodeCount = 0;
  let matchCount = 0;

  for (const textNode of textNodes) {
    const matchSegmentCount = replaceTextNodeWithDecorationSegments(
      textNode,
      buildGlossarySurfaceDecorationSegments(
        textNode.textContent ?? "",
        surfaceIndex
      ),
      onHoverMatch,
      onLeaveMatch
    );

    if (matchSegmentCount > 0) {
      decoratedNodeCount += 1;
      matchCount += matchSegmentCount;
    }
  }

  return { visitedTextNodeCount: textNodes.length, decoratedNodeCount, matchCount };
}

export function GlossaryPreviewDecorator({
  previewHtml,
  entries,
  surfaceIndex,
  documentOpenId,
  previewRenderStartedAt,
  onPreviewDomCommitted,
  onPreviewDecorationCompleted
}: GlossaryPreviewDecoratorProps): JSX.Element {
  const previewRef = useRef<HTMLElement | null>(null);
  const [hoverCardState, setHoverCardState] =
    useState<GlossaryHoverCardState>(null);
  // Guards against React StrictMode's dev-only double layout-effect
  // invocation, and against re-firing for the same open on a later,
  // unrelated re-run of this effect — mirrors the reportedDocumentOpenIdRef
  // pattern in EditorSurface.tsx (#152). Each ref is keyed on its own event
  // so a slow decoration pass reporting late can't suppress the (already
  // reported) DOM-commit event or vice versa.
  const reportedPreviewDomCommitDocumentOpenIdRef = useRef<string | null>(
    null
  );
  const reportedPreviewDecorationDocumentOpenIdRef = useRef<string | null>(
    null
  );
  const hoverCardContent = useMemo(
    () =>
      hoverCardState
        ? buildGlossaryHoverCardContent(hoverCardState.match, entries)
        : null,
    [entries, hoverCardState]
  );
  const hoverCardStyle = useMemo(
    () =>
      hoverCardState
        ? hoverCardLayerStyle(hoverCardState.anchorRect)
        : undefined,
    [hoverCardState]
  );

  useLayoutEffect(() => {
    const previewElement = previewRef.current;

    if (!previewElement) {
      return;
    }

    setHoverCardState(null);
    previewElement.innerHTML = previewHtml;

    // Proxy measurement (#154): React's own commit timing isn't directly
    // observable, so this layout effect firing — which runs synchronously
    // right after React commits this subtree's DOM, before the browser
    // paints — stands in for "commit observed". durationMs is cumulative
    // from previewRenderStartedAt (this render's start), so it covers
    // React's reconciliation/commit/effect-scheduling gap plus the innerHTML
    // write above. It does NOT guarantee the browser has finished layout or
    // painted. documentOpenId/previewRenderStartedAt are read from this
    // render's closure rather than listed as effect deps, so an ordinary
    // content edit (which changes previewHtml but not the open) can't
    // resurrect a since-cleared documentOpenId and misreport itself as part
    // of the open.
    if (
      documentOpenId &&
      reportedPreviewDomCommitDocumentOpenIdRef.current !== documentOpenId
    ) {
      reportedPreviewDomCommitDocumentOpenIdRef.current = documentOpenId;
      onPreviewDomCommitted(
        documentOpenId,
        durationSincePerformanceMark(previewRenderStartedAt),
        previewElement.childElementCount
      );
    }

    const decorationStartedAt = performance.now();
    const decorationStats = decoratePreviewContainer(
      previewElement,
      surfaceIndex,
      (match, anchorRect) => setHoverCardState({ match, anchorRect }),
      () => setHoverCardState(null)
    );

    if (
      documentOpenId &&
      reportedPreviewDecorationDocumentOpenIdRef.current !== documentOpenId
    ) {
      reportedPreviewDecorationDocumentOpenIdRef.current = documentOpenId;
      onPreviewDecorationCompleted(
        documentOpenId,
        durationSincePerformanceMark(decorationStartedAt),
        decorationStats.visitedTextNodeCount,
        decorationStats.decoratedNodeCount,
        decorationStats.matchCount
      );
    }
    // documentOpenId/previewRenderStartedAt/onPreviewDomCommitted/
    // onPreviewDecorationCompleted are deliberately excluded: this effect
    // must only re-run when the preview content itself changes (open or
    // edit), never merely because App.tsx cleared documentOpenId after
    // handleDocumentOpenMeasured — see comment above.
  }, [previewHtml, surfaceIndex]);

  return (
    <>
      <article className="preview" ref={previewRef} />
      {hoverCardContent && hoverCardStyle ? (
        <div className="glossaryHoverCardLayer" style={hoverCardStyle}>
          <GlossaryHoverCard content={hoverCardContent} />
        </div>
      ) : null}
    </>
  );
}
