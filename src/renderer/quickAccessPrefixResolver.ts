/**
 * Resolves the leading-character UI grammar shared by Command Palette and
 * future Quick Access modes. This is intentionally a single small function,
 * not a provider abstraction: only the `>` / `＞` Command Palette mode is
 * implemented today, the rest are reserved placeholders for later Issues.
 */

export type QuickAccessMode =
  | "command"
  | "reservedGlossary"
  | "reservedSearch"
  | "reservedNoPrefix";

export interface QuickAccessResolution {
  readonly mode: QuickAccessMode;
  readonly query: string;
}

const commandPrefixes = new Set([">", "＞"]); // > ＞
const glossaryPrefixes = new Set(["#", "＃"]); // # ＃
const searchPrefixes = new Set(["/", "／"]); // / ／

export function resolveQuickAccessInput(rawInput: string): QuickAccessResolution {
  const trimmed = rawInput.trim();

  if (trimmed.length === 0) {
    return { mode: "command", query: "" };
  }

  const firstChar = trimmed[0];

  if (commandPrefixes.has(firstChar)) {
    return { mode: "command", query: trimmed.slice(1).trim() };
  }

  if (glossaryPrefixes.has(firstChar)) {
    return { mode: "reservedGlossary", query: trimmed.slice(1).trim() };
  }

  if (searchPrefixes.has(firstChar)) {
    return { mode: "reservedSearch", query: trimmed.slice(1).trim() };
  }

  return { mode: "reservedNoPrefix", query: trimmed };
}
