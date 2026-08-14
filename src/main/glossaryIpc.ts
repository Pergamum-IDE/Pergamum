import {
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
  type MessageBoxOptions
} from "electron";
import {
  GLOSSARY_CHANNELS,
  type DeleteGlossaryEntryRequest,
  type DeleteGlossaryEntryResult,
  type GlossaryEntryIdRequest,
  type GlossarySurfaceLookupRequest
} from "../shared/api";
import {
  validateCreateGlossaryEntryInput,
  validateGlossaryEntryId,
  validateGlossarySurfaceLookupInput,
  validateUpdateGlossaryEntryInput,
  type CreateGlossaryEntryInput,
  type GlossaryEntry,
  type GlossarySurfaceLookupResult,
  type UpdateGlossaryEntryInput
} from "../shared/glossary";
import {
  createGlossaryEntry,
  deleteGlossaryEntry,
  getGlossaryEntryById,
  listGlossaryEntries,
  lookupGlossarySurface,
  updateGlossaryEntry,
  GlossaryStoreError
} from "./glossaryStore";
import {
  openProjectDatabase,
  type ProjectDatabase
} from "./projectDatabase";
import { requireCurrentProjectRootPath } from "./projectIpc";

export type CurrentProjectRootPathProvider = () => string;

// index 0 ("OK") confirms the deletion; index 1 ("Cancel") is both the
// default and cancel action, matching every dismiss path (Cancel, ESC,
// dialog close, window close, undefined) to a single safe "do not delete".
const DELETE_CONFIRM_BUTTON_INDEX = {
  ok: 0,
  cancel: 1
} as const;

export type ConfirmGlossaryEntryDeletion = (
  event: IpcMainInvokeEvent | undefined,
  confirmMessage: string
) => Promise<boolean>;

export interface GlossaryIpcHandlers {
  create(rawRequest: unknown): Promise<GlossaryEntry>;
  getById(rawRequest: unknown): Promise<GlossaryEntry | null>;
  list(): Promise<GlossaryEntry[]>;
  lookupSurface(rawRequest: unknown): Promise<GlossarySurfaceLookupResult>;
  update(rawRequest: unknown): Promise<GlossaryEntry>;
  delete(
    rawRequest: unknown,
    event?: IpcMainInvokeEvent
  ): Promise<DeleteGlossaryEntryResult>;
}

function isRequestObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseGlossaryEntryIdRequest(
  value: unknown
): GlossaryEntryIdRequest {
  if (!isRequestObject(value)) {
    throw new Error("Invalid glossary entry ID request.");
  }

  return {
    id: validateGlossaryEntryId(value.id)
  };
}

function parseDeleteGlossaryEntryRequest(
  value: unknown
): DeleteGlossaryEntryRequest {
  if (!isRequestObject(value)) {
    throw new Error("Invalid glossary entry delete request.");
  }

  if (typeof value.confirmMessage !== "string" || value.confirmMessage.length === 0) {
    throw new Error("Invalid glossary entry delete confirmation message.");
  }

  return {
    id: validateGlossaryEntryId(value.id),
    confirmMessage: value.confirmMessage
  };
}

function parentWindow(
  event: IpcMainInvokeEvent | undefined
): BrowserWindow | undefined {
  return event ? BrowserWindow.fromWebContents(event.sender) ?? undefined : undefined;
}

async function confirmGlossaryEntryDeletionWithDialog(
  event: IpcMainInvokeEvent | undefined,
  confirmMessage: string
): Promise<boolean> {
  const owner = parentWindow(event);
  const options: MessageBoxOptions = {
    type: "warning",
    message: confirmMessage,
    buttons: ["OK", "Cancel"],
    defaultId: DELETE_CONFIRM_BUTTON_INDEX.cancel,
    cancelId: DELETE_CONFIRM_BUTTON_INDEX.cancel
  };
  const result = owner
    ? await dialog.showMessageBox(owner, options)
    : await dialog.showMessageBox(options);

  return result?.response === DELETE_CONFIRM_BUTTON_INDEX.ok;
}

function isMissingGlossaryEntryError(error: unknown): boolean {
  return (
    error instanceof GlossaryStoreError &&
    error.code === "GLOSSARY_ENTRY_NOT_FOUND"
  );
}

function parseGlossarySurfaceLookupRequest(
  value: unknown
): GlossarySurfaceLookupRequest {
  return validateGlossarySurfaceLookupInput(value);
}

async function withCurrentProjectDatabase<T>(
  getCurrentProjectRootPath: CurrentProjectRootPathProvider,
  operation: (database: ProjectDatabase) => Promise<T>
): Promise<T> {
  const projectRootPath = getCurrentProjectRootPath();
  const database = await openProjectDatabase(projectRootPath);

  try {
    return await operation(database);
  } finally {
    await database.close();
  }
}

export function createGlossaryIpcHandlers(
  getCurrentProjectRootPath: CurrentProjectRootPathProvider =
    requireCurrentProjectRootPath,
  confirmDeletion: ConfirmGlossaryEntryDeletion =
    confirmGlossaryEntryDeletionWithDialog
): GlossaryIpcHandlers {
  return {
    async create(rawRequest) {
      const input: CreateGlossaryEntryInput =
        validateCreateGlossaryEntryInput(rawRequest);

      return withCurrentProjectDatabase(
        getCurrentProjectRootPath,
        (database) => createGlossaryEntry(database, input)
      );
    },
    async getById(rawRequest) {
      const request = parseGlossaryEntryIdRequest(rawRequest);

      return withCurrentProjectDatabase(
        getCurrentProjectRootPath,
        (database) => getGlossaryEntryById(database, request.id)
      );
    },
    async list() {
      return withCurrentProjectDatabase(
        getCurrentProjectRootPath,
        listGlossaryEntries
      );
    },
    async lookupSurface(rawRequest) {
      const request = parseGlossarySurfaceLookupRequest(rawRequest);

      return withCurrentProjectDatabase(
        getCurrentProjectRootPath,
        (database) => lookupGlossarySurface(database, request)
      );
    },
    async update(rawRequest) {
      const input: UpdateGlossaryEntryInput =
        validateUpdateGlossaryEntryInput(rawRequest);

      return withCurrentProjectDatabase(
        getCurrentProjectRootPath,
        (database) => updateGlossaryEntry(database, input)
      );
    },
    async delete(rawRequest, event) {
      const request = parseDeleteGlossaryEntryRequest(rawRequest);
      const confirmed = await confirmDeletion(event, request.confirmMessage);

      if (!confirmed) {
        return { deleted: false };
      }

      return withCurrentProjectDatabase(
        getCurrentProjectRootPath,
        async (database) => {
          try {
            await deleteGlossaryEntry(database, request.id);
          } catch (error) {
            if (!isMissingGlossaryEntryError(error)) {
              throw error;
            }
          }

          return { deleted: true };
        }
      );
    }
  };
}

export function registerGlossaryIpc(): void {
  const handlers = createGlossaryIpcHandlers();

  ipcMain.handle(GLOSSARY_CHANNELS.create, (_event, rawRequest: unknown) =>
    handlers.create(rawRequest)
  );
  ipcMain.handle(GLOSSARY_CHANNELS.getById, (_event, rawRequest: unknown) =>
    handlers.getById(rawRequest)
  );
  ipcMain.handle(GLOSSARY_CHANNELS.list, () => handlers.list());
  ipcMain.handle(
    GLOSSARY_CHANNELS.lookupSurface,
    (_event, rawRequest: unknown) => handlers.lookupSurface(rawRequest)
  );
  ipcMain.handle(GLOSSARY_CHANNELS.update, (_event, rawRequest: unknown) =>
    handlers.update(rawRequest)
  );
  ipcMain.handle(GLOSSARY_CHANNELS.delete, (event, rawRequest: unknown) =>
    handlers.delete(rawRequest, event)
  );
}
