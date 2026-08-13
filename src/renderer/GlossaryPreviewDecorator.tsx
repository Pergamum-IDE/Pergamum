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
): void {
  const parentNode = textNode.parentNode;

  if (!parentNode || !segments.some((segment) => segment.kind === "match")) {
    return;
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
}

function decoratePreviewContainer(
  container: HTMLElement,
  surfaceIndex: GlossarySurfaceIndex,
  onHoverMatch: (match: GlossarySurfaceTextMatch, anchorRect: DOMRect) => void,
  onLeaveMatch: () => void
): void {
  if (surfaceIndex.entries.length === 0) {
    return;
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

  for (const textNode of textNodes) {
    replaceTextNodeWithDecorationSegments(
      textNode,
      buildGlossarySurfaceDecorationSegments(
        textNode.textContent ?? "",
        surfaceIndex
      ),
      onHoverMatch,
      onLeaveMatch
    );
  }
}

export function GlossaryPreviewDecorator({
  previewHtml,
  entries,
  surfaceIndex
}: GlossaryPreviewDecoratorProps): JSX.Element {
  const previewRef = useRef<HTMLElement | null>(null);
  const [hoverCardState, setHoverCardState] =
    useState<GlossaryHoverCardState>(null);
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
    decoratePreviewContainer(
      previewElement,
      surfaceIndex,
      (match, anchorRect) => setHoverCardState({ match, anchorRect }),
      () => setHoverCardState(null)
    );
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
