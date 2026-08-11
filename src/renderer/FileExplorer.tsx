import type { ProjectDocument } from "../shared/api";
import type { Translate } from "../shared/i18n";

interface FileExplorerProps {
  documents: ProjectDocument[];
  activeRelativePath: string | null;
  translate: Translate;
  onSelectDocument: (relativePath: string) => void;
}

export function FileExplorer({
  documents,
  activeRelativePath,
  translate,
  onSelectDocument
}: FileExplorerProps): JSX.Element {
  return (
    <aside className="fileExplorer" aria-label={translate("explorer.projectFiles")}>
      <div className="fileExplorerHeader">{translate("explorer.files")}</div>
      {documents.length === 0 ? (
        <div className="fileExplorerEmpty">{translate("explorer.empty")}</div>
      ) : (
        <nav className="fileExplorerList" aria-label={translate("explorer.markdownDocuments")}>
          {documents.map((document) => {
            const isActive = document.relativePath === activeRelativePath;

            return (
              <button
                key={document.relativePath}
                type="button"
                className={
                  isActive ? "fileExplorerItem isActive" : "fileExplorerItem"
                }
                aria-current={isActive ? "page" : undefined}
                title={document.relativePath}
                onClick={() => onSelectDocument(document.relativePath)}
              >
                {document.relativePath}
              </button>
            );
          })}
        </nav>
      )}
    </aside>
  );
}
