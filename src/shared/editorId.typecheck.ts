import type { EditorId } from "./editorId";

// ADR-0003 I-12 requires EditorId construction to pass through the factory
// boundary; this @ts-expect-error intentionally verifies the private brand.
// @ts-expect-error EditorId must be constructed through the factory boundary.
const editorIdLiteralWithoutFactory: EditorId = {
  kind: "file",
  path: "C:/Novel/chapter.md"
};

void editorIdLiteralWithoutFactory;
