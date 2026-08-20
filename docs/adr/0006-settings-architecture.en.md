# ADR-0006: Durable State Categories and Settings Architecture

**Status:** Proposed

**Date:** 2026-08-20

---

## Context

Pergamum already has partial settings-related implementation:

- `src/shared/settings.ts`
- `src/main/settingsStore.ts`
- `src/main/projectConfigStore.ts`
- partial `SettingsPanel`
- project-level `settings.preview.renderer`

Issue #150 showed that "settings" mixes several concerns unless the boundaries
are explicit:

- durable user or project preferences
- application and project settings read/fallback behavior
- Settings Catalog metadata and validation
- future settings candidates
- hardcoded value inventory
- UI and write-path candidates
- session restore state
- recovery data
- runtime coordination state
- internal metadata
- project/domain data

ADR-0006 defines durable state categories and the settings architecture needed
to rewrite Issue #150 into a focused Settings Catalog Foundation implementation.

ADR-0006 does not define detailed recovery identity, recovery restore behavior,
or runtime coordination marker behavior. Those rules are owned by ADR-0007.

This ADR does not claim that the runtime implementation is complete.

---

## Related ADRs

- ADR-0000 Accessibility and Inclusive Interaction Principles requires safe
  startup behavior and user-visible diagnostics that do not leave users
  stranded when settings are missing, corrupt, or invalid.
- ADR-0001 Project Persistence Architecture defines the responsibility boundary
  between `pergamum.json` and `pergamum.db`.
- ADR-0003 UI Interaction Architecture defines the renderer / preload / main
  boundary and separates project state from current document and open document
  state. ADR-0006 does not amend ADR-0003 frozen interaction invariants.
- ADR-0007 Recovery and Runtime Coordination defines detailed recovery storage,
  identity, restore, marker, multi-instance, and cloud-sync rules.

---

## Decision

### Durable State Categories

**S-1. `settings` is deliberate preference or policy.**

`settings` means a deliberate user or project preference/policy. Settings are
not arbitrary restorable UI state, internal implementation metadata, recovery
data, runtime coordination state, or project domain data.

**S-2. `app-local meta` and `project-local meta` are separate categories.**

`app-local meta` is internal application metadata stored under app `userData`.

`project-local meta` is metadata that belongs to the project DB itself, such as
the schema version of `(workpath)/pergamum.db`.

The `pergamum.db` schema version is project-local meta and must live inside
`pergamum.db` itself. App `userData` must not be the only place where project DB
schema version is stored.

**S-3. `session` is user-local restorable working state.**

`session` includes user-local restorable working state such as open editors,
active editor, window bounds, pane ratio, selected navigator item, and expanded
nodes.

`session` is not `settings`.

**S-4. `recovery` is not settings or session.**

Recovery protects unsaved manuscript text. Manuscript text is a valid recovery
payload, so recovery must be treated as user content.

Recovery must not be stored in ordinary settings. Recovery must not be stored in
project settings or project domain DB by default.

Detailed recovery identity, storage, restore flow, and coordination rules are
defined by ADR-0007.

**S-5. `runtime coordination` is a separate temporary coordination category.**

Runtime coordination state is temporary coordination state used to warn about
same-project open situations or unclearly closed projects.

Runtime coordination is not `settings`, `session`, `recovery`, or project domain
data.

Detailed runtime coordination marker rules are defined by ADR-0007.

### Storage Responsibilities

**S-6. Storage locations are responsibility boundaries.**

Pergamum uses this storage model:

```text
Application settings:
  app.getPath("userData")/settings.json

Project settings:
  literal "settings" section in (workpath)/pergamum.json

Project domain data:
  (workpath)/pergamum.db

App-local meta:
  app userData-side store

Project-local meta:
  (workpath)/pergamum.db

Session:
  app userData-side store

Recovery:
  app userData-side dedicated recovery store/table by default

Runtime coordination:
  project-local coordination data; details in ADR-0007
```

`app userData-side store` means the data is owned under app `userData`.
ADR-0006 does not choose the backend for app-local meta/session storage unless
another ADR or existing implementation already does so. Backend selection is a
future implementation Issue.

User-local session and recovery must not be written to project DB or
`pergamum.json` by default.

Recovery must not be stored in a generic settings table. If implemented,
recovery must use a dedicated recovery store/table.

**S-7. Project settings live under the literal `"settings"` section.**

Project settings live under the literal `"settings"` section in
`(workpath)/pergamum.json`.

If the literal `"settings"` section is missing from `pergamum.json`, Pergamum
treats it as empty project settings.

Other project metadata sections in `pergamum.json` are not Project settings
unless another ADR or Issue explicitly defines them as such.

**S-8. Settings files use flat dotted keys on disk.**

`settings.json` and the literal `"settings"` section in `pergamum.json` use flat
dotted keys as the canonical on-disk representation.

Canonical example:

```json
{
  "settings": {
    "editor.lineEndingMarkers.enabled": true,
    "preview.renderer": "markdown"
  }
}
```

Nested object representation is not the canonical representation.

A setting entry is one flat dotted key and its value.

Catalog lookup, validation, unknown-key handling, scope validation, alias
handling, and invalid-entry rejection operate on flat dotted keys.

Nested representation, if found in existing implementation or files, is an
alignment/migration concern for a future implementation Issue.

ADR-0006 does not define support for both flat and nested representations.

### Settings Catalog

**S-9. Settings Catalog is the only source of default values.**

Settings Catalog is the only source of default values for cataloged settings.

Setting default values must be defined in Settings Catalog.

Consumers must not define independent fallback defaults such as `?? 16` for
cataloged settings.

Consumers must read cataloged setting values through the resolved settings path.

**S-10. Catalog definitions must include validation and ownership metadata.**

Catalog definitions must express enough validation information for each setting,
including where applicable:

- type
- enum values
- numeric range
- max length
- allowed character policy
- scope
- default value
- deprecated aliases
- migration notes

**S-11. Setting keys use a dot-separated pattern.**

Setting keys use this pattern:

```text
{area}.{feature?}.{property}
```

Examples:

```text
workbench.colorTheme
editor.fontFamily
editor.decorations.enabled
editor.decorations.lineEndingMarkers.enabled
quickAccess.lineJump.previewLineCount
```

`area` is the top-level category. `feature` is used only when needed. `property`
is the final setting target.

The initial allowed `area` set is:

```text
workbench
editor
preview
quickAccess
files
debug
```

Follow-up Issues must avoid mixed naming such as `editor.caret.width` and
`editor.caretWidth` for the same concept.

Follow-up Issues must avoid introducing both `ui` and `workbench` for the same
UI-level concept.

Existing #150/catalog candidates that use nonconforming areas must be aligned in
the implementation Issue.

Examples include:

- `ui.fontFamily`
- `ui.fontSize`
- `statusBar.visible`
- `locale`

ADR-0006 does not silently add `ui`, `statusBar`, or top-level `locale` areas.
Future implementation must either rename them into `S-11`-compatible keys or
explicitly extend the area set through an ADR/Issue.

### Effective Settings Resolution

**S-12. Effective settings use one canonical resolution order.**

Effective settings are resolved in this order:

```text
Project > Application > Default
```

When no project is open, effective settings are resolved in this order:

```text
Application > Default
```

Not every setting is project-overridable. Each catalog entry must declare one of
these scopes:

- application-only
- project-only
- application with project override

**S-13. Effective settings are re-resolved at defined lifecycle points.**

The main process recalculates the effective settings snapshot at these times:

- application startup
- project open
- project close
- project switch
- after a future settings write path completes a successful write

The renderer receives a full resolved effective settings snapshot. Diff payloads
are not used for the initial architecture.

When the renderer receives an update event, it applies the updated settings on
the next renderer state update/render cycle.

Project switch must be atomic for settings resolution. Project switch must
produce one effective snapshot and must not emit a close-snapshot followed by an
open-snapshot. This avoids double re-layout/flicker for project-overridable
display settings such as editor font and preview layout.

### Main / Renderer Boundary

**S-14. The main process owns settings I/O and resolution.**

The main process owns:

- settings file I/O
- parsing
- validation
- fallback
- effective resolution

The renderer receives a resolved effective settings snapshot through IPC.

The renderer must not read settings files directly.

The renderer must not import SQLite directly. This restates the existing
Electron boundary from ADR-0003.

### Untrusted Input and Safe Application

**S-15. Application settings and project settings are untrusted input.**

Application settings and project settings are both untrusted input.

Project settings arrive from other users through shared project directories,
version control, copied archives, or external storage.

A string setting is not valid merely because it is a string.

Main-process validation is required. The renderer must still avoid unsafe DOM/CSS
application as defense in depth.

**S-16. CSS/DOM-facing values require a safe application path.**

CSS-facing values must not be applied by stylesheet string concatenation.

CSS-facing values must not be applied through raw `style` attribute string
interpolation.

DOM-facing values must not be applied through `innerHTML`.

CSS-facing setting values must be applied through validated CSS custom
properties set via `style.setProperty`.

Other CSS application mechanisms require a future design decision.

Theme names must be enum/catalog references, not arbitrary stylesheet text.

Font family settings require catalog validation such as max length and allowed
character policy before application.

### Known Settings Decisions

**S-17. `preview.renderer` remains project-overridable for now.**

`preview.renderer` remains a project-overridable setting.

Allowed values are a Settings Catalog enum closed set.

The v0.90.0 allowed value is only:

```text
markdown
```

Renderer selection must not change preview security policy.

Markdown preview `html:false` is a security policy and must be forced by the
renderer implementation.

Project settings cannot weaken `html:false`.

Arbitrary renderer paths, plugin renderers, and user-provided renderers are out
of scope for ADR-0006.

Any later new `preview.renderer` value requires security review.

**S-18. `workbench.colorTheme` is the architecture name.**

ADR-0006 adopts this architecture name for selected color theme:

```text
workbench.colorTheme
```

The legacy key `appearance.uiTheme` is accepted as a deprecated read alias.

When both keys exist, `workbench.colorTheme` wins.

The effective snapshot contains only `workbench.colorTheme`. The renderer must
not receive both old and new keys.

A future write path must write `workbench.colorTheme`.

A future write path must not silently destroy unknown/deprecated keys unless
migration is explicitly implemented.

Deprecated alias acceptance must be observable in future diagnostics/logging,
but ADR-0006 does not implement diagnostics.

If existing code uses `ui.fontFamily`, it is an alignment candidate. This
documentation-only task does not define a migration.

**S-19. `editor.decorations.enabled` is the global AND gate.**

The setting:

```text
editor.decorations.enabled
```

is the global AND gate for editor decorations.

For example:

```json
{
  "editor.decorations.enabled": false,
  "editor.decorations.lineEndingMarkers.enabled": true
}
```

In this case, effective runtime visibility is false.

Individual decoration toggles do not force visibility when the global decoration
gate is disabled.

### Invalid, Unknown, Scope, Corrupt, and Encoding Handling

**S-20. Unknown keys are ignored for resolution.**

An unknown key is not an invalid known value.

An unknown key is not a scope violation.

Unknown keys are ignored for resolution.

A future write path must preserve unknown keys where practical to avoid data
loss across version changes.

**S-21. Invalid known values reject only that scope value.**

An invalid known value rejects only the value from that scope. Resolution then
continues to the next scope.

Example:

```text
Project value invalid
  -> Application value
  -> Default
```

Pergamum searches for the first valid value in `Project > Application > Default`
order. If no valid value exists in any file scope, it uses the catalog default.

**S-22. Settings rejections use a closed debug vocabulary.**

A scope violation is a settings entry placed in a scope where that key is not
allowed. For example, an application-only key in project settings is a scope
violation.

Scope violations must be rejected. The violating project entry is not adopted,
and resolution continues through the application/default chain.

`settings.rejected` is the debug event name for invalid known value, scope
violation, and corrupt settings-file rejection diagnostics.

`settings.rejected` must be registered in the debug event allowlist catalog
before implementation emits it.

Event names are closed-set allowlist entries.

`reason` is a closed set. Initial allowed `reason` values are exactly:

- `invalidValue`
- `scopeViolation`
- `corruptFile`

Adding a new reason requires updating the debug event allowlist/catalog.

`settings.ignored` must not be used for invalid known values or scope
violations.

Each settings resolution pass must have a `resolutionId` or equivalent
correlation identifier.

Within one resolution pass, the same rejection for the same key/scope/reason
must not be emitted repeatedly.

Debug payload must not contain manuscript text or raw setting values that could
contain user content. It must follow the existing safe debug logging policy.

**S-23. Corrupt application settings and corrupt project config differ.**

When `settings.json` is missing, Pergamum uses defaults and must not fail
startup.

No warning is required for a missing `settings.json`.

When `settings.json` has a parse failure or corrupt content, Pergamum uses
defaults and must not fail startup.

Pergamum must not automatically overwrite corrupt `settings.json`.

Pergamum must notify the user that application settings could not be loaded.
Notification UX details are a future Issue.

The notification must make clear that Pergamum did not modify the settings
file.

When the entire `(workpath)/pergamum.json` file has a parse failure or corrupt
content, project open must fail.

The error for corrupt `pergamum.json` must be actionable:

- mention the file path
- state that Pergamum did not modify the file
- indicate that manual repair is possible

Pergamum must not automatically overwrite corrupt `pergamum.json`.

When `pergamum.json` is parseable but the literal `"settings"` section contains
invalid entries, project open continues. Pergamum rejects invalid settings
entries, follows the resolution chain, and must not automatically overwrite the
file.

Project identity and project metadata in `pergamum.json` are not the same thing
as the literal `"settings"` section.

**S-24. Settings files are UTF-8 JSON files.**

`settings.json` and `pergamum.json` are UTF-8 JSON files.

Invalid encoding and undecodable bytes are corrupt input.

Corrupt handling must not silently rewrite or normalize files.

BOM handling is not decided in ADR-0006 unless an existing repository policy
exists. If BOM behavior is needed, it remains an explicit investigation item for
the implementation Issue.

### Settings / Domain / Security Boundary

**S-25. Domain data and security policies are not ordinary settings.**

The following are not settings:

- Glossary Kind
- Glossary Entry/Form
- Glossary form relation
- Glossary warning policy
- Glossary boundary policy
- debug log sink enablement
- Markdown preview `html:false` security policy
- preview performance containment constants
- Quick Access prefix customization for the initial #150 slice

Glossary-related domain data belongs to project domain storage, not
`pergamum.json.settings`.

Debug log file sink enablement remains CLI/dev-only, such as
`--pergamum-debug`, and must not become a normal settings toggle.

Markdown preview `html:false` must not be weakened by ordinary project settings.

### Implementation Boundary

**S-26. Follow-up settings implementation must follow ADR-0006.**

Issue #150 must be rewritten after this ADR as a narrowed implementation
Issue that follows ADR-0006.

The concrete task list for Issue #150 belongs in the Issue body, not in this
ADR.

This ADR records durable architectural boundaries for settings implementation.
It is not a temporary task plan for Issue #150.

---

## Consequences

Settings work has a stable responsibility boundary before more values are added
to the catalog.

Application settings, project settings, project domain data, app-local meta,
project-local meta, session state, recovery, and runtime coordination have
separate ownership and storage expectations.

Project settings are safely shareable only when they are validated as untrusted
input.

Some existing names and metadata-only catalog entries need alignment work in
later implementation Issues.

The renderer stays behind the preload/main boundary and does not gain direct
filesystem or SQLite access for settings.

Recovery and runtime coordination details move to ADR-0007.

---

## Alternatives Considered

### Store all user-visible state in settings

Rejected.

Workbench layout, open editors, active navigator item, window bounds, and
similar values are session state. Treating them as settings would mix deliberate
preferences with restorable working state.

### Store recovery data in settings

Rejected.

Recovery protects unsaved manuscript text. It must not be hidden in ordinary
settings or project settings.

### Let renderer read settings files directly

Rejected.

Pergamum maintains the Electron boundary:

```text
Renderer -> Preload -> Main Process
```

Settings I/O stays in the main process.

### Use `appearance.uiTheme` as the architecture name

Rejected for ADR-0006.

`workbench.colorTheme` better matches the selected workbench-wide theme concept
and avoids implying that arbitrary individual appearance properties are each
independent settings.

---

## Future Work

- Settings Catalog implementation alignment
- application settings read/fallback hardening
- project settings read/fallback hardening
- Settings UI
- settings write path
- settings diagnostics
- settings migration
- settings hot reload / file watching
- session persistence
- ADR-0007 recovery store and restore flow
- theme catalog and theme file format
- editor decoration implementation
- line ending and whitespace marker implementation
- Quick Access settings, if later approved
- project-level preview profiles
