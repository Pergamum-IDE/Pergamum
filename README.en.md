# Pergamum

[Japanese](./README.md) | [English](./README.en.md)

Pergamum is an **open-source integrated writing environment for novelists**.

It is free software released under the MIT License.

However, Pergamum is not intended to be just another Markdown editor.

When writing a novel, a large amount of information arises outside the manuscript itself.

Character names. Place names. Organization names. Proper nouns. Aliases. Notation variants. Timelines. Relationships between characters. When a certain event occurred. What a certain character knew at a particular point in the story.

The longer a work becomes, the harder it is to maintain all of this using the author’s memory alone.

Pergamum aims to **separate the place where the manuscript is written from the place where the author manages what they know about the fictional world, while treating both as part of a single writing environment**.

Pergamum is still in an early stage of development. Not everything described here has been implemented yet.

The name Pergamum comes from an ancient Greek city in what is now western Turkey. It was home to a great library rivaling the Library of Alexandria, and it is also associated with the origin of the word “parchment.”

---

## Why build this?

A novel itself is just text.

So the manuscript can simply be Markdown.

On the other hand, information such as:

> What other names does this character have?  
> Is this notation merely a variant, or is it an intentional alias?  
> In what year and month did this event occur?  
> Did this character know that fact at this point in the scene?

is difficult to manage as plain prose alone.

Instead of forcing that information into Markdown, Pergamum keeps it separately as structured data.

Pergamum currently separates these roles as follows:

```text
Markdown
  The source of truth for manuscript text

pergamum.db
  The source of truth for structured story information,
  such as characters, terms, places, organizations, and concepts

pergamum.json
  Project settings

Assets
  Binary data such as images
```

Pergamum does not force the manuscript to conform to database requirements, nor does it force structured information into Markdown.

Each kind of data belongs where it is easiest to handle.

---

## What Pergamum values

Pergamum’s ultimate goal is not to write novels on behalf of the author.

It is to build **a tool that helps authors remember what they have already decided**.

Pergamum does not rewrite the manuscript without explicit user action.

This is especially important for Japanese text processing. Pergamum does not casually normalize, standardize, complete, or infer text.

```text
Things Pergamum does not do:
  Modify manuscript text through Unicode normalization
  Automatically fix notation variants
  Automatically insert or remove middle dots
  Automatically normalize ellipses or dashes
  Automatically add Glossary aliases
  Automatically resolve ambiguous matches
```

Pergamum acts as an aid only when the author explicitly chooses to use it.

Pergamum’s UI protects the place where the manuscript is written.

```text
Places for writing the manuscript:
  Editor
  Preview

Places for surrounding tasks:
  Navigator
  Search
  Occurrences
  Diagnostics
  Output
  Debug Log
  Utility Window
```

Tasks such as searching, navigating, diagnosing, exporting, and checking logs should be moved to surrounding UI areas rather than covering the manuscript area itself.

---

## What is the Glossary?

In Pergamum, characters, places, organizations, terms, concepts, and similar story-world information are managed in the Glossary.

For example, suppose the following strings related to Oda Nobunaga appear in the manuscript:

```text
Oda Nobunaga
Kipposhi
Nobunaga
My lord
Chasen-mage
```

These may be interpreted differently depending on context:

```text
Oda Nobunaga:
  The name of the person himself

Kipposhi:
  Childhood name

Nobunaga:
  Short name

My lord:
  A form of address based on status or relationship

Chasen-mage:
  A hairstyle
```

`Kipposhi` and `My lord` may refer to the same person.  
On the other hand, `Chasen-mage` refers to a hairstyle, not a person, and is therefore not the same entity.

Pergamum does not automatically merge strings into the same entity merely because they appear in similar contexts.

Furthermore, even when multiple strings refer to the same person, they do not necessarily mean the same thing.

Pergamum treats this information not as a flat list of strings, but as several independent axes.

```text
Entry:
  A story-world entity such as a character, place, organization, term, or concept

Form:
  A surface form such as a canonical name, alias, or variant spelling

Warning policy:
  A policy such as whether to warn or ignore

Boundary policy:
  A policy that determines which range in the manuscript should be treated as a match
```

Pergamum also allows the same surface form to refer to multiple entities.

If the word “general” could refer to multiple characters, Pergamum will not choose one automatically.

**If something is ambiguous, Pergamum reports it as ambiguous.**

This is one of Pergamum’s core design principles.

---

## Current capabilities

Pergamum is still in an early stage of development, but the following foundations have been implemented:

```text
Open Markdown projects
Edit Markdown manuscripts
Display Markdown Preview
Create and edit Glossary entries
Manage Glossary forms
Decorate Glossary matches in Preview
Display Hover Cards for Glossary matches
Navigate from a Glossary entry to its occurrences in the manuscript
Save structured project data in SQLite
```

For Glossary data, the Renderer accesses the Project Database through the following path:

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
  A story-world entity

Form:
  A string that appears in the manuscript
```

A Form can have roles such as canonical, alias, or variant.

Glossary matching also supports boundary policies.

For example, suppose there is a surface form `maid`.

```text
maidservant
custom-made
```

A simple substring match would match both, which can cause false positives.

To address this, Pergamum allows the match boundaries to be adjusted per Glossary form.

```text
Match start boundary:
  Auto / Strict / None

Match end boundary:
  Auto / Strict / None
```

The internal values are:

```text
auto
strict
none
```

This allows authors to adjust matching behavior per form only when necessary.

---

## Current development focus

Pergamum is currently in the latter half of Phase 3: “avoid connecting too much.”

In the first half of Phase 3, Pergamum introduced the Glossary matching boundary resolver and the UI for editing matching boundary policies per form.

In the latter half of Phase 3, Pergamum is separating the place where the manuscript is written from the places where surrounding work happens.

The current main development themes are:

```text
Workbench layout:
  Make the Navigator / Editor / Preview panes easier to use

Sidebar collapse:
  Allow the left Navigator to be collapsed so the manuscript area can be wider

Utility Window:
  A lower pane for occurrences, search, diagnostics, output, logs, and similar tasks

Occurrences tab:
  A UI for continuously navigating the occurrences of a Glossary entry

Debug mode JSONL logging:
  A debug logging foundation for dogfooding and issue analysis
```

Glossary occurrence navigation has already been implemented as a technical foundation. However, at present, when navigating from the Glossary Editor to an occurrence, the screen switches to the Markdown Editor.

As a result, there is still room to improve the UX for continuously navigating occurrences.

In the future, Pergamum plans to allow this workflow to continue from an Occurrences tab in the Utility Window.

---

## Protecting user data

A novel is data that an author may spend tens or hundreds of hours creating.

For that reason, Pergamum does not treat structured information as something that can simply be recreated if it breaks.

Pergamum treats `pergamum.db` as the source of truth for structured data. In the future, it plans to generate a deterministic, human-readable snapshot that can be inspected in Git diffs.

The snapshot will not become a second source of truth.

If there are two sources of truth, the question of which one is correct inevitably arises.

Instead, Pergamum follows a one-way relationship:

```text
pergamum.db
  ↓
deterministic snapshot
  ↓
Git / backup / external tools
```

When restoring from a snapshot, the current DB should be moved aside, the entire snapshot should be validated, and the database should be rebuilt using a transaction.

This has not been implemented yet, but it has already been decided as an architectural principle.

---

## About AI

Pergamum uses generative AI to support design review and implementation during development.

However, the Pergamum application itself currently has no feature that sends an author’s manuscript to generative AI or asks AI to write novel text.

AI is used to support the development process. Replacing the author’s creative work is not the goal.

---

## Installation

Pergamum is currently under development, and there are no general-use release builds yet.

For now, it can be tried by setting up the development environment from source.

Development uses Node.js 24 LTS.

```bash
npm install
npm run dev
```

Common verification commands during development are:

```bash
npm run typecheck
npm test
npm run build
```

---

## Design

Pergamum records major design decisions as ADRs, or Architecture Decision Records.

If we only look at the code, reasons such as:

> Why UUIDv7?  
> Why are Glossary surface forms stored in a separate table?  
> Why is SQLite the source of truth?  
> Why is the snapshot not a source of truth?  
> Why are Command, Navigation, and Editor identity separated?

will be lost over time.

For that reason, Pergamum records not only what was adopted, but also what was considered and why other options were rejected.

Current major ADRs:

- [ADR-0001: Project Persistence Architecture](./docs/adr/0001-project-persistence-architecture.md)
- [ADR-0002: Structured Project Data and Glossary Model](./docs/adr/0002-structured-project-data-and-glossary-model.md)
- [ADR-0003: UI Interaction Architecture](./docs/adr/0003-ui-interaction-architecture.md)
- [ADR-0004: Manuscript Non-Destructive Policy](./docs/adr/0004-manuscript-non-destructive-policy.md)

Some design decisions are made before implementation.

This is because code that is cheap to fix later is less dangerous than data structures that become expensive to fix later.

---

## Roadmap

Pergamum’s development roadmap is organized here:

- [Pergamum Roadmap](./docs/roadmap.md)

The source of truth for implementation scope is GitHub Issues.  
The roadmap is treated as a map for keeping track of direction, priorities, and deferred items.

---

## License

Pergamum is released under the MIT License.
