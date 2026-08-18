# ADR-0000: Accessibility and Inclusive Interaction Principles

**Status:** Accepted

**Date:** 2026-08-18

## Position of ADR-0000

Although this ADR is numbered `ADR-0000`, it was accepted after `ADR-0001`, `ADR-0002`, and `ADR-0003`.

This ADR does not retroactively invalidate decisions or invariants already recorded in existing ADRs.

If a principle in `ADR-0000` appears to conflict with an invariant recorded in an existing Accepted ADR, the existing invariant takes priority as the current implementation contract.

The conflict itself must not be ignored. It should be recorded and explicitly resolved through a new Issue or an ADR update.

`ADR-0000` defines product-wide principles for future design and review. It does not silently rewrite already accepted architectural contracts.

## Context

Pergamum is an open-source writing environment for people who write novels.

Pergamum adopts Markdown as the storage format for manuscript text, but it is not an application solely for writing Markdown. Its primary purpose is to help authors write works, manage long-form works, handle terminology and worldbuilding settings, and preserve the author's authoritative text in a form that will not cause trouble later.

For this reason, Pergamum must not assume a single set of physical conditions, input environments, display environments, or levels of IT proficiency.

Authors write in many different environments.

- Japanese IMEs, Korean and Chinese IMEs, and other language input methods
- JIS / US / ISO and other keyboard layouts
- Dead keys, AltGr, and OS-specific input methods
- Mouse, touchpad, trackball, and custom pointing devices
- OS on-screen keyboards
- Screen readers, braille displays, voice input, and other assistive technologies
- Differences in color vision, visual acuity, and motor function
- Low-spec PCs, Linux arm64, Raspberry Pi, and remote desktop environments
- Users who are not IT-savvy but have the will to write

These are not "exceptional users." Since Pergamum is a tool for writing text, these usage environments must be considered in the design from the outset.

Pergamum does not guarantee full operation, from its initial version, for every assistive technology, every input method, every OS, and every keyboard-layout combination.

However, Pergamum avoids designs that later become impossible to support, designs that needlessly shut out particular environments, and designs that sacrifice semantic structure for the sake of appearance.

## Decision

Pergamum treats accessibility and inclusive interaction not as requirements bolted onto individual features after the fact, but as product-wide design principles.

Pergamum follows the principles below.

Each principle has a stable reference identifier, from `P-1` through `P-8`. Issues, PR reviews, and future ADRs may use these identifiers to refer to the principles explicitly.

### P-1. Do not treat the will to write lightly

Pergamum does not treat an author's will to write lightly because of differences in typing speed, available devices, physical condition, visual condition, or IT proficiency.

Pergamum does not assume only users who can operate a keyboard quickly.

It aims to let users reach primary operations even if they rely solely on a mouse, a pointing device, an OS on-screen keyboard, a screen reader, or other assistive technologies.

### P-2. Do not confine primary operations to a single path

Important primary operations should be reachable through multiple paths wherever possible.

In this ADR, a "primary operation" means an operation that a user reasonably needs in order to create, edit, save, open, navigate, or manage a work or its core project data.

Primary operations also include operations that let the user recognize and recover from changes in the application's visible or behavioral state.

#### P-2a. Primary operations require multiple paths

Examples of primary operations include:

- Opening a work or document
- Saving manuscript text
- Creating or editing Glossary data
- Sending a selected manuscript string to the Glossary registration flow
- Reaching Settings
- Returning the display zoom level to 100% after it has changed

Keyboard shortcuts are fast paths, not preconditions for use.

The Context Menu is useful as a shortcut for contextual operations. However, because some users may not notice the right-click-equivalent gesture, or may find it difficult to use, it must not be the only path for a primary operation.

The Command Palette is treated as a formal discovery path. However, because it strongly depends on keyboard operation, it must not be the sole path for a primary operation.

"Reaching Settings" is a primary operation. Individual setting items inside Settings, especially reaching or enabling Advanced Settings, are not primary operations.

#### P-2b. Operations for acceleration and discovery may be Command Palette-only

Operations whose main purpose is acceleration, search efficiency, or expert navigation may be Command Palette-only when the same underlying outcome is reachable through another primary path.

Examples of operations that may be Command Palette-only include:

- Go to Line
- prefix-based quick access
- fast heading search
- fast Glossary search

For example, opening a document itself is a primary operation and requires multiple paths. In contrast, using a specific prefix to jump quickly to a document or heading is an operation for search efficiency, and may be Command Palette-only if the same underlying outcome is reachable through another primary path.

### P-3. Do not treat input methods and keyboard layouts lightly

Pergamum does not treat IMEs, uncommitted in-composition input, strings under conversion, keyboard layouts, dead keys, AltGr, or OS-specific input methods lightly.

When designing shortcuts, the following are taken into account:

- Differences between JIS / US / ISO layouts
- Modifier-key differences across Windows / macOS / Linux
- Accidental firing during IME composition
- Environments where AltGr may be interpreted as Ctrl+Alt
- International layout differences in dead keys and symbol keys
- Users' existing muscle memory

Default shortcuts that depend heavily on symbol keys are handled with caution.

For operations that are unstable due to layout differences, paths that are less layout-dependent — Menu, Context Menu, and Command Palette — are preferred.

### P-4. Do not confine text to images

Pergamum is a tool for writing text.

Accordingly, manuscript text, terminology, settings, warnings, status displays, and operation names are provided, wherever possible, as text with semantic structure.

Primary information and operations are not confined to rasterized text, canvas-only UI, or icon-only displays.

Icon-only buttons are given an accessible name.

Warnings and errors are provided as readable text, not through color or icons alone.

UI that loses its meaning to screen readers and other assistive technologies is avoided.

### P-5. Do not convey meaning through color alone

Pergamum may use color.

However, color is not the sole means of conveying meaning.

For status, warnings, errors, save state, selection state, Glossary kind, occurrence locations, diffs, and similar information, color is combined with text, shape, line style, icons, position, labels, tooltips, and other cues.

Color themes are treated not merely as a matter of visual preference, but as a mechanism for preserving readability and distinguishability.

### P-6. Do not overwhelm non-IT users

Pergamum is a writing environment for people who write novels, not a tool only for IT-savvy people.

The Settings UI does not make all settings editable by default.

It separates settings that ordinary users can safely change from advanced settings such as character encoding, line-ending style, save format, and diagnostic features.

Advanced settings may be visible in the Settings UI. However, they are initially shown in a disabled state, and the user must explicitly enable Advanced Settings before making them editable.

When Advanced Settings are enabled, a confirmation dialog explains that those settings can affect the work, glossary data, or the application's behavior.

What warrants a warning is the danger level of the setting item, not the user's competence.

### P-7. Do not alter the author's authoritative text without consent

Pergamum respects the author's manuscript text and glossary data.

#### P-7a. Preserve author-entered text

Strings the author enters inside Pergamum — manuscript text, Glossary forms, Glossary descriptions, and similar content — are not subjected to unnecessary character-type restrictions, IME control, automatic normalization, or automatic substitution.

Legitimate Unicode characters that an author may intentionally enter — surrogate pairs, characters outside the BMP, emoji, combining characters, variation selectors, and similar characters — are permitted.

#### P-7b. Validate external bytes before treating them as manuscript text

Byte sequences loaded from external files or other external sources are validated before being accepted as manuscript text.

Raw byte sequences of unknown encoding, invalid UTF, NUL characters, and control characters that carry little meaning as manuscript text are not silently saved as manuscript TEXT.

When validation fails, Pergamum applies explicit handling such as warning, rejection, confirmation, quarantine, or a similar visible process.

### P-8. Do not prematurely abandon minority environments

Pergamum does not assume only a standard high-spec PC.

It aims not to break down, wherever possible, even in minority or low-spec environments such as Linux arm64, Raspberry Pi, and remote desktop environments.

However, this does not mean guaranteeing full performance in every environment.

Verified environments, known limitations, and differences arising from the display path are made explicit in release notes and documentation.

## Consequences

This ADR requires the following in Pergamum's UI, command, settings, display, and input design.

### Maintaining multiple paths

When implementing an important primary operation, it must not be confined solely to a keyboard shortcut, solely to a Context Menu, or solely to a Command Palette.

Examples:

- "Add Selection to Glossary..." is made reachable from the Context Menu, the Command Palette, and, where appropriate, the Menu bar or a shortcut.
- Glossary operations and settings changes have discoverable UI paths.

Operations whose main purpose is acceleration, search efficiency, or expert navigation may be Command Palette-only according to `P-2b`.

### Consistency with the Command Registry

The Menu, Context Menu, Command Palette, shortcuts, and future AI/automation entry points connect, wherever possible, to the same command semantics.

Separate implementations or separate meanings for the same operation are not created per path.

### Caution in shortcut design

When adding a default shortcut, the following are checked:

- Conflicts with default handling in Electron / Chromium / CodeMirror
- OS differences
- JIS / US / ISO layout differences
- Behavior during IME composition
- Handling of AltGr / dead keys / symbol keys
- The damage caused by an accidental trigger

Shortcuts with large layout-dependent variance are not made default shortcuts. Instead, the Command Palette / Menu / Context Menu are made the formal paths.

Shortcut customization is deferred for future consideration and is not a required item as of v0.90.0.

### Accessible UI structure

The following are observed during implementation:

- Icon-only buttons are given an accessible name.
- Primary input fields are given a label.
- Modals / Dialogs trap focus appropriately and return focus to its prior position after closing.
- Tab order is not broken.
- Warnings, errors, and status displays are not expressed through color alone.
- Text information is not confined to images alone, canvas alone, or decoration alone.

### Color theme design

Colors are managed via semantic tokens / CSS variables in a way that does not impede future support for high-contrast themes or differences in color vision.

Glossary kind and occurrence displays, and similar UI elements, combine line style, icons, labels, and tooltips in addition to color.

### Visible but disabled Settings UI

The Settings UI separates ordinary settings from Advanced Settings.

Ordinary settings center on items that can be changed safely, such as appearance, readability, and light behavioral preferences.

Character encoding, line-ending style, save format, diagnostic features, internal data, experimental features, and similar items are treated as Advanced Settings.

Advanced Settings are not hidden. They are shown in a disabled state at the bottom of the Settings UI or in a dedicated "Advanced Settings" section.

To make them editable, the user must select "Enable Advanced Settings."

When Advanced Settings are enabled, a confirmation dialog is shown.

The enabled state is saved to the application-wide `settings.json`.

This state is treated as the user's environment and interaction preference, not as project data.

### Avoiding premature claims of full support

This ADR does not declare that Pergamum fully supports every disability, every input method, every assistive technology, and every OS environment.

Supported scope, unverified scope, and known limitations are made explicit in release notes and documentation.

Pergamum does not casually claim a conformance level. Instead, it publishes verified environments, known limitations, and unverified scope, and improves incrementally based on user feedback.

## Non-goals

This ADR does not require the following as part of the immediate implementation scope:

- A full declaration of WCAG 2.2 AA conformance
- Completed verification with every screen reader
- A guarantee of braille display support
- A guarantee of operation with every IME and keyboard layout
- Immediate implementation of shortcut customization
- Immediate implementation of a High Contrast theme
- Providing a toolbar button for every operation
- Guaranteeing identical performance across every low-spec or minority environment

However, designs that make these impossible to support in the future are avoided.

Even though this ADR does not declare full support, Pergamum is not promising nothing. It makes verified environments, known limitations, and unverified scope explicit, and publishes verification facts rather than making unsupported conformance claims.

## Examples

### Adding a selection to the Glossary

The operation of selecting a string in the manuscript text and sending it to the Glossary registration screen is not confined to a shortcut alone.

Desired paths:

- Context Menu: `Add Selection to Glossary...`
- Command Palette: `Add Selection to Glossary...`
- Menu bar: provided as needed
- Keyboard shortcut: considered after verifying layout differences and IME behavior

This operation does not immediately create a Glossary Entry.

The selected string is passed to the registration screen as the initial value for the canonical form, and saving is left to the user's explicit action.

### Zoom and display-scale changes

Display-scale changes can be both an accessibility aid and a source of accidental state changes.

Pergamum treats zoom and display-scale changes as visible and recoverable state.

When the display zoom level is other than 100%, the current zoom level should be visible in the UI, and the user should have a clear path to return it to 100%.

If a familiar zoom input path such as `Ctrl/Cmd + mouse wheel` is disabled to prevent accidental changes, the implementing Issue must state the reason and provide an alternative explicit path.

Examples of alternative paths include:

- Changing the display zoom level from the Menu bar
- Showing the current zoom level in the Status bar
- Providing a visible affordance for returning the zoom level to 100%

### Advanced Settings

Ordinary settings center on display and interaction items that non-IT users can safely change.

The default character encoding, line-ending style, save format, diagnostic features, and similar settings are treated as Advanced Settings.

Advanced Settings are not hidden. They are shown in a disabled state at the bottom of the Settings UI or in a dedicated "Advanced Settings" section.

To make them editable, the user must select "Enable Advanced Settings."

When enabling them, a confirmation dialog with the following message is shown.

```text
Are you sure you want to enable Advanced Settings?

From here on, the items include settings such as character encoding, line-ending style, save format, and diagnostic features. If changed without understanding their meaning, they can affect your important work, glossary data, or the app's behavior.

Normally there is no need to change these.
Please review the contents, and do not change items you do not understand.
```

The enabled state is saved to the application-wide `settings.json`.

This state is treated as the user's environment and interaction preference, not as project data.

### Empty State Tips

When no document is open, a short Tip may be shown.

However, Tips are provided as text, not as an image.

When showing a Markdown syntax example, the wording must not leave behind people who do not know Markdown.

Bad example for `P-4`:

```text
Show a Markdown cheat sheet only as an image.
```

Good example of wording that does not leave behind people who do not know Markdown:

```text
You can start writing right away, even if you don't know Markdown.
```

Good example of explaining syntax as text:

```text
Use # at the beginning of a line to create a heading.
```

### Color vision differences

Glossary kind, warnings, errors, save state, selection state, and similar information are not expressed through color alone.

Bad example:

```text
Red for error, yellow for warning, green for success.
```

Good example:

```text
Warning icon + "Warning" label + explanatory text + color.
```

## Open questions

- If shortcut customization is introduced, do the constraints on default shortcuts under `P-3` become less strict, or should defaults remain conservative even when customization is available?
- If Pergamum does not make a full conformance claim such as WCAG conformance, what verification facts should it publish instead: verified environments, tested assistive technologies, known limitations, unverified scope, or another form of compatibility statement?
- At what granularity should support for assistive technologies be documented: per release, per platform, per feature, or per UI surface?

## Related

- ADR-0001: Data ownership and source-of-truth model
- ADR-0002: Glossary model
- ADR-0003: UI interaction model
