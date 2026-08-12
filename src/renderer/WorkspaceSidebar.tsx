import type { PergamumProject } from "../shared/api";
import type { GlossaryEntryId } from "../shared/glossary";
import type { Translate } from "../shared/i18n";
import { FileExplorer } from "./FileExplorer";
import { GlossarySidebar } from "./GlossarySidebar";
import { SearchSidebar } from "./SearchSidebar";
import type { SidebarMode } from "./sidebarMode";

interface WorkspaceSidebarProps {
  mode: SidebarMode;
  project: PergamumProject | null;
  highlightedProjectDocumentRelativePath: string | null;
  highlightedGlossaryEntryId: GlossaryEntryId | null;
  translate: Translate;
  onActivateProjectDocument: (relativePath: string) => void;
  onActivateGlossaryEntry: (entryId: GlossaryEntryId) => void;
}

export function WorkspaceSidebar({
  mode,
  project,
  highlightedProjectDocumentRelativePath,
  highlightedGlossaryEntryId,
  translate,
  onActivateProjectDocument,
  onActivateGlossaryEntry
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
          highlightedEntryId={project ? highlightedGlossaryEntryId : null}
          translate={translate}
          onActivateEntry={onActivateGlossaryEntry}
        />
      );
  }
}
