import type { Translate } from "../shared/i18n";

interface GlossarySidebarProps {
  translate: Translate;
}

export function GlossarySidebar({
  translate
}: GlossarySidebarProps): JSX.Element {
  return (
    <aside
      className="workspaceSidebarPanel"
      aria-label={translate("glossary.sidebarTitle")}
    >
      <div className="sidebarHeader">
        {translate("glossary.sidebarTitle")}
      </div>
      <div className="workspacePlaceholderList">
        <div className="workspacePlaceholder">
          {translate("glossary.empty")}
        </div>
      </div>
      <div className="workspaceSidebarActions">
        <button type="button" className="workspaceSidebarButton" disabled>
          {translate("glossary.add")}
        </button>
      </div>
    </aside>
  );
}
