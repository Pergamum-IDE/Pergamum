import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode
} from "react";
import type { CommandContext } from "../shared/commandEnablement";
import type { CommandId, CommandRegistry } from "../shared/commandRegistry";
import type {
  Translate,
  TranslationKey,
  TranslationValues
} from "../shared/i18n";
import {
  type CommandPaletteFilteredEntry,
  type CommandPaletteMatchRange,
  commandPaletteResultCountKey,
  filterCommandPaletteEntries,
  firstEnabledCommandPaletteIndex,
  listCommandPaletteEntries,
  mergeCommandPaletteMatchRanges,
  moveCommandPaletteSelection,
  resolveCommandPaletteEnterSelection
} from "./commandPaletteEntries";
import {
  resolveQuickAccessInput,
  type QuickAccessMode
} from "./quickAccessPrefixResolver";

export interface CommandPaletteProps {
  commandRegistry: CommandRegistry;
  translate: Translate;
  isComposing: () => boolean;
  /**
   * The live command context at the moment the Palette renders. Captured
   * once at mount into an eager, copied snapshot (#128) — the Palette must
   * not re-read live state while open, both to avoid the DOM focus trap
   * (opening the Palette steals focus) and to keep display-time enablement
   * stable until the Palette closes, even if the live context changes.
   */
  commandContext: CommandContext;
  onExecuteCommand: (commandId: CommandId<readonly unknown[], unknown>) => void;
  /** Debug-only UI-level block diagnostic, distinct from `command.ignored`. */
  onBlockedCommand: (commandId: CommandId<readonly unknown[], unknown>) => void;
  onClose: () => void;
  /**
   * Overrides the starting search input value (including the leading `>`
   * mode prefix). Defaults to `>` (Command Palette mode, empty query).
   * Exists so tests can render the Palette already in a non-empty-query
   * state — this project has no interactive DOM testing library, so
   * keystrokes cannot be simulated against a static render.
   */
  initialInputValue?: string;
}

const defaultInputValue = ">";

export interface CommandPaletteFooterModel {
  readonly statusKey: TranslationKey | null;
  readonly statusValues?: TranslationValues;
  readonly canRunSelected: boolean;
}

export interface CommandPaletteScrollTarget {
  scrollIntoView(options?: ScrollIntoViewOptions): void;
}

function reservedPlaceholderKey(mode: QuickAccessMode): TranslationKey | null {
  switch (mode) {
    case "reservedGlossary":
      return "commandPalette.reserved.glossary";
    case "reservedSearch":
      return "commandPalette.reserved.search";
    case "reservedNoPrefix":
      return "commandPalette.reserved.noPrefix";
    case "command":
      return null;
  }
}

export function commandPaletteItemClassName(
  selected: boolean,
  enabled: boolean
): string {
  const classNames = ["commandPaletteItem"];

  if (selected) {
    classNames.push("commandPaletteItemSelected");
  }

  if (!enabled) {
    classNames.push("commandPaletteItemDisabled");
  }

  return classNames.join(" ");
}

export function scrollCommandPaletteSelectionIntoView(
  selectedItem: CommandPaletteScrollTarget | null
): void {
  selectedItem?.scrollIntoView({ block: "nearest" });
}

function selectedCommandPaletteEntry(
  entries: readonly CommandPaletteFilteredEntry[],
  selectedIndex: number | null
): CommandPaletteFilteredEntry | null {
  return selectedIndex === null ? null : entries[selectedIndex] ?? null;
}

/**
 * Footer status priority (highest first):
 *  1. disabled selected command message
 *  2. non-empty query result count
 *  3. command mode empty-query hint — only once the user has actually typed
 *     the `>` prefix, not for a fully empty input (which shows the native
 *     placeholder instead, per #129)
 *  4. empty status
 *
 * `inputValue` is taken separately from `query` because
 * `resolveQuickAccessInput("")` and `resolveQuickAccessInput(">")` both
 * resolve to `{ mode: "command", query: "" }` — only the raw input value
 * can distinguish "nothing typed yet" from "typed the command prefix".
 */
export function resolveCommandPaletteFooterModel(input: {
  readonly mode: QuickAccessMode;
  readonly query: string;
  readonly inputValue: string;
  readonly entries: readonly CommandPaletteFilteredEntry[];
  readonly selectedIndex: number | null;
}): CommandPaletteFooterModel {
  const selectedEntry = selectedCommandPaletteEntry(
    input.entries,
    input.selectedIndex
  );
  const canRunSelected = selectedEntry?.enabled === true;

  if (input.mode !== "command") {
    return {
      statusKey: null,
      canRunSelected: false
    };
  }

  if (selectedEntry && !selectedEntry.enabled) {
    return {
      statusKey: "commandPalette.footer.disabled",
      canRunSelected
    };
  }

  if (input.query.trim().length > 0) {
    return {
      statusKey: commandPaletteResultCountKey(input.entries.length),
      statusValues: { count: input.entries.length },
      canRunSelected
    };
  }

  if (input.inputValue.trim().length > 0) {
    return {
      statusKey: "commandPalette.footer.searchHint",
      canRunSelected
    };
  }

  return {
    statusKey: null,
    canRunSelected
  };
}

export function CommandPaletteHighlightedText({
  text,
  ranges
}: {
  readonly text: string;
  readonly ranges: readonly CommandPaletteMatchRange[];
}): JSX.Element {
  const mergedRanges = mergeCommandPaletteMatchRanges(ranges);

  if (mergedRanges.length === 0) {
    return <>{text}</>;
  }

  const nodes: ReactNode[] = [];
  let offset = 0;

  for (const range of mergedRanges) {
    if (range.start > offset) {
      nodes.push(text.slice(offset, range.start));
    }

    nodes.push(
      <mark
        className="commandPaletteMatch"
        key={`${range.start}:${range.end}`}
      >
        {text.slice(range.start, range.end)}
      </mark>
    );
    offset = range.end;
  }

  if (offset < text.length) {
    nodes.push(text.slice(offset));
  }

  return <>{nodes}</>;
}

export function CommandPalette({
  commandRegistry,
  translate,
  isComposing,
  commandContext,
  onExecuteCommand,
  onBlockedCommand,
  onClose,
  initialInputValue = defaultInputValue
}: CommandPaletteProps): JSX.Element {
  const [snapshot] = useState<CommandContext>(() => commandContext);
  const [inputValue, setInputValue] = useState(initialInputValue);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(() =>
    firstEnabledCommandPaletteIndex(
      filterCommandPaletteEntries(
        listCommandPaletteEntries(commandRegistry, snapshot),
        ""
      )
    )
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectedItemRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, []);

  const { mode, query } = resolveQuickAccessInput(inputValue);
  const entries =
    mode === "command"
      ? filterCommandPaletteEntries(
          listCommandPaletteEntries(commandRegistry, snapshot),
          query
        )
      : [];

  useEffect(() => {
    scrollCommandPaletteSelectionIntoView(selectedItemRef.current);
  }, [entries.length, mode, query, selectedIndex]);

  function updateInput(value: string): void {
    setInputValue(value);

    const resolved = resolveQuickAccessInput(value);

    if (resolved.mode !== "command") {
      setSelectedIndex(null);
      return;
    }

    const nextEntries = filterCommandPaletteEntries(
      listCommandPaletteEntries(commandRegistry, snapshot),
      resolved.query
    );

    setSelectedIndex(firstEnabledCommandPaletteIndex(nextEntries));
  }

  function executeEntryAt(index: number): void {
    const entry = entries[index];

    if (!entry) {
      return;
    }

    if (!entry.enabled) {
      onBlockedCommand(entry.id);
      return;
    }

    onExecuteCommand(entry.id);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>): void {
    switch (event.key) {
      case "Escape": {
        if (isComposing()) {
          return;
        }
        event.preventDefault();
        onClose();
        return;
      }
      case "ArrowDown": {
        event.preventDefault();
        setSelectedIndex((current) =>
          moveCommandPaletteSelection(entries.length, current, 1)
        );
        return;
      }
      case "ArrowUp": {
        event.preventDefault();
        setSelectedIndex((current) =>
          moveCommandPaletteSelection(entries.length, current, -1)
        );
        return;
      }
      case "Enter": {
        if (isComposing()) {
          return;
        }
        event.preventDefault();

        const entry = resolveCommandPaletteEnterSelection(
          entries,
          selectedIndex
        );

        if (!entry) {
          return;
        }

        if (!entry.enabled) {
          onBlockedCommand(entry.id);
          return;
        }

        onExecuteCommand(entry.id);
        return;
      }
      default:
        return;
    }
  }

  const reservedKey = reservedPlaceholderKey(mode);
  const footer = resolveCommandPaletteFooterModel({
    mode,
    query,
    inputValue,
    entries,
    selectedIndex
  });
  const runHintClassName = footer.canRunSelected
    ? "commandPaletteFooterHint"
    : "commandPaletteFooterHint commandPaletteFooterHintUnavailable";

  return (
    <div className="commandPaletteBackdrop" onClick={onClose}>
      <div
        className="commandPalette"
        role="dialog"
        aria-modal="true"
        aria-label={translate("commandPalette.title")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="commandPaletteInputRow">
          <input
            ref={inputRef}
            type="text"
            className="commandPaletteInput"
            value={inputValue}
            onChange={(event) => updateInput(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label={translate("commandPalette.searchLabel")}
            placeholder={translate("commandPalette.inputPlaceholder")}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            className="commandPaletteCloseButton"
            onClick={onClose}
            aria-label={translate("commandPalette.close")}
          >
            ×
          </button>
        </div>
        {reservedKey ? (
          <div className="commandPaletteReservedPlaceholder">
            {translate(reservedKey)}
          </div>
        ) : (
          <ul className="commandPaletteList" role="listbox">
            {entries.length === 0 ? (
              <li className="commandPaletteEmpty">
                {translate("commandPalette.noResults")}
              </li>
            ) : (
              entries.map((entry, index) => (
                <li
                  key={entry.id}
                  role="option"
                  aria-selected={index === selectedIndex}
                  aria-disabled={!entry.enabled}
                  aria-label={entry.primary.text}
                  ref={index === selectedIndex ? selectedItemRef : null}
                  className={commandPaletteItemClassName(
                    index === selectedIndex,
                    entry.enabled
                  )}
                  onClick={() => executeEntryAt(index)}
                >
                  <div className="commandPaletteItemPrimary">
                    <CommandPaletteHighlightedText
                      text={entry.primary.text}
                      ranges={entry.primary.ranges}
                    />
                  </div>
                  <div className="commandPaletteItemSecondary">
                    <CommandPaletteHighlightedText
                      text={entry.secondary.text}
                      ranges={entry.secondary.ranges}
                    />
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
        <div className="commandPaletteFooter">
          <div className="commandPaletteFooterStatus">
            {footer.statusKey
              ? translate(footer.statusKey, footer.statusValues)
              : null}
          </div>
          <div className="commandPaletteFooterHints">
            <span className="commandPaletteFooterHint">
              {translate("commandPalette.footer.selectHint")}
            </span>
            <span className={runHintClassName}>
              {translate("commandPalette.footer.runHint")}
            </span>
            <span className="commandPaletteFooterHint">
              {translate("commandPalette.footer.closeHint")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
