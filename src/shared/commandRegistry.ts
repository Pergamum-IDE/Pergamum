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

export interface Command<
  TArgs extends readonly unknown[] = readonly [],
  TResult = void
> {
  readonly id: CommandId<TArgs, TResult>;
  readonly title: string;
  readonly execute: (
    ...args: CommandArgumentList<NoInfer<TArgs>>
  ) => NoInfer<TResult> | Promise<NoInfer<TResult>>;
  readonly isEnabled?: (
    ...args: CommandArgumentList<NoInfer<TArgs>>
  ) => boolean;
}

export type CommandArgumentList<TArgs extends readonly unknown[]> =
  TArgs extends readonly [...infer TItems] ? TItems : never;

type RegisteredCommand = Command<readonly unknown[], unknown>;

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

  register<TArgs extends readonly unknown[], TResult>(
    command: Command<TArgs, TResult>
  ): void {
    if (this.commands.has(command.id)) {
      throw new DuplicateCommandIdError(command.id);
    }

    this.commands.set(command.id, command as unknown as RegisteredCommand);
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
