import type { Translate } from "../shared/i18n";

interface SearchSidebarProps {
  translate: Translate;
}

export function SearchSidebar({
  translate
}: SearchSidebarProps): JSX.Element {
  return (
    <aside
      className="workspaceSidebarPanel"
      aria-label={translate("search.sidebarTitle")}
    >
      <div className="sidebarHeader">
        {translate("search.sidebarTitle")}
      </div>
      <div className="workspacePlaceholderList">
        <div className="workspacePlaceholder">
          {translate("search.notImplemented")}
        </div>
      </div>
    </aside>
  );
}
