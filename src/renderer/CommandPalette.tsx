import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent
} from "react";
import type { CommandContext } from "../shared/commandEnablement";
import type { CommandId, CommandRegistry } from "../shared/commandRegistry";
import type { Translate, TranslationKey } from "../shared/i18n";
import {
  filterCommandPaletteEntries,
  firstEnabledCommandPaletteIndex,
  listCommandPaletteEntries,
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
}

const initialInputValue = ">";

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

function commandPaletteItemClassName(selected: boolean, enabled: boolean): string {
  const classNames = ["commandPaletteItem"];

  if (selected) {
    classNames.push("commandPaletteItemSelected");
  }

  if (!enabled) {
    classNames.push("commandPaletteItemDisabled");
  }

  return classNames.join(" ");
}

export function CommandPalette({
  commandRegistry,
  translate,
  isComposing,
  commandContext,
  onExecuteCommand,
  onBlockedCommand,
  onClose
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
                  className={commandPaletteItemClassName(
                    index === selectedIndex,
                    entry.enabled
                  )}
                  onClick={() => executeEntryAt(index)}
                >
                  <div className="commandPaletteItemPrimary">
                    {entry.description ?? entry.label}
                  </div>
                  <div className="commandPaletteItemSecondary">
                    {entry.canonicalLabel ?? entry.id}
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
