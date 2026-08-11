import { describe, expect, it, vi } from "vitest";
import {
  GLOSSARY_CHANNELS,
  type PergamumApi
} from "../../src/shared/api";

const electronMock = vi.hoisted(() => ({
  exposedApi: undefined as PergamumApi | undefined,
  exposeInMainWorld: vi.fn((key: string, api: PergamumApi) => {
    electronMock.exposedApi = api;
  }),
  invoke: vi.fn()
}));

vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld: electronMock.exposeInMainWorld
  },
  ipcRenderer: {
    invoke: electronMock.invoke
  }
}));

await import("../../src/preload/preload");

describe("glossary preload API", () => {
  it("exposes glossary operations through the Pergamum API", () => {
    expect(electronMock.exposeInMainWorld).toHaveBeenCalledWith(
      "pergamum",
      expect.objectContaining({
        glossary: expect.objectContaining({
          create: expect.any(Function),
          getById: expect.any(Function),
          list: expect.any(Function),
          update: expect.any(Function),
          delete: expect.any(Function)
        })
      })
    );
  });

  it("invokes glossary IPC channels with request payloads", async () => {
    const api = electronMock.exposedApi;

    if (!api) {
      throw new Error("Pergamum API was not exposed.");
    }

    await api.glossary.create({
      term: "魔導炉",
      description: "魔力を生成する設備"
    });
    await api.glossary.getById(42);
    await api.glossary.list();
    await api.glossary.update({
      id: 42,
      term: "大型魔導炉",
      description: "魔力を大量生成する設備"
    });
    await api.glossary.delete(42);

    expect(electronMock.invoke.mock.calls).toEqual([
      [
        GLOSSARY_CHANNELS.create,
        {
          term: "魔導炉",
          description: "魔力を生成する設備"
        }
      ],
      [
        GLOSSARY_CHANNELS.getById,
        {
          id: 42
        }
      ],
      [GLOSSARY_CHANNELS.list],
      [
        GLOSSARY_CHANNELS.update,
        {
          id: 42,
          term: "大型魔導炉",
          description: "魔力を大量生成する設備"
        }
      ],
      [
        GLOSSARY_CHANNELS.delete,
        {
          id: 42
        }
      ]
    ]);
  });
});
