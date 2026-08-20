# Pergamum

[日本語](./README.md) | [English](./README.en.md)

Pergamum is an **open-source integrated writing environment for novelists**.

It is free software released under the MIT License.

However, Pergamum is not intended to be just another Markdown editor.

When writing a novel, a large amount of information appears outside the manuscript itself.

Character names. Place names. Organization names. Proper nouns. Aliases. Spelling variations. Timelines. Relationships between characters. When an event happened. What a character knew at a specific point in the story.

The longer a work becomes, the harder it is to keep all of that information only in the author's memory.

Pergamum aims to treat **the place where the manuscript is written and the place where the author manages what they know about the fictional world** as parts of a single writing environment.

Pergamum is still in early development. Not everything described here has been implemented yet.

The name Pergamum comes from an ancient Greek city in what is now western Turkey. Pergamum was known for its great library, which rivaled the Library of Alexandria, and the word “parchment” is derived from its name.

---

## Why Pergamum exists

A novel itself is just text.

So the manuscript can be Markdown.

On the other hand,

> What aliases does this character have?  
> Is this spelling just a variation, or is it an intentional alias?  
> In what year and month did this event happen?  
> Did this character know this fact at this point in the story?

This kind of information is difficult to manage as plain prose alone.

Pergamum does not try to force all of that information into Markdown. Instead, it stores structured information separately.

Pergamum currently separates responsibilities as follows.

```text
Markdown
  The source of truth for manuscript text

pergamum.db
  The source of truth for structured project data,
  such as characters, terms, places, organizations, and concepts

pergamum.json
  Project settings

Assets
  Binary data such as images
```

The manuscript is not forced to fit the database.

Structured information is not forced into the Markdown text.

Each type of data is stored where it can be handled most naturally.

---

## What Pergamum values

Pergamum is not trying to write novels on behalf of the author.

It is a tool for **helping the author remember what they have already decided**.

Pergamum does not rewrite the manuscript automatically.

Especially for Japanese text processing, Pergamum avoids careless normalization, unification, completion, and inference.

```text
Pergamum does not:
  Modify manuscript text through Unicode normalization
  Automatically fix spelling variations
  Automatically insert or remove middle dots
  Automatically format ellipses or dashes
  Automatically add Glossary aliases
  Automatically resolve ambiguous matches
```

Pergamum acts as an assistant only when the author explicitly chooses to use such support.

Pergamum's UI protects the writing area.

```text
Writing area:
  Editor
  Preview

Supporting work around the manuscript:
  Navigator
  Search
  Occurrences
  Diagnostics
  Output
  Debug Log
  Utility Window
```

Searching, tracing, diagnosing, exporting, and checking logs should not take over the manuscript area. Those tasks belong in the surrounding UI.

---

## What is the Glossary?

In Pergamum, characters, places, organizations, terms, concepts, and similar project information are managed in the Glossary.

For example, suppose the following strings related to Oda Nobunaga appear in the manuscript.

```text
Oda Nobunaga
Kipposhi
Nobunaga
My lord
Chasenmage
```

They may mean different things depending on context.

```text
Oda Nobunaga:
  The character's main name

Kipposhi:
  Childhood name

Nobunaga:
  Short name

My lord:
  A title or form of address based on position

Chasenmage:
  A hairstyle
```

`Kipposhi` and `My lord` may refer to the same person.

On the other hand, `Chasenmage` refers to a hairstyle, not to the person themselves.

Pergamum does not automatically merge strings into the same entity just because they appear in similar contexts.

Even when multiple strings refer to the same person, their meanings are not necessarily identical.

Pergamum treats this kind of information as separate axes, not as a simple list of strings.

```text
Entry:
  An entity such as a character, place, organization, term, or concept

Form:
  A surface form such as a canonical name, alias, or variant spelling

Warning policy:
  Whether to warn, ignore, or apply another handling policy

Boundary policy:
  What range of text should be treated as a match in the manuscript
```

Pergamum also allows the same surface form to refer to multiple entities.

If the word “warrior” can refer to multiple characters, Pergamum does not choose one automatically.

**If something is ambiguous, report it as ambiguous.**

This is one of Pergamum's core design principles.

---

## What currently works

Pergamum is still in early development, but the foundation for connecting Markdown manuscripts and Glossary data is already working.

The following features are currently available.

| Category | What works |
| -- | -- |
| Project | Open a Markdown project |
| Editor | Edit Markdown manuscript text |
| Preview | Show Markdown Preview |
| Glossary | Create, edit, and delete Glossary entries |
| Glossary | Manage Glossary forms |
| Glossary | Decorate Glossary matches in Preview |
| Glossary | Show Hover Cards for Glossary matches |
| Glossary | Navigate from a Glossary entry to its occurrences in the manuscript |
| Glossary | Search entries in the Glossary navigator |
| Glossary | Check occurrences in the Glossary occurrences tab |
| Workbench | Use Navigator / Editor / Preview panes |
| Workbench | Collapse the Sidebar |
| Utility Window | Open the Utility Window |
| Debug | Output Debug mode JSONL logs |
| Debug | Check logs in the Debug Log tab |
| Persistence | Store structured project data in SQLite |

Glossary data is accessed from the Renderer to the Project Database through the following route.

```text
Renderer
  ↓
Preload API
  ↓
IPC
  ↓
Glossary Store
  ↓
Project Database
  ↓
SQLite
```

The current Glossary model separates Entry and Form.

```text
Entry:
  An entity in the fictional world

Form:
  A string that appears in the manuscript
```

A Form can have a role such as canonical, alias, or variant.

Glossary matching also supports boundary policy.

For example, if the surface form is `maid`, a naive match may incorrectly match both of the following.

```text
maidservant
custom-made
```

To avoid this kind of false positive, Pergamum allows matching boundaries to be adjusted for each Glossary form.

```text
Start-side boundary:
  auto / strict / none

End-side boundary:
  auto / strict / none
```

The internal values are as follows.

```text
auto
strict
none
```

This allows the author to adjust matching behavior per form only when necessary.

---

## Current limitations

Pergamum is still in early development.

It is being developed through daily dogfooding, but it is not yet a stable release for general use.

The current main limitations are as follows.

| Category | Current limitation |
| -- | -- |
| File format | Only `*.md` manuscript files can be opened |
| File format | `*.txt` and other text file formats are not yet supported |
| Encoding | Only UTF-8 is currently supported |
| Encoding | Shift_JIS / EUC-JP / UTF-16 and other non-UTF-8 encodings are not yet supported |
| Editor tabs | Multiple documents can be opened in tabs |
| Editor tabs | However, closing opened tabs from the UI is not yet implemented |
| Glossary database | The Glossary / project database schema is still under development |
| Glossary database | Future changes may include breaking changes |
| Compatibility | Long-term database compatibility is not guaranteed at this stage |

In particular, `pergamum.db` is currently the source of truth for structured data in Pergamum.

At the same time, the Glossary model and project data model are not yet stable.

Therefore, during this early development stage, an old `pergamum.db` may not remain usable as-is in future versions.

If you use Pergamum for important manuscripts or Glossary data, please manage the entire working directory with Git or regular backups.

Manuscript Markdown is stored as normal human-readable UTF-8 Markdown files.

For Glossary data and project metadata, until v0.90.0, Pergamum may prioritize improving the correctness of the data model over preserving database compatibility.

---

## Current development focus

Pergamum is currently in the latter half of Phase 4: “Make it easy to find and use operations.”

In Phase 3, Pergamum established the foundation for separating the writing area from surrounding work areas, including Glossary, Navigation, Utility Window, Debug logging, and the runtime baseline.

In Phase 4, Pergamum is organizing operation entry points so future features can be added without scattering behavior across unrelated UI implementations.

```text
Command:
  The meaning of an operation

Menu:
  A discoverable entry point

Shortcut:
  A fast entry point

Context menu:
  An entry point based on the current target

Command Palette / Command UI:
  An entry point for finding and executing operations
```

The current main development themes are as follows.

| Category | Development theme |
| -- | -- |
| Command infrastructure | Move application operations into the Command Registry |
| Command Palette | Improve the entry point for searching and executing operations |
| Application menu | Make common operations discoverable from the menu |
| Shortcut | Make basic operations available from the keyboard |
| Context menu | Provide operations based on the selected target |
| Debug logging | Improve observability for dogfooding and issue analysis |

The purpose of Phase 4 is not simply to add more menus or shortcuts.

The purpose is to organize Pergamum's operations as commands, so that the same operation can be invoked consistently from menus, shortcuts, context menus, and the Command Palette.

This allows future Glossary operations, editor support features, search, settings, export, and other functionality to be built on top of a consistent operation model instead of scattered UI-specific implementations.

---

## Protecting user data

A novel is data that an author may spend tens or hundreds of hours creating.

For that reason, Pergamum does not treat structured information as something that can simply be recreated if it breaks.

`pergamum.db` is the source of truth for structured data. In the future, Pergamum plans to generate deterministic snapshots that are human-readable and suitable for Git diffs.

A snapshot is not a second source of truth.

If there are two sources of truth, it inevitably becomes unclear which one is correct.

Instead, Pergamum uses a one-way relationship.

```text
pergamum.db
  ↓
deterministic snapshot
  ↓
Git / backup / external tools
```

When restoring from a snapshot, Pergamum intends to move the current database aside, validate the entire snapshot, and rebuild the database using a transaction.

This has not been implemented yet, but it has already been decided as an architectural principle.

---

## About AI

Pergamum uses generative AI during development for design review and implementation support.

However, Pergamum itself currently has no feature that sends the author's manuscript to a generative AI service or asks AI to write the novel text.

AI is used to support the development process.

Replacing the author's creative work is not the goal.

---

## Installation

Pergamum is currently under development and does not yet provide a general release package.

At this stage, you can try it by setting up the development environment from source.

Development uses Node.js 24 LTS.

```bash
npm install
npm run dev
```

The following commands are commonly used during development.

```bash
npm run typecheck
npm test
npm run build
```

---

## Design

Pergamum records major design decisions as ADRs, or Architecture Decision Records.

If only the code remains, the reasons behind decisions will fade over time.

> Why UUIDv7?  
> Why are Glossary surface forms stored in a separate table?  
> Why is SQLite the source of truth?  
> Why is a snapshot not the source of truth?  
> Why are Command, Navigation, and Editor identity separated?

To preserve these reasons, Pergamum records not only what was adopted, but also what was considered and why other options were not chosen.

Current major ADRs:

- [ADR-0001: Project Persistence Architecture](./docs/adr/0001-project-persistence-architecture.md)
- [ADR-0002: Structured Project Data and Glossary Model](./docs/adr/0002-structured-project-data-and-glossary-model.md)
- [ADR-0003: UI Interaction Architecture](./docs/adr/0003-ui-interaction-architecture.md)
- [ADR-0004: Manuscript Non-Destructive Policy](./docs/adr/0004-manuscript-non-destructive-policy.md)
- [ADR-0005: Command Domain Taxonomy](./docs/adr/0005-command-domain-taxonomy.md)

Sometimes design is decided before implementation.

This is because code can often be changed later at a relatively low cost, while data structures can become very expensive to change later.

---

## Roadmap

Pergamum's development roadmap is documented here.

- [Pergamum Roadmap](./docs/roadmap.md)

The source of truth for implementation scope is GitHub Issues.

The roadmap is treated as a map for keeping track of direction, priorities, and deferred topics.

Pergamum is currently in the latter half of Phase 4: “Make it easy to find and use operations.”

The broad development flow is as follows.

```text
Phase 4:
  Make it easy to find and use operations

Phase 5:
  Avoid touching the manuscript too much

Phase 6:
  Make it possible to return after closing

Phase 7:
  Make it possible to walk through the project

Phase 8:
  Make it ready for other people to use

v0.90.0:
  Make it usable every day
```

See `roadmap.md` for details of each phase.

---

## License

Pergamum is released under the MIT License.
