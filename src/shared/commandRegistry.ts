import {
  evaluateCommandEnablement,
  validateCommandEnablementExpression,
  type CommandContext,
  type CommandEnablementExpression
} from "./commandEnablement";

declare const commandIdBrand: unique symbol;

export type CommandId<
  TArgs extends readonly unknown[] = readonly [],
  TResult = void
> = string & {
  readonly [commandIdBrand]: {
    readonly args: TArgs;
    readonly result: TResult;
  };
};

export interface CommandPaletteVisibility {
  readonly visible: boolean;
}

export interface Command<
  TArgs extends readonly unknown[] = readonly [],
  TResult = void
> {
  readonly id: CommandId<TArgs, TResult>;
  readonly title: string;
  readonly description?: string;
  readonly canonicalLabel?: string;
  readonly palette?: CommandPaletteVisibility;
  /**
   * Declarative execution enablement, distinct from Palette/menu visibility.
   * Omitted means enabled. See commandEnablement.ts for evaluation rules.
   */
  readonly when?: CommandEnablementExpression;
  readonly execute: (
    ...args: CommandArgumentList<NoInfer<TArgs>>
  ) => NoInfer<TResult> | Promise<NoInfer<TResult>>;
  /**
   * Imperative enablement predicate, evaluated live on every check (Palette
   * per-keystroke, toolbar render, and — since #128 — execution). Use `when`
   * instead wherever the condition is expressible as context keys; reserve
   * `isEnabled` for checks that need the command's own arguments or
   * controller/UI state that has no context key, e.g.
   * `isEnabled: () => controller.canDelegateNativeEditCommand(commandId)`,
   * which depends on the specific edit command ID being asked about.
   *
   * `isEnabled` and `when` are independent gates: a command is enabled only
   * if both allow it. Plugin-facing command APIs must not expose
   * `isEnabled` — arbitrary predicate functions from untrusted code are
   * exactly what `when` was introduced to avoid running on every Palette
   * keystroke.
   */
  readonly isEnabled?: (
    ...args: CommandArgumentList<NoInfer<TArgs>>
  ) => boolean;
}

export type CommandArgumentList<TArgs extends readonly unknown[]> =
  TArgs extends readonly [...infer TItems] ? TItems : never;

type RegisteredCommand = Command<readonly unknown[], unknown>;

/**
 * Combined enablement: legacy `Command.isEnabled` (imperative, argument-aware)
 * and `when` (declarative, evaluated against `context`) are independent
 * gates — a command is enabled only if both allow it. Shared by
 * `isEnabledForContext` (explicit context: Palette snapshot, toolbar live
 * context) and `execute` (injected live context) so the two never diverge.
 */
function isCommandEnabled<TArgs extends readonly unknown[], TResult>(
  command: Command<TArgs, TResult>,
  context: CommandContext,
  args: CommandArgumentList<TArgs>
): boolean {
  if (command.isEnabled && !command.isEnabled(...args)) {
    return false;
  }

  return evaluateCommandEnablement(command.when, context);
}

const commandIdSegmentPattern = /^[a-z][A-Za-z0-9]*$/;

/**
 * Command IDs name the user-visible operation, not the UI entry point.
 * Prefer {domain}.{target}.{verb}; keep the verb last; put objects on the
 * target side instead of folding them into the verb. Use a fourth segment only
 * when a compound target needs it. A Command ID may be used as the stem of an
 * i18n key, but it is not the displayed label itself.
 */

export class InvalidCommandIdError extends Error {
  constructor(commandId: string) {
    super(`Invalid command ID: ${commandId}`);
    this.name = "InvalidCommandIdError";
  }
}

export class DuplicateCommandIdError extends Error {
  constructor(commandId: string) {
    super(`Command is already registered: ${commandId}`);
    this.name = "DuplicateCommandIdError";
  }
}

export class UnknownCommandIdError extends Error {
  constructor(commandId: string) {
    super(`Unknown command: ${commandId}`);
    this.name = "UnknownCommandIdError";
  }
}

export class CommandDisabledError extends Error {
  readonly commandId: string;

  constructor(commandId: string) {
    super(`Command is disabled: ${commandId}`);
    this.name = "CommandDisabledError";
    this.commandId = commandId;
  }
}

export function isValidCommandId(commandId: string): boolean {
  const segments = commandId.split(".");

  return (
    segments.length >= 2 &&
    segments.every((segment) => commandIdSegmentPattern.test(segment))
  );
}

export function defineCommandId<
  TArgs extends readonly unknown[] = readonly [],
  TResult = void
>(commandId: string): CommandId<TArgs, TResult> {
  if (!isValidCommandId(commandId)) {
    throw new InvalidCommandIdError(commandId);
  }

  return commandId as CommandId<TArgs, TResult>;
}

export class CommandRegistry {
  private readonly commands = new Map<string, RegisteredCommand>();
  private contextProvider: (() => CommandContext) | null = null;
  private onCommandIgnored: ((commandId: string) => void) | null = null;

  register<TArgs extends readonly unknown[], TResult>(
    command: Command<TArgs, TResult>
  ): void {
    if (this.commands.has(command.id)) {
      throw new DuplicateCommandIdError(command.id);
    }

    if (command.when) {
      validateCommandEnablementExpression(command.when);
    }

    this.commands.set(command.id, command as unknown as RegisteredCommand);
  }

  /**
   * Injects a getter for the current live logical command context, used by
   * `execute` to re-evaluate `when` at execution time. Kept as a callback
   * (rather than a value) so the registry never holds a stale snapshot, and
   * as a plain function (rather than a renderer type) so this module stays
   * independent from UI/renderer dependencies.
   */
  setCommandContextProvider(provider: () => CommandContext): void {
    this.contextProvider = provider;
  }

  /**
   * Injects the `command.ignored` emission for registry-level `when`
   * rejection, so every `execute` call site is covered without each route
   * re-implementing the same logging.
   */
  setOnCommandIgnored(handler: (commandId: string) => void): void {
    this.onCommandIgnored = handler;
  }

  /**
   * Combined display-time enablement: legacy `Command.isEnabled` plus `when`
   * evaluated against the given context. Used for surfaces that show a
   * disabled state (Palette snapshot, toolbar live context) without going
   * through `execute`.
   */
  isEnabledForContext<TArgs extends readonly unknown[], TResult>(
    commandId: CommandId<TArgs, TResult>,
    context: CommandContext,
    ...args: CommandArgumentList<TArgs>
  ): boolean {
    return isCommandEnabled(this.require(commandId), context, args);
  }

  get<TArgs extends readonly unknown[], TResult>(
    commandId: CommandId<TArgs, TResult>
  ): Command<TArgs, TResult> | null {
    const command = this.commands.get(commandId);

    return command
      ? (command as unknown as Command<TArgs, TResult>)
      : null;
  }

  list(): readonly RegisteredCommand[] {
    return [...this.commands.values()];
  }

  isEnabled<TArgs extends readonly unknown[], TResult>(
    commandId: CommandId<TArgs, TResult>,
    ...args: CommandArgumentList<TArgs>
  ): boolean {
    const command = this.require(commandId);

    return command.isEnabled ? command.isEnabled(...args) : true;
  }

  async execute<TArgs extends readonly unknown[], TResult>(
    commandId: CommandId<TArgs, TResult>,
    ...args: CommandArgumentList<TArgs>
  ): Promise<Awaited<TResult>> {
    const command = this.require(commandId);
    const liveContext = this.contextProvider ? this.contextProvider() : {};

    if (!isCommandEnabled(command, liveContext, args)) {
      this.onCommandIgnored?.(String(commandId));
      throw new CommandDisabledError(commandId);
    }

    return (await command.execute(...args)) as Awaited<TResult>;
  }

  private require<TArgs extends readonly unknown[], TResult>(
    commandId: CommandId<TArgs, TResult>
  ): Command<TArgs, TResult> {
    const command = this.get(commandId);

    if (!command) {
      throw new UnknownCommandIdError(commandId);
    }

    return command;
  }
}
