import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  CommandRegistry,
  DuplicateCommandIdError,
  InvalidCommandIdError,
  UnknownCommandIdError,
  defineCommandId
} from "../../src/shared/commandRegistry";

describe("CommandRegistry", () => {
  it("registers and retrieves a command by stable ID", () => {
    const registry = new CommandRegistry();
    const commandId = defineCommandId("test.command.get");
    const command = {
      id: commandId,
      title: "Get command",
      execute: () => undefined
    };

    registry.register(command);

    expect(registry.get(commandId)).toBe(command);
  });

  it("lists registered commands", () => {
    const registry = new CommandRegistry();
    const firstCommandId = defineCommandId("test.command.first");
    const secondCommandId = defineCommandId("test.command.second");

    registry.register({
      id: firstCommandId,
      title: "First",
      execute: () => undefined
    });
    registry.register({
      id: secondCommandId,
      title: "Second",
      execute: () => undefined
    });

    expect(registry.list().map((command) => command.id)).toEqual([
      firstCommandId,
      secondCommandId
    ]);
  });

  it("rejects duplicate Command ID registration", () => {
    const registry = new CommandRegistry();
    const commandId = defineCommandId("test.command.duplicate");
    const command = {
      id: commandId,
      title: "Duplicate",
      execute: () => undefined
    };

    registry.register(command);

    expect(() => registry.register(command)).toThrow(DuplicateCommandIdError);
  });

  it("rejects unknown Command ID execution", async () => {
    const registry = new CommandRegistry();
    const commandId = defineCommandId("test.command.unknown");

    await expect(registry.execute(commandId)).rejects.toThrow(
      UnknownCommandIdError
    );
  });

  it("awaits a sync command", async () => {
    const registry = new CommandRegistry();
    const commandId = defineCommandId("test.command.sync");
    const execute = vi.fn(() => "sync-result");

    registry.register({
      id: commandId,
      title: "Sync",
      execute
    });

    await expect(registry.execute(commandId)).resolves.toBe("sync-result");
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("awaits an async command", async () => {
    const registry = new CommandRegistry();
    const commandId = defineCommandId("test.command.async");

    registry.register({
      id: commandId,
      title: "Async",
      execute: async () => "async-result"
    });

    await expect(registry.execute(commandId)).resolves.toBe("async-result");
  });

  it("propagates command arguments and return values", async () => {
    const registry = new CommandRegistry();
    const commandId = defineCommandId<readonly [left: number, right: number], number>(
      "test.command.sum"
    );

    registry.register({
      id: commandId,
      title: "Sum",
      execute: (left, right) => left + right
    });

    await expect(registry.execute(commandId, 2, 3)).resolves.toBe(5);
  });

  it("propagates thrown errors as rejected execution", async () => {
    const registry = new CommandRegistry();
    const commandId = defineCommandId("test.command.throw");
    const error = new Error("boom");

    registry.register({
      id: commandId,
      title: "Throw",
      execute: () => {
        throw error;
      }
    });

    await expect(registry.execute(commandId)).rejects.toBe(error);
  });

  it("propagates rejected promises as rejected execution", async () => {
    const registry = new CommandRegistry();
    const commandId = defineCommandId("test.command.reject");
    const error = new Error("rejected");

    registry.register({
      id: commandId,
      title: "Reject",
      execute: async () => {
        throw error;
      }
    });

    await expect(registry.execute(commandId)).rejects.toBe(error);
  });

  it("preserves command titles independently from Command IDs", () => {
    const registry = new CommandRegistry();
    const commandId = defineCommandId("test.command.title");

    registry.register({
      id: commandId,
      title: "Readable title",
      execute: () => undefined
    });

    expect(registry.get(commandId)?.title).toBe("Readable title");
  });

  it("evaluates enablement hooks with command arguments", () => {
    const registry = new CommandRegistry();
    const commandId = defineCommandId<readonly [entryId: string], void>(
      "test.command.enable"
    );
    const isEnabled = vi.fn((entryId: string) => entryId.length > 0);

    registry.register({
      id: commandId,
      title: "Enable",
      execute: () => undefined,
      isEnabled
    });

    expect(registry.isEnabled(commandId, "entry-1")).toBe(true);
    expect(registry.isEnabled(commandId, "")).toBe(false);
    expect(isEnabled).toHaveBeenLastCalledWith("");
  });

  it("treats commands without enablement hooks as enabled", () => {
    const registry = new CommandRegistry();
    const commandId = defineCommandId("test.command.defaultEnabled");

    registry.register({
      id: commandId,
      title: "Default enabled",
      execute: () => undefined
    });

    expect(registry.isEnabled(commandId)).toBe(true);
  });

  it("rejects invalid Command ID syntax", () => {
    expect(() => defineCommandId("invalid command")).toThrow(
      InvalidCommandIdError
    );
    expect(() => defineCommandId("editor")).toThrow(InvalidCommandIdError);
  });

  it("keeps the registry module independent from UI dependencies", () => {
    const source = readFileSync("src/shared/commandRegistry.ts", "utf8");

    expect(source).not.toContain("from \"react\"");
    expect(source).not.toContain("from 'react'");
    expect(source).not.toContain("../renderer");
    expect(source).not.toContain("window.");
    expect(source).not.toContain("document.");
    expect(source).not.toContain("HTMLElement");
    expect(source).not.toContain("JSX");
  });
});
