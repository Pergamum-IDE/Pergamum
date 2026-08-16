import type { CommandId, CommandRegistry } from "../shared/commandRegistry";

export interface CommandPaletteEntry {
  readonly id: CommandId<readonly unknown[], unknown>;
  readonly label: string;
  readonly description?: string;
  readonly canonicalLabel?: string;
  readonly enabled: boolean;
}

/**
 * Palette visibility is opt-out: a command is listed unless its definition
 * sets `palette.visible = false`. Commands that require arguments must set
 * this explicitly at the definition site, since arity information is erased
 * once commands are type-erased into the registry.
 */
export function listCommandPaletteEntries(
  registry: CommandRegistry
): CommandPaletteEntry[] {
  return registry
    .list()
    .filter((command) => command.palette?.visible !== false)
    .map((command) => ({
      id: command.id,
      label: command.title,
      description: command.description,
      canonicalLabel: command.canonicalLabel,
      enabled: registry.isEnabled(command.id)
    }));
}

function matchesCommandPaletteQuery(
  entry: CommandPaletteEntry,
  needle: string
): boolean {
  return (
    entry.label.toLowerCase().includes(needle) ||
    (entry.description?.toLowerCase().includes(needle) ?? false) ||
    (entry.canonicalLabel?.toLowerCase().includes(needle) ?? false) ||
    entry.id.toLowerCase().includes(needle)
  );
}

export function filterCommandPaletteEntries(
  entries: readonly CommandPaletteEntry[],
  query: string
): CommandPaletteEntry[] {
  const needle = query.trim().toLowerCase();

  if (needle.length === 0) {
    return [...entries];
  }

  return entries.filter((entry) => matchesCommandPaletteQuery(entry, needle));
}

export function firstEnabledCommandPaletteIndex(
  entries: readonly CommandPaletteEntry[]
): number | null {
  const index = entries.findIndex((entry) => entry.enabled);

  return index === -1 ? null : index;
}

export function moveCommandPaletteSelection(
  entriesLength: number,
  currentIndex: number | null,
  delta: 1 | -1
): number | null {
  if (entriesLength === 0) {
    return null;
  }

  const base = currentIndex ?? (delta > 0 ? -1 : entriesLength);
  const next = base + delta;

  return Math.min(Math.max(next, 0), entriesLength - 1);
}

export function resolveCommandPaletteEnterExecution(
  entries: readonly CommandPaletteEntry[],
  selectedIndex: number | null
): CommandPaletteEntry["id"] | null {
  if (selectedIndex === null) {
    return null;
  }

  const entry = entries[selectedIndex];

  return entry && entry.enabled ? entry.id : null;
}
