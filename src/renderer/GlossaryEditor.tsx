import {
  glossaryEntryKinds,
  glossaryWarningPolicies,
  type GlossaryEntryKind,
  type GlossaryFormRelation,
  type GlossaryWarningPolicy
} from "../shared/glossary";
import type { Translate, TranslationKey } from "../shared/i18n";
import type {
  GlossaryEntryDraft,
  GlossaryFormDraft
} from "./glossaryEntryDraft";
import { canonicalGlossarySurface } from "./glossaryPresentation";
import { MarkdownEditor } from "./MarkdownEditor";
import { markdownPreviewRenderer } from "./preview/markdownPreviewRenderer";

const warningPolicyTranslationKeys: Record<
  GlossaryWarningPolicy,
  TranslationKey
> = {
  default: "glossaryEditor.warningPolicy.default",
  ignore: "glossaryEditor.warningPolicy.ignore",
  warn: "glossaryEditor.warningPolicy.warn"
};

interface GlossaryEditorProps {
  draft: GlossaryEntryDraft;
  translate: Translate;
  onChangeKind: (kind: GlossaryEntryKind) => void;
  onChangeDescription: (description: string) => void;
  onChangeCanonicalSurface: (surface: string) => void;
  onAddForm: (relation: GlossaryFormRelation) => void;
  onChangeFormSurface: (formId: string, surface: string) => void;
  onChangeFormWarningPolicy: (
    formId: string,
    warningPolicy: GlossaryWarningPolicy
  ) => void;
  onDeleteForm: (formId: string) => void;
}

export function GlossaryEditor({
  draft,
  translate,
  onChangeKind,
  onChangeDescription,
  onChangeCanonicalSurface,
  onAddForm,
  onChangeFormSurface,
  onChangeFormWarningPolicy,
  onDeleteForm
}: GlossaryEditorProps): JSX.Element {
  const entry = draft.entry;
  const title = draft.canonicalSurface.trim() || canonicalGlossarySurface(entry);
  const descriptionHtml = markdownPreviewRenderer.render(draft.description);
  const aliases = draft.forms.filter((form) => form.relation === "alias");
  const variants = draft.forms.filter((form) => form.relation === "variant");

  function renderFormRows(forms: GlossaryFormDraft[]): JSX.Element[] {
    return forms.map((form) => (
      <div className="glossaryEditorFormRow" key={form.id}>
        <input
          type="text"
          value={form.surface}
          onChange={(event) =>
            onChangeFormSurface(form.id, event.target.value)
          }
        />
        <select
          value={form.warningPolicy}
          aria-label={translate("glossaryEditor.warningPolicy")}
          onChange={(event) =>
            onChangeFormWarningPolicy(
              form.id,
              event.target.value as GlossaryWarningPolicy
            )
          }
        >
          {glossaryWarningPolicies.map((warningPolicy) => (
            <option key={warningPolicy} value={warningPolicy}>
              {translate(warningPolicyTranslationKeys[warningPolicy])}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => onDeleteForm(form.id)}>
          {translate("glossaryEditor.removeForm")}
        </button>
      </div>
    ));
  }

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
        <label className="glossaryEditorCanonicalField">
          <span>{translate("glossaryEditor.canonicalSurface")}</span>
          <input
            type="text"
            required
            value={draft.canonicalSurface}
            onChange={(event) =>
              onChangeCanonicalSurface(event.target.value)
            }
          />
        </label>

        <div className="glossaryEditorFormGroup">
          <h3>{translate("glossaryEditor.aliases")}</h3>
          <div className="glossaryEditorForms">
            {renderFormRows(aliases)}
          </div>
          <button
            type="button"
            className="glossaryEditorAddForm"
            onClick={() => onAddForm("alias")}
          >
            {translate("glossaryEditor.addAlias")}
          </button>
        </div>

        <div className="glossaryEditorFormGroup">
          <h3>{translate("glossaryEditor.variants")}</h3>
          <div className="glossaryEditorForms">
            {renderFormRows(variants)}
          </div>
          <button
            type="button"
            className="glossaryEditorAddForm"
            onClick={() => onAddForm("variant")}
          >
            {translate("glossaryEditor.addVariant")}
          </button>
        </div>
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
