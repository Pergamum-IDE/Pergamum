/**
 * Correlation id for document-open timing debug events (#152), matching the
 * plain-counter pattern already used for context-menu interaction ids
 * (`createContextMenuInteractionIdFactory`). Not derived from the opened
 * file's path or content, not persisted, and not meaningful across
 * sessions — it only ties together the timing events for one open.
 */
export function createDocumentOpenIdFactory(): () => string {
  let nextIndex = 0;

  return () => {
    nextIndex += 1;
    return `documentOpen.${nextIndex}`;
  };
}
