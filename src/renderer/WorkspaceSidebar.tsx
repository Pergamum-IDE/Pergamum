import type { PergamumProject } from "../shared/api";
import type { Translate } from "../shared/i18n";
import { FileExplorer } from "./FileExplorer";
import { GlossarySidebar } from "./GlossarySidebar";
import { SearchSidebar } from "./SearchSidebar";
import type { SidebarMode } from "./sidebarMode";

interface WorkspaceSidebarProps {
  mode: SidebarMode;
  project: PergamumProject | null;
  activeRelativePath: string | null;
  translate: Translate;
  onSelectProjectDocument: (relativePath: string) => void;
}

export function WorkspaceSidebar({
  mode,
  project,
  activeRelativePath,
  translate,
  onSelectProjectDocument
}: WorkspaceSidebarProps): JSX.Element {
  switch (mode) {
    case "files":
      return (
        <FileExplorer
          documents={project?.documents ?? []}
          activeRelativePath={project ? activeRelativePath : null}
          translate={translate}
          onSelectDocument={onSelectProjectDocument}
        />
      );
    case "search":
      return <SearchSidebar translate={translate} />;
    case "glossary":
      return (
        <GlossarySidebar
          projectRootPath={project?.rootPath ?? null}
          translate={translate}
        />
      );
  }
}
