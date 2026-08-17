import { applicationCommandIds } from "./commandIds";

export const CORE_COMMAND_DOMAINS = [
  "editor",
  "viewer",
  "workbench",
  "workspace",
  "glossary",
  "settings",
  "search",
  "import",
  "export",
  "app"
] as const;

export type CoreCommandDomain = (typeof CORE_COMMAND_DOMAINS)[number];

export const RESERVED_COMMAND_NAMESPACE_ROOTS = ["plugin"] as const;

export type ReservedCommandNamespaceRoot =
  (typeof RESERVED_COMMAND_NAMESPACE_ROOTS)[number];

export const DEPRECATED_APP_COMMAND_IDS = [
  applicationCommandIds.openProject,
  applicationCommandIds.toggleRecentProjects
] as const;
