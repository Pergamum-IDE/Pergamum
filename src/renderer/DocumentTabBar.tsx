import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Translate } from "../shared/i18n";
import {
  editorIdEquals,
  serializeEditorId,
  type EditorId
} from "../shared/editorId";
import type { DocumentTab } from "./openDocuments";
import {
  documentTabTrailingSlotKind,
  handleDocumentTabCloseButtonClick,
  handleDocumentTabMiddleClick
} from "./documentTabHandlers";
import { DocumentTabDirtyIndicator } from "./DocumentTabDirtyIndicator";
import alertTriangleIcon from "../../assets/icons/global/alert-triangle.svg?raw";
import closeXIcon from "../../assets/icons/global/close-x.svg?raw";

interface DocumentTabBarProps {
  tabs: DocumentTab[];
  activeDocumentId: EditorId;
  translate: Translate;
  onSelectDocument: (documentId: EditorId) => void;
  onCloseDocument: (documentId: EditorId) => void;
  isUtilityWindowOpen: boolean;
  onToggleUtilityWindow: () => void;
}

export function DocumentTabBar({
  tabs,
  activeDocumentId,
  translate,
  onSelectDocument,
  onCloseDocument,
  isUtilityWindowOpen,
  onToggleUtilityWindow
}: DocumentTabBarProps): JSX.Element {
  const utilityWindowLabel = translate("utilityWindow.label");
  const closeTabLabel = translate("tabs.closeTab");
  const unsavedLabel = translate("tabs.unsaved");
  const [hoveredDocumentId, setHoveredDocumentId] = useState<EditorId | null>(
    null
  );

  function handleTabKeyDown(
    event: ReactKeyboardEvent<HTMLDivElement>,
    documentId: EditorId
  ): void {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onSelectDocument(documentId);
  }

  return (
    <div className="documentTabBar">
      <nav
        className="documentTabBarTabs"
        aria-label={translate("tabs.openDocuments")}
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = editorIdEquals(tab.id, activeDocumentId);
          const isHovered =
            hoveredDocumentId !== null &&
            editorIdEquals(tab.id, hoveredDocumentId);
          const trailingSlotKind = documentTabTrailingSlotKind(
            isActive,
            tab.isDirty,
            isHovered
          );
          const externalWarning = tab.isExternalMarkdownFile
            ? translate("tabs.externalMarkdownFile")
            : null;
          // Nested-element tooltip behavior varies by browser, so the
          // external warning is exposed both on the icon itself and on the
          // tab's own title/accessible name — not only on the icon. The
          // dirty indicator's own tooltip is unreliable to hover to (the
          // close button replaces it on hover — #184 follow-up), so the
          // unsaved state is folded into this same title/accessible name
          // instead, after the external warning when both apply.
          const tabTitleParts = [tab.title];

          if (externalWarning) {
            tabTitleParts.push(externalWarning);
          }

          if (tab.isDirty) {
            tabTitleParts.push(unsavedLabel);
          }

          const tabTitle = tabTitleParts.join(" — ");

          return (
            <div
              key={serializeEditorId(tab.id)}
              className={isActive ? "documentTab isActive" : "documentTab"}
              role="tab"
              tabIndex={0}
              aria-selected={isActive}
              title={tabTitle}
              onClick={() => onSelectDocument(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
              onMouseDown={(event) => {
                handleDocumentTabMiddleClick(event, tab.id, onCloseDocument);
              }}
              onMouseEnter={() => setHoveredDocumentId(tab.id)}
              onMouseLeave={() =>
                setHoveredDocumentId((current) =>
                  current && editorIdEquals(current, tab.id) ? null : current
                )
              }
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
              <span className="documentTabTrailing">
                {trailingSlotKind === "close" ? (
                  <button
                    type="button"
                    className="documentTabCloseButton"
                    aria-label={closeTabLabel}
                    title={closeTabLabel}
                    onClick={(event) =>
                      handleDocumentTabCloseButtonClick(
                        event,
                        tab.id,
                        onCloseDocument
                      )
                    }
                    dangerouslySetInnerHTML={{ __html: closeXIcon }}
                  />
                ) : trailingSlotKind === "dirty" ? (
                  <DocumentTabDirtyIndicator tooltip={unsavedLabel} />
                ) : null}
              </span>
            </div>
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
