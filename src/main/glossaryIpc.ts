import { ipcMain } from "electron";
import {
  GLOSSARY_CHANNELS,
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
  updateGlossaryEntry
} from "./glossaryStore";
import {
  openProjectDatabase,
  type ProjectDatabase
} from "./projectDatabase";
import { requireCurrentProjectRootPath } from "./projectIpc";

export type CurrentProjectRootPathProvider = () => string;

export interface GlossaryIpcHandlers {
  create(rawRequest: unknown): Promise<GlossaryEntry>;
  getById(rawRequest: unknown): Promise<GlossaryEntry | null>;
  list(): Promise<GlossaryEntry[]>;
  lookupSurface(rawRequest: unknown): Promise<GlossarySurfaceLookupResult>;
  update(rawRequest: unknown): Promise<GlossaryEntry>;
  delete(rawRequest: unknown): Promise<void>;
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
    requireCurrentProjectRootPath
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
    async delete(rawRequest) {
      const request = parseGlossaryEntryIdRequest(rawRequest);

      return withCurrentProjectDatabase(
        getCurrentProjectRootPath,
        (database) => deleteGlossaryEntry(database, request.id)
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
  ipcMain.handle(GLOSSARY_CHANNELS.delete, (_event, rawRequest: unknown) =>
    handlers.delete(rawRequest)
  );
}
