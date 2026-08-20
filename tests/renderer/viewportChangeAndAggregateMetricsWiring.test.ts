import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("document.open.completed aggregate metrics + layout.viewport.changed wiring (#161 / #162 / #163)", () => {
  const appSource = readFileSync("src/renderer/App.tsx", "utf8");
  const editorSurfaceSource = readFileSync(
    "src/renderer/EditorSurface.tsx",
    "utf8"
  );
  const debugLogSource = readFileSync("src/shared/debugLog.ts", "utf8");

  function functionBody(source: string, startMarker: string): string {
    const start = source.indexOf(startMarker);
    const nextFunctionIndex = source.indexOf("\n  function ", start + 1);
    const end = nextFunctionIndex === -1 ? source.length : nextFunctionIndex;

    expect(start).toBeGreaterThan(-1);

    return source.slice(start, end);
  }

  describe("#161: safe aggregate metrics on document.open.completed", () => {
    it("attaches aggregateMetrics only to document.open.completed, not document.open.usable", () => {
      const body = functionBody(
        appSource,
        "function handleDocumentOpenMeasured("
      );
      const usableIndex = body.indexOf('event: "document.open.usable"');
      const usableBlockEnd = body.indexOf("});", usableIndex);
      const usableBlock = body.slice(usableIndex, usableBlockEnd);
      const completedIndex = body.indexOf('event: "document.open.completed"');
      const completedBlockEnd = body.indexOf("});", completedIndex);
      const completedBlock = body.slice(completedIndex, completedBlockEnd);

      expect(usableBlock).not.toContain("aggregateMetrics");
      expect(completedBlock).toContain("...aggregateMetrics");
    });

    it("computes aggregateMetrics in MarkdownEditorSurface's one-shot effect from the shared documentMetrics helpers and live pane refs, then passes it as onDocumentOpenPreviewRendered's third argument", () => {
      const effectStart = editorSurfaceSource.indexOf(
        "useEffect(() => {\n    if (documentOpenId"
      );
      const effectEnd = editorSurfaceSource.indexOf("}, [documentOpenId]);");
      const effectBody = editorSurfaceSource.slice(effectStart, effectEnd);

      expect(effectBody).toContain(
        "onDocumentOpenPreviewRendered(documentOpenId, previewRenderDurationMs, {"
      );
      expect(effectBody).toContain("documentCharCount: documentCharCount(content)");
      expect(effectBody).toContain("documentLineCount: documentLineCount(content)");
      expect(effectBody).toContain(
        "documentMaxLineLength: documentMaxLineLength(content)"
      );
      expect(effectBody).toContain("appWindowWidth: window.innerWidth");
      expect(effectBody).toContain("appWindowHeight: window.innerHeight");
      expect(effectBody).toContain("editorPaneRef.current?.clientWidth");
      expect(effectBody).toContain("editorPaneRef.current?.clientHeight");
      expect(effectBody).toContain("previewPaneRef.current?.clientWidth");
      expect(effectBody).toContain("previewPaneRef.current?.clientHeight");
    });

    it("imports the aggregate metric helpers from the shared (main+renderer) documentMetrics module rather than duplicating the split logic", () => {
      expect(editorSurfaceSource).toContain(
        'from "../shared/documentMetrics"'
      );
    });

    it("does not include manuscript text, preview HTML, or any raw content string in the aggregate metrics — only counts", () => {
      const effectStart = editorSurfaceSource.indexOf(
        "useEffect(() => {\n    if (documentOpenId"
      );
      const effectEnd = editorSurfaceSource.indexOf("}, [documentOpenId]);");
      const effectBody = editorSurfaceSource.slice(effectStart, effectEnd);

      expect(effectBody).not.toContain("content,");
      expect(effectBody).not.toMatch(/documentContent:\s*content/);
      expect(effectBody).not.toContain("previewHtml");
    });
  });

  describe("#162: debounced layout.viewport.changed", () => {
    it("defines a debounce constant within the 300-500ms range the issue asked for", () => {
      const match = editorSurfaceSource.match(
        /VIEWPORT_CHANGE_DEBOUNCE_MS = (\d+);/
      );

      expect(match).not.toBeNull();

      const debounceMs = Number(match?.[1]);

      expect(debounceMs).toBeGreaterThanOrEqual(300);
      expect(debounceMs).toBeLessThanOrEqual(500);
    });

    it("watches both the app window (resize event) and the editor/preview panes (ResizeObserver), debounced through a single setTimeout", () => {
      const hookStart = editorSurfaceSource.indexOf(
        "function useDebouncedViewportChangeDebugLog("
      );
      const hookEnd = editorSurfaceSource.indexOf(
        "\nfunction ",
        hookStart + 1
      );
      const hookBody = editorSurfaceSource.slice(hookStart, hookEnd);

      expect(hookStart).toBeGreaterThan(-1);
      expect(hookBody).toContain('window.addEventListener("resize"');
      expect(hookBody).toContain("new ResizeObserver(");
      expect(hookBody).toContain("clearTimeout(debounceTimeoutId)");
      expect(hookBody).toContain("setTimeout(() => {");
      expect(hookBody).toContain("VIEWPORT_CHANGE_DEBOUNCE_MS");
    });

    it("does not report on the ResizeObserver's initial (mount) callback — only establishes a size baseline", () => {
      const hookStart = editorSurfaceSource.indexOf(
        "function useDebouncedViewportChangeDebugLog("
      );
      const hookEnd = editorSurfaceSource.indexOf(
        "\nfunction ",
        hookStart + 1
      );
      const hookBody = editorSurfaceSource.slice(hookStart, hookEnd);

      expect(hookBody).toContain("hasEstablishedBaseline");
      expect(hookBody).toMatch(
        /if \(!hasEstablishedBaseline\) \{\s*hasEstablishedBaseline = true;\s*lastReportedSizes = currentSizes\(\);\s*return;\s*\}/
      );
    });

    it("skips reporting when the debounced size settles back to the last reported size (no-op suppression)", () => {
      const hookStart = editorSurfaceSource.indexOf(
        "function useDebouncedViewportChangeDebugLog("
      );
      const hookEnd = editorSurfaceSource.indexOf(
        "\nfunction ",
        hookStart + 1
      );
      const hookBody = editorSurfaceSource.slice(hookStart, hookEnd);

      expect(hookBody).toContain("viewportSizesEqual(lastReportedSizes, sizes)");
    });

    it("cleans up the resize listener, ResizeObserver, and any pending debounce timeout on unmount", () => {
      const hookStart = editorSurfaceSource.indexOf(
        "function useDebouncedViewportChangeDebugLog("
      );
      const hookEnd = editorSurfaceSource.indexOf(
        "\nfunction ",
        hookStart + 1
      );
      const hookBody = editorSurfaceSource.slice(hookStart, hookEnd);
      const cleanupStart = hookBody.lastIndexOf("return () => {");
      const cleanupBody = hookBody.slice(cleanupStart);

      expect(cleanupBody).toContain(
        'window.removeEventListener("resize", handleWindowResize)'
      );
      expect(cleanupBody).toContain("resizeObserver.disconnect()");
      expect(cleanupBody).toContain("clearTimeout(debounceTimeoutId)");
    });

    it("gives windowResize priority over paneResize within one pending debounce window (a window resize also cascades into a pane ResizeObserver firing)", () => {
      const hookStart = editorSurfaceSource.indexOf(
        "function useDebouncedViewportChangeDebugLog("
      );
      const hookEnd = editorSurfaceSource.indexOf(
        "\nfunction ",
        hookStart + 1
      );
      const hookBody = editorSurfaceSource.slice(hookStart, hookEnd);

      expect(hookBody).toContain(
        'if (source === "windowResize" || pendingSource === "unknown") {'
      );
    });

    it("threads onViewportChanged from App.tsx through EditorSurface to MarkdownEditorSurface, wired to useDebouncedViewportChangeDebugLog", () => {
      const componentIndex = appSource.indexOf("<EditorSurface");
      const closeIndex = appSource.indexOf("/>", componentIndex);
      const propsBlock = appSource.slice(componentIndex, closeIndex);

      expect(propsBlock).toContain(
        "onViewportChanged={handleViewportChanged}"
      );

      const editorSurfaceComponentStart = editorSurfaceSource.indexOf(
        "export function EditorSurface("
      );
      const editorSurfaceComponentEnd = editorSurfaceSource.indexOf(
        "\ninterface MarkdownEditorSurfaceProps"
      );
      const editorSurfaceComponentBody = editorSurfaceSource.slice(
        editorSurfaceComponentStart,
        editorSurfaceComponentEnd
      );

      expect(editorSurfaceComponentBody).toContain(
        "onViewportChanged={onViewportChanged}"
      );
      expect(editorSurfaceSource).toContain(
        "useDebouncedViewportChangeDebugLog(\n    editorPaneRef,\n    previewPaneRef,\n    onViewportChanged\n  );"
      );
    });

    it("App.tsx's handleViewportChanged is not gated by documentOpenId/documentOpenMeasurement — layout changes can be reported outside an in-flight open", () => {
      const body = functionBody(appSource, "function handleViewportChanged(");

      expect(body).not.toContain("documentOpenMeasurement");
      expect(body).not.toContain("documentOpenId");
      expect(body).toContain('event: "layout.viewport.changed"');
    });

    it("does not call logRendererDebugEvent directly in EditorSurface.tsx — logging stays centralized in App.tsx (same convention as #154)", () => {
      expect(editorSurfaceSource).not.toContain("logRendererDebugEvent");
    });

    it("attaches editorPaneRef/previewPaneRef to the editor and preview .pane sections so clientWidth/clientHeight reflect the real rendered panes", () => {
      expect(editorSurfaceSource).toMatch(
        /aria-label=\{translate\("workspace\.markdownEditor"\)\}\s*ref=\{editorPaneRef\}/
      );
      expect(editorSurfaceSource).toMatch(
        /aria-label=\{translate\("workspace\.markdownPreview"\)\}\s*ref=\{previewPaneRef\}/
      );
    });
  });

  describe("#163: seq/timestamp/durationMs ordering clarification (documentation only)", () => {
    it("documents that seq/timestamp reflect emit order, not measurement-occurrence order, on DebugLogEvent", () => {
      const eventInterfaceIndex = debugLogSource.indexOf(
        "export interface DebugLogEvent {"
      );
      const eventInterfaceEnd = debugLogSource.indexOf(
        "export interface SanitizedDebugLogEvent"
      );
      const eventInterfaceBlock = debugLogSource.slice(
        eventInterfaceIndex,
        eventInterfaceEnd
      );

      expect(eventInterfaceIndex).toBeGreaterThan(-1);
      expect(eventInterfaceBlock).toContain("Emit order");
      expect(eventInterfaceBlock).toContain(
        "NOT the chronological order of the moment each event"
      );
      expect(eventInterfaceBlock.toLowerCase()).toContain("durationms");
    });

    it("cross-references the #163 ordering caveat from MarkdownEditorSurface's one-shot effect, where the actual reordering happens", () => {
      const effectCommentStart = editorSurfaceSource.indexOf(
        "// #163: this is a *passive* effect"
      );

      expect(effectCommentStart).toBeGreaterThan(-1);
      expect(
        editorSurfaceSource.slice(effectCommentStart, effectCommentStart + 1200)
      ).toContain("src/shared/debugLog.ts's DebugLogEvent comment");
    });

    it("does not change the meaning of durationMs, documentOpenId, usable, or completed while documenting the ordering caveat", () => {
      // #163 is documentation-only in this implementation (Outcome A) — no
      // measuredAtMs or reordering was introduced. Guard against a future
      // edit silently expanding this into a semantics change.
      expect(debugLogSource).not.toContain("measuredAtMs");
    });
  });
});
