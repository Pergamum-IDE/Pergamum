# Architecture Review

Issue: [#3 Architecture stabilization](https://github.com/Pergamum-IDE/Pergamum/issues/3)

## Current Boundaries

- The main process owns Electron app lifecycle, window creation, native dialogs, and filesystem access.
- The preload script exposes a narrow `window.pergamum.files` API with `contextBridge`.
- The renderer owns editor state, Markdown preview rendering, and document UI.
- `FILE_CHANNELS` now has one source of truth in `src/shared/api.ts`.
- The preload script is bundled into one runtime file so it can import shared source while `sandbox: true` remains enabled.

## Security Findings

- `BrowserWindow` uses `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- Renderer code has no direct Node.js or filesystem access.
- Filesystem operations are limited to explicit IPC handlers in the main process.
- `markdown-it` is configured with `html: false`, which avoids rendering raw HTML from Markdown by default.
- The current content security policy permits inline styles because CodeMirror injects editor styles at runtime. This is acceptable for the bootstrap, but CSP should be revisited when packaging and extension/plugin surfaces are introduced.

## Responsibility Separation

- Main process responsibilities are currently limited and appropriate.
- Preload is a small bridge, not an application service layer.
- Renderer state is local React state, which matches the current single-document scope.
- No renderer abstraction, state-management library, routing layer, or plugin boundary is needed yet.

## Dependencies

- Current runtime dependencies map directly to Issue #1 requirements: React, CodeMirror, and `markdown-it`.
- Current development dependencies are limited to Electron, Vite, TypeScript, React types, Node types, and Markdown parser types.
- Vite is now used for both renderer build and preload bundling, avoiding an additional bundler dependency.

## Future Concerns

- The file API is intentionally single-document oriented. Project, Glossary, Git, and Plugin features should add narrow APIs through preload instead of widening renderer privileges.
- IPC payload validation is minimal. Future APIs that write multiple files or invoke project-level operations should use stricter request validation.
- The Markdown preview currently renders trusted parser output with `dangerouslySetInnerHTML`; raw HTML is disabled. If Markdown plugins or richer preview features are added, sanitization policy should be reviewed before enabling them.
- Plugin features should not share the current file IPC channels. They will need explicit capability boundaries and a separate permission model.
