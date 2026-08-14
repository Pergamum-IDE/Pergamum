import type { Translate } from "../shared/i18n";
import type { UtilityWindowTabId } from "./workbenchLayout";

interface UtilityWindowProps {
  activeTab: UtilityWindowTabId;
  height: number;
  translate: Translate;
  onClose: () => void;
}

function utilityWindowTabLabel(
  tab: UtilityWindowTabId,
  translate: Translate
): string {
  switch (tab) {
    case "occurrences":
      return translate("utilityWindow.tabs.occurrences");
  }
}

export function UtilityWindow({
  activeTab,
  height,
  translate,
  onClose
}: UtilityWindowProps): JSX.Element {
  const label = translate("utilityWindow.label");

  return (
    <section
      className="utilityWindow"
      aria-label={label}
      style={{ height }}
    >
      <div className="utilityWindowHeader">
        <div
          className="utilityWindowTabBar"
          role="tablist"
          aria-label={label}
        >
          <span
            className="utilityWindowTab isActive"
            role="tab"
            aria-selected="true"
          >
            {utilityWindowTabLabel(activeTab, translate)}
          </span>
        </div>
        <button
          type="button"
          className="utilityWindowCloseButton"
          aria-label={translate("utilityWindow.close")}
          title={translate("utilityWindow.close")}
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="utilityWindowContent">
        {activeTab === "occurrences" ? (
          <p className="utilityWindowEmpty">
            {translate("utilityWindow.occurrences.empty")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
