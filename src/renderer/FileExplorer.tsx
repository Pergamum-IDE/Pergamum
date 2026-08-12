import { useEffect, useState } from "react";
import type { ProjectDocument } from "../shared/api";
import type { Translate } from "../shared/i18n";

interface FileExplorerProps {
  documents: ProjectDocument[];
  highlightedRelativePath: string | null;
  translate: Translate;
  onActivateDocument: (relativePath: string) => void;
}

interface FileExplorerViewProps extends FileExplorerProps {
  selectedRelativePath: string | null;
  onSelectDocument: (relativePath: string) => void;
}

function preserveProjectDocumentSelection(
  documents: ProjectDocument[],
  selectedRelativePath: string | null
): string | null {
  if (!selectedRelativePath) {
    return null;
  }

  return documents.some(
    (document) => document.relativePath === selectedRelativePath
  )
    ? selectedRelativePath
    : null;
}

export function FileExplorer({
  documents,
  highlightedRelativePath,
  translate,
  onActivateDocument
}: FileExplorerProps): JSX.Element {
  const [selectedRelativePath, setSelectedRelativePath] =
    useState<string | null>(null);

  useEffect(() => {
    setSelectedRelativePath((currentSelection) =>
      preserveProjectDocumentSelection(documents, currentSelection)
    );
  }, [documents]);

  return (
    <FileExplorerView
      documents={documents}
      selectedRelativePath={selectedRelativePath}
      highlightedRelativePath={highlightedRelativePath}
      translate={translate}
      onSelectDocument={setSelectedRelativePath}
      onActivateDocument={onActivateDocument}
    />
  );
}

export function FileExplorerView({
  documents,
  selectedRelativePath,
  highlightedRelativePath,
  translate,
  onSelectDocument,
  onActivateDocument
}: FileExplorerViewProps): JSX.Element {
  return (
    <aside className="fileExplorer" aria-label={translate("explorer.projectFiles")}>
      <div className="fileExplorerHeader">{translate("explorer.files")}</div>
      {documents.length === 0 ? (
        <div className="fileExplorerEmpty">{translate("explorer.empty")}</div>
      ) : (
        <nav className="fileExplorerList" aria-label={translate("explorer.markdownDocuments")}>
          {documents.map((document) => {
            const isHighlighted =
              document.relativePath === highlightedRelativePath;
            const isSelected =
              document.relativePath === selectedRelativePath;

            return (
              <button
                key={document.relativePath}
                type="button"
                className={
                  [
                    "fileExplorerItem",
                    isHighlighted ? "isActive" : null,
                    isSelected ? "isSelected" : null
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                aria-current={isHighlighted ? "page" : undefined}
                data-selected={isSelected ? "true" : undefined}
                title={document.relativePath}
                onClick={() => {
                  onSelectDocument(document.relativePath);
                  onActivateDocument(document.relativePath);
                }}
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
