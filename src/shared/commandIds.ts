import { defineCommandId } from "./commandRegistry";

export const applicationCommandIds = {
  openProject: defineCommandId("app.project.open"),
  toggleRecentProjects: defineCommandId("app.recentProjects.toggle")
} as const;

export const editorCommandIds = {
  openMarkdownDocument: defineCommandId("editor.document.markdown.open"),
  saveDocument: defineCommandId("editor.document.save"),
  cutSelection: defineCommandId("editor.selection.cut"),
  copySelection: defineCommandId("editor.selection.copy"),
  pasteSelection: defineCommandId("editor.selection.paste"),
  selectAllSelection: defineCommandId("editor.selection.selectAll")
} as const;

export const editCommandIds = [
  editorCommandIds.cutSelection,
  editorCommandIds.copySelection,
  editorCommandIds.pasteSelection,
  editorCommandIds.selectAllSelection
] as const;

export type EditCommandId = (typeof editCommandIds)[number];

export function isEditCommandId(commandId: string): commandId is EditCommandId {
  return (editCommandIds as readonly string[]).includes(commandId);
}

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
