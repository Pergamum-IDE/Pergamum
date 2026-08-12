import type { PergamumProject } from "../shared/api";
import type { Translate } from "../shared/i18n";
import { FileExplorer } from "./FileExplorer";
import { GlossarySidebar } from "./GlossarySidebar";
import { SearchSidebar } from "./SearchSidebar";
import type { SidebarMode } from "./sidebarMode";

interface WorkspaceSidebarProps {
  mode: SidebarMode;
  project: PergamumProject | null;
  highlightedProjectDocumentRelativePath: string | null;
  translate: Translate;
  onActivateProjectDocument: (relativePath: string) => void;
}

export function WorkspaceSidebar({
  mode,
  project,
  highlightedProjectDocumentRelativePath,
  translate,
  onActivateProjectDocument
}: WorkspaceSidebarProps): JSX.Element {
  switch (mode) {
    case "files":
      return (
        <FileExplorer
          key={project?.rootPath ?? "no-project"}
          documents={project?.documents ?? []}
          highlightedRelativePath={
            project ? highlightedProjectDocumentRelativePath : null
          }
          translate={translate}
          onActivateDocument={onActivateProjectDocument}
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
