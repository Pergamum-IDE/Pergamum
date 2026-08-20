# Settings Inventory

Date: 2026-08-20

Related:

- Issue #150: Settings Catalog Foundation
- ADR-0006: Settings Architecture

## Scope

Inventory target:

- `src/renderer`
- `src/main`
- `src/shared`
- `docs/adr`

This inventory classifies current hardcoded setting candidates before ADR-0006 / Settings Catalog Foundation.

This document does not propose implementing every value as settings. It separates current values into Settings Catalog candidates, Project settings candidates, domain data, internal constants, debug/dev-only constants, and items that need Product Owner or ADR decisions.

## Settings Catalog Candidate

| Area | Current value | Location | Proposed scope | Priority | Notes |
|---|---:|---|---|---:|---|
| `general.language` | `ja`; supported `ja`, `en` | `src/shared/settings.ts`, `src/shared/i18n/index.ts` | Application | P0 | Already implemented in app settings. |
| `general.showStatusBar` | `true` | `src/shared/settings.ts`, `src/renderer/App.tsx` | Application | P0 | Already implemented and exposed in `SettingsPanel`. |
| `preview.renderer` | `markdown` | `src/shared/settings.ts`, `src/main/projectConfigStore.ts` | App + Project override | P0 | Already effective-resolved; currently only valid renderer is `markdown`. |
| UI theme / color theme | Light palette; many hardcoded CSS colors | `src/renderer/styles.css` | Application | P1 | Use selected theme + semantic tokens, not individual color settings. Needs key-name decision: current catalog uses `appearance.uiTheme`; ADR-0006 chooses `workbench.colorTheme`. |
| UI font family | `Inter, ui-sans-serif, system-ui, ...` | `src/renderer/styles.css`, `src/shared/settings.ts` | Application | P1 | Catalog key exists but is not implemented. |
| UI font size scale | CSS uses `10px` to `32px`, plus rem values | `src/renderer/styles.css` | Application | P1 | Prefer base UI scale, not exposing every component size. |
| Editor font family | `"Cascadia Code", "SFMono-Regular", Consolas, monospace` | `src/renderer/styles.css`, `src/shared/settings.ts` | App + Project override | P1 | Catalog key exists; not applied yet. |
| Editor font size | `15px` | `src/renderer/styles.css`, `src/shared/settings.ts` | App + Project override | P1 | Catalog key exists; not applied yet. |
| Editor line height | `1.55` | `src/renderer/styles.css`, `src/shared/settings.ts` | App + Project override | P1 | Catalog key exists; not applied yet. |
| Editor word wrap | `EditorView.lineWrapping` always enabled | `src/renderer/MarkdownEditor.tsx`, `src/shared/settings.ts` | App + Project override | P1 | Catalog key exists; current behavior is enabled. |
| Editor caret | no explicit value; browser/CodeMirror default | `src/shared/settings.ts` | Application or App + Project override | P2 | Catalog has `caretWidth`, `caretStyle`, `caretBlink`; no runtime application yet. |
| Preview font / size / line height | base inherits UI; `.preview` line-height `1.65`; h1 `28px`, h2 `22px` | `src/renderer/styles.css`, `src/shared/settings.ts` | App + Project override | P2 | Catalog has font family/size/writing direction, but not `preview.lineHeight`. |
| Quick Access line results | `20` candidates | `src/renderer/lineJumpCandidates.ts` | Application | P2 | Explicitly commented as later settings-backed. |
| Quick Access line preview length | `20` chars | `src/renderer/lineJumpPreview.ts` | Application | P2 | Explicitly parameterized for later override. |
| Quick Access preview ellipsis | `...` | `src/renderer/lineJumpPreview.ts` | Application | P3 | Low priority. |
| Advanced settings gate | not implemented; ADR-0000 says persist enabled state | `docs/adr/0000-accessibility-and-inclusive-interaction-principles.ja.md` | Application | P1 | Needs app-wide `settings.json` key. |

## Project Settings Candidate

| Area | Current value | Location | Proposed scope | Priority | Notes |
|---|---:|---|---|---:|---|
| `settings.preview.renderer` | accepts only `markdown` | `src/main/projectConfigStore.ts` | Project | P0 | Already parsed from `(workpath)/pergamum.json`. |
| Editor display overrides | catalog says app/project override; project parser does not yet parse editor keys | `src/shared/settings.ts`, `src/main/projectConfigStore.ts` | Project override | P1 | Needed if ADR-0006 keeps `Project > Application > Default`. |
| Project path settings | catalog has manuscript/glossary/assets directories; not implemented | `src/shared/settings.ts`, `docs/adr/0001-project-persistence-architecture.md` | Project | P3 | Current code discovers all `.md` recursively from root. Needs migration/path policy. |

## Domain Data, Not Settings

| Area | Current value | Location | Proposed scope | Priority | Notes |
|---|---|---|---|---:|---|
| Glossary Kind | `term`, `person`, `place`, `organization`, `item`, `concept` | `src/shared/glossary.ts` | Domain data | N/A | Issue #150 explicitly excludes Glossary Kind settings. |
| Glossary form relation | `variant`, `alias` | `src/shared/glossary.ts` | Domain data | N/A | Entry/form model data. |
| Glossary warning policy | `default`, `ignore`, `warn` | `src/shared/glossary.ts` | Domain data | N/A | Form behavior data, not UI preference. |
| Glossary match boundary | `auto`, `strict`, `none`; default `auto` | `src/shared/glossary.ts` | Domain data | N/A | Issue #150 explicitly excludes boundary policy settings. |
| Glossary Navigator search policy | ASCII-only lowercase; canonical/alias/variant surfaces only | `src/renderer/glossaryNavigatorSearch.ts` | Renderer behavior | N/A | Display-only search behavior, not persistent setting. |

## Internal Constant, Not Settings

| Area | Current value | Location | Proposed scope | Priority | Notes |
|---|---:|---|---|---:|---|
| Workbench layout defaults | sidebar `260`, min/max `180/420`; editor/preview ratio `0.5`; utility height `220` | `src/renderer/workbenchLayout.ts` | Session/layout state | N/A | Do not mix with settings until session restore policy is decided. |
| Panel initial visibility | settings/recent/command palette closed; utility window closed | `src/renderer/App.tsx` | UI runtime state | N/A | Not durable settings by default. |
| Sidebar default mode | `files` | `src/renderer/sidebarMode.ts` | UI runtime state | N/A | Could become session restore, not Settings Catalog. |
| Responsive breakpoint | `max-width: 760px` | `src/renderer/EditorSurface.tsx`, `src/renderer/styles.css` | Internal layout | N/A | Layout implementation detail. |
| Main window size | `1200x800`, min `800x560` | `src/main/main.ts` | Window/session state | N/A | Needs session restore, not ordinary settings. |
| Markdown editor setup | `basicSetup`, `markdown()`, line wrapping | `src/renderer/MarkdownEditor.tsx` | Internal/editor policy | N/A | `wordWrap` is the configurable part. |
| Preview performance containment | `contain: layout paint`, `content-visibility:auto`, intrinsic `32px/120px` | `src/renderer/styles.css` | Internal performance | N/A | Do not expose as settings. |
| Hover card layout | margin `8`, width `320`, top offset `6` | `src/renderer/GlossaryPreviewDecorator.tsx` | Internal UI | N/A | Theme/layout internals. |
| Hover description preview | `96` chars | `src/renderer/glossaryHoverCardContent.ts` | Internal UI | N/A | Candidate only if PO wants user control. |

## Debug/Dev-Only Constant, Not Settings

| Area | Current value | Location | Proposed scope | Priority | Notes |
|---|---:|---|---|---:|---|
| Debug enablement | `--pergamum-debug` | `src/main/debugMode.ts` | CLI/dev-only | N/A | Do not enable log sink via settings. |
| Debug UI buffer | `1000` | `src/shared/debugLog.ts` | Debug/dev-only | N/A | Not user preference. |
| JSONL max lines | `10000` | `src/main/jsonlDebugLogSink.ts` | Debug/dev-only | N/A | Rotation/safety constant. |
| Pre-sink queue | `200` | `src/main/jsonlDebugLogSink.ts` | Debug/dev-only | N/A | Not Settings UI. |
| Gap recovery limit | `3` | `src/shared/debugLog.ts` | Debug/dev-only | N/A | Debug panel robustness constant. |
| Filename collision suffix | `99` | `src/main/jsonlDebugLogSink.ts` | Debug/dev-only | N/A | File sink implementation detail. |
| rAF fallback | `16ms` timeout | `src/renderer/debugLogPanelState.ts` | Debug/dev-only | N/A | UI batching fallback. |
| Viewport debug debounce | `400ms` | `src/renderer/EditorSurface.tsx` | Debug/dev-only | N/A | Diagnostic event debounce, not UX setting. |

## Needs PO Decision / ADR Decision

| Area | Current value | Location | Proposed scope | Priority | Notes |
|---|---|---|---|---:|---|
| Theme key naming | `appearance.uiTheme` catalog vs Issue example `workbench.colorTheme` | `src/shared/settings.ts` | Application | P0 | Needs PO decision. ADR-0006 chooses `workbench.colorTheme` as the architecture name. |
| Encoding default | file/project/settings all read/write `utf8` | `src/main/fileIpc.ts`, `src/main/projectIpc.ts`, `src/main/settingsStore.ts` | Advanced application setting | P2 | Needs PO decision because ADR-0000 treats encoding as Advanced Settings. |
| New file line ending | untitled content uses LF; saves write current string as-is | `src/renderer/currentDocument.ts`, `src/main/fileIpc.ts` | Advanced app/project | P2 | Needs PO decision for default vs preserve behavior. |
| Line ending / whitespace markers | no marker implementation found | search across target | App + Project override | P1 | Needs PO decision for keys, glyph defaults, and whether whitespace markers are separate. |
| Zoom/display scale | Electron menu roles exist; no persisted zoom state | `src/main/menu.ts`, `docs/adr/0000-accessibility-and-inclusive-interaction-principles.ja.md` | Application or session | P2 | Needs PO decision: setting, session state, or runtime-only visible state. |
| Markdown preview feature flags | `html:false`, `linkify:true` | `src/renderer/preview/markdownPreviewRenderer.ts` | Project/app preview | P2 | `html:false` should remain security policy; `linkify` may be project setting. Needs PO decision. |
| Quick Access prefixes | `""`, `>`, `:`, `#`, `@`; default input `>` | `src/renderer/quickAccessInputParser.ts`, `src/renderer/CommandPalette.tsx` | Application | P3 | Needs PO decision; prefix customization is out of scope for the narrowed #150 slice. |
| Glossary match minimum length | `2` | `src/shared/glossarySurfaceMatching.ts` | Domain/ADR | P3 | Affects matching semantics; not ordinary setting unless PO explicitly wants it. |
| Untitled document template | `# Untitled...` starter text; default name `Untitled.md` | `src/renderer/currentDocument.ts`, `src/main/fileIpc.ts` | Product/project template | P3 | Needs PO decision; not Settings Catalog by default. |

## Not Found

| Area | Result |
|---|---|
| Explicit zoom persistence | Not found. |
| Display scale setting | Not found. |
| Line ending marker setting / decoration | Not found. |
| Whitespace marker setting / decoration | Not found. |
| Settings hot reload / file watcher | Not found in target implementation. |
| Advanced settings enable gate implementation | Not found; only ADR policy exists. |

## Notes for ADR-0006

- Current code already contains a partial Settings Catalog and application/project settings read path.
- Current effective resolution exists for `preview.renderer`; most catalog entries are metadata-only.
- Avoid placing domain data such as Glossary Kind, Glossary Form boundary policy, relation, or warning policy under `pergamum.json.settings`.
- Separate durable settings from session/layout state before deciding where workbench dimensions and panel visibility live.
- Debug logging must remain CLI/dev-only for sink enablement; viewer presentation settings can be considered later, but log collection should not be toggled from ordinary Settings UI.
- Settings files must be treated as untrusted input. This matters especially for project settings because a project directory can be shared or version-controlled.
