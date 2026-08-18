import type { Translate } from "../shared/i18n";
import {
  editorIdEquals,
  serializeEditorId,
  type EditorId
} from "../shared/editorId";
import type { DocumentTab } from "./openDocuments";
import alertTriangleIcon from "../../assets/icons/global/alert-triangle.svg?raw";

interface DocumentTabBarProps {
  tabs: DocumentTab[];
  activeDocumentId: EditorId;
  translate: Translate;
  onSelectDocument: (documentId: EditorId) => void;
  isUtilityWindowOpen: boolean;
  onToggleUtilityWindow: () => void;
}

export function DocumentTabBar({
  tabs,
  activeDocumentId,
  translate,
  onSelectDocument,
  isUtilityWindowOpen,
  onToggleUtilityWindow
}: DocumentTabBarProps): JSX.Element {
  const utilityWindowLabel = translate("utilityWindow.label");

  return (
    <div className="documentTabBar">
      <nav
        className="documentTabBarTabs"
        aria-label={translate("tabs.openDocuments")}
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = editorIdEquals(tab.id, activeDocumentId);
          const externalWarning = tab.isExternalMarkdownFile
            ? translate("tabs.externalMarkdownFile")
            : null;
          // Nested-element tooltip behavior varies by browser, so the
          // external warning is exposed both on the icon itself and on the
          // tab button's own title/accessible name — not only on the icon.
          const tabTitle = externalWarning
            ? `${tab.title} — ${externalWarning}`
            : tab.title;

          return (
            <button
              key={serializeEditorId(tab.id)}
              type="button"
              className={isActive ? "documentTab isActive" : "documentTab"}
              role="tab"
              aria-selected={isActive}
              title={tabTitle}
              onClick={() => onSelectDocument(tab.id)}
            >
              {externalWarning ? (
                <span
                  className="documentTabExternalIcon"
                  role="img"
                  aria-label={externalWarning}
                  title={externalWarning}
                  dangerouslySetInnerHTML={{ __html: alertTriangleIcon }}
                />
              ) : null}
              <span className="documentTabTitle">{tab.title}</span>
              {tab.isDirty ? (
                <span
                  className="documentTabDirtyIndicator"
                  aria-label={translate("tabs.unsaved")}
                  title={translate("tabs.unsaved")}
                />
              ) : null}
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        className={
          isUtilityWindowOpen
            ? "documentTabBarUtilityToggle isActive"
            : "documentTabBarUtilityToggle"
        }
        aria-pressed={isUtilityWindowOpen}
        aria-label={utilityWindowLabel}
        title={utilityWindowLabel}
        onClick={onToggleUtilityWindow}
      >
        {utilityWindowLabel}
      </button>
    </div>
  );
}
