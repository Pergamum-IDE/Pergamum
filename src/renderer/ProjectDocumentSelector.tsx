import type { ProjectDocument } from "../shared/api";

interface ProjectDocumentSelectorProps {
  documents: ProjectDocument[];
  currentRelativePath: string | null;
  onSelect: (relativePath: string) => void;
}

export function ProjectDocumentSelector({
  documents,
  currentRelativePath,
  onSelect
}: ProjectDocumentSelectorProps): JSX.Element | null {
  if (documents.length === 0) {
    return null;
  }

  return (
    <select
      className="projectDocumentSelector"
      aria-label="Project document"
      value={currentRelativePath ?? ""}
      onChange={(event) => onSelect(event.target.value)}
    >
      {currentRelativePath ? null : <option value="">Select document</option>}
      {documents.map((document) => (
        <option key={document.relativePath} value={document.relativePath}>
          {document.relativePath}
        </option>
      ))}
    </select>
  );
}
