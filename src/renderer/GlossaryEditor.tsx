import { glossaryEntryKinds, type GlossaryEntryKind } from "../shared/glossary";
import type { Translate } from "../shared/i18n";
import type { GlossaryEntryDraft } from "./glossaryEntryDraft";
import { canonicalGlossarySurface } from "./glossaryPresentation";
import { MarkdownEditor } from "./MarkdownEditor";
import { markdownPreviewRenderer } from "./preview/markdownPreviewRenderer";

interface GlossaryEditorProps {
  draft: GlossaryEntryDraft;
  translate: Translate;
  onChangeKind: (kind: GlossaryEntryKind) => void;
  onChangeDescription: (description: string) => void;
}

export function GlossaryEditor({
  draft,
  translate,
  onChangeKind,
  onChangeDescription
}: GlossaryEditorProps): JSX.Element {
  const entry = draft.entry;
  const title = canonicalGlossarySurface(entry);
  const descriptionHtml = markdownPreviewRenderer.render(draft.description);

  return (
    <section
      className="glossaryEditor"
      aria-label={translate("glossaryEditor.label")}
    >
      <header className="glossaryEditorHeader">
        <h1>{title}</h1>
        <label className="glossaryEditorKindField">
          <span>{translate("glossaryEditor.kind")}</span>
          <select
            value={draft.kind}
            onChange={(event) =>
              onChangeKind(event.target.value as GlossaryEntryKind)
            }
          >
            {glossaryEntryKinds.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="glossaryEditorSection">
        <h2>{translate("glossaryEditor.forms")}</h2>
        <ul className="glossaryEditorForms">
          {entry.forms.map((form) => (
            <li key={form.id}>
              <span>{form.surface}</span>
              <span className="glossaryEditorFormRelation">
                {form.isCanonical
                  ? translate("glossaryEditor.canonicalForm")
                  : form.relation}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="glossaryEditorSection glossaryEditorDescription">
        <h2>{translate("glossaryEditor.description")}</h2>
        <div className="workspace glossaryEditorDescriptionWorkspace">
          <section
            className="pane"
            aria-label={translate("workspace.markdownEditor")}
          >
            <MarkdownEditor
              value={draft.description}
              onChange={onChangeDescription}
            />
          </section>

          <section
            className="pane"
            aria-label={translate("workspace.markdownPreview")}
          >
            {draft.description.trim().length > 0 ? (
              <article
                className="preview glossaryDescriptionPreview"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            ) : (
              <p className="glossaryEditorEmptyDescription">
                {translate("glossaryEditor.emptyDescription")}
              </p>
            )}
          </section>
        </div>
      </section>
    </section>
  );
}
