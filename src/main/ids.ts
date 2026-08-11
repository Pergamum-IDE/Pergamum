import { v7 as uuidv7 } from "uuid";
import { validateUuidv7 } from "../shared/glossary";

export function createUuidv7(): string {
  return validateUuidv7(uuidv7().toLowerCase());
}
