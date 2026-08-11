import type { ProjectDocument } from "../shared/api";

interface FileExplorerProps {
  documents: ProjectDocument[];
  activeRelativePath: string | null;
  onSelectDocument: (relativePath: string) => void;
}

export function FileExplorer({
  documents,
  activeRelativePath,
  onSelectDocument
}: FileExplorerProps): JSX.Element {
  return (
    <aside className="fileExplorer" aria-label="Project files">
      <div className="fileExplorerHeader">Files</div>
      {documents.length === 0 ? (
        <div className="fileExplorerEmpty">No Markdown files</div>
      ) : (
        <nav className="fileExplorerList" aria-label="Markdown documents">
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
