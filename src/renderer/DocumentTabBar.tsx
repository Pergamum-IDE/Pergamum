import type { Translate } from "../shared/i18n";
import {
  editorIdEquals,
  serializeEditorId,
  type EditorId
} from "../shared/editorId";
import type { DocumentTab } from "./openDocuments";

interface DocumentTabBarProps {
  tabs: DocumentTab[];
  activeDocumentId: EditorId;
  translate: Translate;
  onSelectDocument: (documentId: EditorId) => void;
}

export function DocumentTabBar({
  tabs,
  activeDocumentId,
  translate,
  onSelectDocument
}: DocumentTabBarProps): JSX.Element {
  return (
    <nav
      className="documentTabBar"
      aria-label={translate("tabs.openDocuments")}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = editorIdEquals(tab.id, activeDocumentId);

        return (
          <button
            key={serializeEditorId(tab.id)}
            type="button"
            className={isActive ? "documentTab isActive" : "documentTab"}
            role="tab"
            aria-selected={isActive}
            title={tab.title}
            onClick={() => onSelectDocument(tab.id)}
          >
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
  );
}
