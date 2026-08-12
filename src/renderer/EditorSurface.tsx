import type { GlossaryEntryKind } from "../shared/glossary";
import type { Translate } from "../shared/i18n";
import {
  currentDocumentContent,
  type CurrentDocument
} from "./currentDocument";
import type { CurrentEditor } from "./currentEditor";
import { GlossaryEditor } from "./GlossaryEditor";
import { MarkdownEditor } from "./MarkdownEditor";
import { markdownPreviewRenderer } from "./preview/markdownPreviewRenderer";

interface EditorSurfaceProps {
  editor: CurrentEditor;
  translate: Translate;
  onChangeMarkdownContent: (content: string) => void;
  onChangeGlossaryEntryKind: (kind: GlossaryEntryKind) => void;
  onChangeGlossaryEntryDescription: (description: string) => void;
}

export function EditorSurface({
  editor,
  translate,
  onChangeMarkdownContent,
  onChangeGlossaryEntryKind,
  onChangeGlossaryEntryDescription
}: EditorSurfaceProps): JSX.Element {
  switch (editor.kind) {
    case "markdown":
      return (
        <MarkdownEditorSurface
          document={editor.document}
          translate={translate}
          onChangeMarkdownContent={onChangeMarkdownContent}
        />
      );
    case "glossaryEntry":
      return (
        <GlossaryEditor
          draft={editor.draft}
          translate={translate}
          onChangeKind={onChangeGlossaryEntryKind}
          onChangeDescription={onChangeGlossaryEntryDescription}
        />
      );
  }
}

interface MarkdownEditorSurfaceProps {
  document: CurrentDocument;
  translate: Translate;
  onChangeMarkdownContent: (content: string) => void;
}

function MarkdownEditorSurface({
  document,
  translate,
  onChangeMarkdownContent
}: MarkdownEditorSurfaceProps): JSX.Element {
  const content = currentDocumentContent(document);
  const previewHtml = markdownPreviewRenderer.render(content);

  return (
    <section
      className="workspace"
      aria-label={translate("workspace.markdownWorkspace")}
    >
      <section
        className="pane"
        aria-label={translate("workspace.markdownEditor")}
      >
        <div className="paneHeader">
          {translate("workspace.editor")}
        </div>
        <MarkdownEditor
          value={content}
          onChange={onChangeMarkdownContent}
        />
      </section>

      <section
        className="pane"
        aria-label={translate("workspace.markdownPreview")}
      >
        <div className="paneHeader">
          {translate("workspace.preview")}
        </div>
        <article
          className="preview"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </section>
    </section>
  );
}
