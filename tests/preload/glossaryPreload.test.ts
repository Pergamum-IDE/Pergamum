import { describe, expect, it, vi } from "vitest";
import {
  FILE_CHANNELS,
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

const entryId = "018f4b8c-7a2b-7c3d-8e4f-123456789abc";

describe("glossary preload API", () => {
  it("exposes glossary operations through the Pergamum API", () => {
    expect(electronMock.exposeInMainWorld).toHaveBeenCalledWith(
      "pergamum",
      expect.objectContaining({
        glossary: expect.objectContaining({
          create: expect.any(Function),
          getById: expect.any(Function),
          list: expect.any(Function),
          lookupSurface: expect.any(Function),
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
      kind: "item",
      canonicalSurface: "魔導炉",
      description: "魔力を生成する設備"
    });
    await api.glossary.getById(entryId);
    await api.glossary.list();
    await api.glossary.lookupSurface("魔導炉");
    await api.glossary.update({
      id: entryId,
      kind: "concept",
      description: "魔力を大量生成する技術",
      canonicalSurface: "魔導炉",
      forms: [
        {
          surface: "魔力炉",
          relation: "alias",
          warningPolicy: "default",
          matchBoundaryStart: "auto",
          matchBoundaryEnd: "auto"
        }
      ]
    });
    await api.glossary.delete(entryId, "この語彙を削除します。よろしいですか？");

    expect(electronMock.invoke.mock.calls).toEqual([
      [
        GLOSSARY_CHANNELS.create,
        {
          kind: "item",
          canonicalSurface: "魔導炉",
          description: "魔力を生成する設備"
        }
      ],
      [
        GLOSSARY_CHANNELS.getById,
        {
          id: entryId
        }
      ],
      [GLOSSARY_CHANNELS.list],
      [
        GLOSSARY_CHANNELS.lookupSurface,
        {
          surface: "魔導炉"
        }
      ],
      [
        GLOSSARY_CHANNELS.update,
        {
          id: entryId,
          kind: "concept",
          description: "魔力を大量生成する技術",
          canonicalSurface: "魔導炉",
          forms: [
            {
              surface: "魔力炉",
              relation: "alias",
              warningPolicy: "default",
              matchBoundaryStart: "auto",
              matchBoundaryEnd: "auto"
            }
          ]
        }
      ],
      [
        GLOSSARY_CHANNELS.delete,
        {
          id: entryId,
          confirmMessage: "この語彙を削除します。よろしいですか？"
        }
      ]
    ]);
  });

  it("does not send project root information in standalone save requests", async () => {
    electronMock.invoke.mockClear();
    const api = electronMock.exposedApi;

    if (!api) {
      throw new Error("Pergamum API was not exposed.");
    }

    await api.files.saveMarkdown(null, "content");

    expect(electronMock.invoke).toHaveBeenCalledWith(
      FILE_CHANNELS.saveMarkdown,
      {
        path: null,
        content: "content"
      }
    );
  });
});
