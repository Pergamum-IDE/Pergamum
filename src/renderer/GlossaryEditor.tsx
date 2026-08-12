import type { GlossaryEntry } from "../shared/glossary";
import type { Translate } from "../shared/i18n";
import { canonicalGlossarySurface } from "./glossaryPresentation";
import { markdownPreviewRenderer } from "./preview/markdownPreviewRenderer";

interface GlossaryEditorProps {
  entry: GlossaryEntry;
  translate: Translate;
}

export function GlossaryEditor({
  entry,
  translate
}: GlossaryEditorProps): JSX.Element {
  const title = canonicalGlossarySurface(entry);
  const descriptionHtml = markdownPreviewRenderer.render(entry.description);

  return (
    <section
      className="glossaryEditor"
      aria-label={translate("glossaryEditor.label")}
    >
      <header className="glossaryEditorHeader">
        <h1>{title}</h1>
        <span className="glossaryEditorKind">{entry.kind}</span>
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
        {entry.description.trim().length > 0 ? (
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
    </section>
  );
}
