import { defineCommandId } from "./commandRegistry";

export const applicationCommandIds = {
  openProject: defineCommandId("app.project.open"),
  toggleRecentProjects: defineCommandId("app.recentProjects.toggle")
} as const;

export const editorCommandIds = {
  openMarkdownDocument: defineCommandId("editor.document.markdown.open"),
  saveDocument: defineCommandId("editor.document.save")
} as const;

export const fileMenuCommandIds = [
  applicationCommandIds.openProject,
  editorCommandIds.openMarkdownDocument,
  editorCommandIds.saveDocument,
  applicationCommandIds.toggleRecentProjects
] as const;

export type FileMenuCommandId = (typeof fileMenuCommandIds)[number];

export function isFileMenuCommandId(
  commandId: string
): commandId is FileMenuCommandId {
  return (fileMenuCommandIds as readonly string[]).includes(commandId);
}
