import MarkdownIt from "markdown-it";
import { useMemo, useState } from "react";
import type { PergamumProject } from "../shared/api";
import { MarkdownEditor } from "./MarkdownEditor";

const markdown = new MarkdownIt({
  html: false,
  linkify: true
});

const initialContent = "# Untitled\n\nStart writing in Markdown.\n\n**Bold** text renders in the preview.";

function displayName(filePath: string | null): string {
  if (!filePath) {
    return "Untitled.md";
  }

  return filePath.split(/[\\/]/).pop() ?? filePath;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

export function App(): JSX.Element {
  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [project, setProject] = useState<PergamumProject | null>(null);
  const [status, setStatus] = useState("Ready");

  const isDirty = content !== savedContent;
  const previewHtml = useMemo(() => markdown.render(content), [content]);

  async function openFile(): Promise<void> {
    if (isDirty && !window.confirm("Discard unsaved changes?")) {
      return;
    }

    const file = await window.pergamum.files.openMarkdown();

    if (!file) {
      setStatus("Open canceled");
      return;
    }

    setContent(file.content);
    setSavedContent(file.content);
    setFilePath(file.path);
    setStatus(`Opened ${displayName(file.path)}`);
  }

  async function saveFile(): Promise<void> {
    const result = await window.pergamum.files.saveMarkdown(filePath, content);

    if (!result) {
      setStatus("Save canceled");
      return;
    }

    setFilePath(result.path);
    setSavedContent(content);
    setStatus(`Saved ${displayName(result.path)}`);
  }

  async function openProject(): Promise<void> {
    try {
      const openedProject = await window.pergamum.projects.openProject();

      if (!openedProject) {
        setStatus("Open project canceled");
        return;
      }

      setProject(openedProject);
      setStatus(
        `Opened project ${openedProject.name} (${openedProject.documents.length} Markdown files)`
      );
    } catch (error) {
      setStatus(`Project open failed: ${errorMessage(error)}`);
    }
  }

  return (
    <main className="appShell">
      <header className="toolbar">
        <div className="documentTitle">
          <span>{displayName(filePath)}</span>
          {isDirty ? <span className="dirtyIndicator">Unsaved</span> : null}
          {project ? (
            <span className="projectName">Project: {project.name}</span>
          ) : null}
        </div>
        <button type="button" onClick={openProject}>
          Open Project
        </button>
        <button type="button" onClick={openFile}>
          Open
        </button>
        <button type="button" onClick={saveFile}>
          Save
        </button>
      </header>

      <section className="workspace" aria-label="Markdown workspace">
        <section className="pane" aria-label="Markdown editor">
          <div className="paneHeader">Editor</div>
          <MarkdownEditor value={content} onChange={setContent} />
        </section>

        <section className="pane" aria-label="Markdown preview">
          <div className="paneHeader">Preview</div>
          <article
            className="preview"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </section>
      </section>

      <footer className="statusBar">{status}</footer>
    </main>
  );
}
