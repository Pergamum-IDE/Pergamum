# Pergamum

[日本語](./README.md) | [English](./README.en.md)

> This document is an English translation of the Japanese README.
>

Pergamum is an open-source integrated writing environment designed to help authors **remember their fictional worlds**.

It is free and released under the MIT License.

But Pergamum is not intended to be just another Markdown editor.

When writing a novel, a large amount of information accumulates outside the manuscript itself:

Character names. Place names. Organizations. Proper nouns. Alternate names. Spelling variations. Timelines. Relationships between characters. When an event occurred. What a character knew at a particular point in the story.

The longer a work becomes, the harder it is for an author to keep all of that information consistent from memory alone.

Pergamum aims to **separate the place where you write the manuscript from the place where you manage what you know about the fictional world, while treating both as parts of a single writing environment**.

Pergamum is still in the early stages of development, so not every feature described here has been implemented yet.

The name Pergamum comes from the ancient Greek city in what is now western Turkey. It was home to a great library that rivaled the Library of Alexandria, and its name also became the origin of the word *parchment*.

---

## Why Pergamum exists

A novel itself is just text.

So Markdown is perfectly fine for the manuscript.

But information such as:

> What other names does this character have?  
> Is this spelling simply inconsistent, or is it an intentional alternate name?  
> In what year and month did this event happen?  
> At this point in the story, did this character already know that fact?

is much harder to represent as plain prose alone.

Rather than forcing that information into Markdown, Pergamum keeps it separately as structured data.

The current responsibility boundaries are:

```text
Markdown
    Canonical source for manuscript content

pergamum.db
    Canonical source for structured project data
    such as characters, terminology, and timelines

pergamum.json
    Project configuration

Assets
    Binary data such as images
```

The manuscript should not be shaped around the needs of a database, and structured information should not be forced into Markdown.

Each kind of data belongs where it is easiest to manage.

---

## What Pergamum aims to be

Pergamum is not ultimately intended to write novels on behalf of authors.

It is intended to be a tool that helps authors **remember what they have already decided**.

For example, imagine that the following terms related to Oda Nobunaga appear in a manuscript:

```text
織田信長
茶筅髷
吉法師
信長
お館さま
```

Among these:

- `織田信長` refers to the person himself
- `吉法師` is his childhood name
- `信長` is a shortened form of his name
- `お館さま` is a title or form of address based on his position

Depending on context, several of these may refer to the same person.

On the other hand, `茶筅髷` refers to a hairstyle, not a person, and therefore represents a different entity.

Pergamum does not automatically merge strings into the same entity merely because they appear in similar contexts.

Even when multiple strings refer to the same person, they do not necessarily have the same meaning.

Pergamum treats these as independent dimensions rather than as a flat list of strings:

```text
Entity
    Person / Place / Organization / Concept / ...

Surface form
    Canonical form / Variant / Alias / ...

Warning policy
    Warn / Ignore / ...
```

The same surface form may also legitimately refer to multiple entities.

If a term such as "warrior" could refer to several different characters, Pergamum will not silently choose one of them.

**If something is ambiguous, Pergamum reports the ambiguity as ambiguity.**

This is an important design principle of the project.

In the future, Pergamum also aims to support platform-specific rendering for Japanese publishing sites such as Kakuyomu, Shōsetsuka ni Narō, and Alphapolis, allowing a single manuscript to be rendered using the ruby, emphasis, and other markup conventions required by each platform.

---

## Current development status

Pergamum is still in the early stages of development.

At present, the project includes the foundation for opening and editing Markdown projects in Electron, along with a structured project-data layer backed by SQLite.

For the Glossary, the following path has already been implemented:

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

The Glossary data model already includes:

- persistent UUIDv7 identifiers
- separation between logical entities and textual surface forms
- a model that explicitly preserves ambiguous matches

However, there is not yet a GUI for editing Glossary data.

User interfaces can be redesigned many times. Data structures often remain for years.

For that reason, the current development phase prioritizes architecture over UI.

---

## Protecting authors' data

A novel represents tens, hundreds, or sometimes thousands of hours of an author's work.

Pergamum therefore does not treat structured project information as something that can simply be recreated if it is lost.

`pergamum.db` is the canonical source for structured data, while future versions are planned to generate deterministic snapshots that are readable by humans and suitable for Git diffs.

Snapshots will not become a second source of truth.

Maintaining two authoritative copies inevitably creates the question of which one wins when they disagree.

Instead, the relationship will remain one-way:

```text
pergamum.db
    ↓
deterministic snapshot
    ↓
Git / backup / external tools
```

When restoring from a snapshot, the current database will first be backed up, the snapshot will be validated in full, and the database will then be rebuilt transactionally.

This has not yet been implemented, but the principle has already been established as part of the architecture.

---

## Development process

Pergamum uses generative AI during development for tasks such as design review and implementation assistance.

However, the Pergamum application itself currently has no feature that sends an author's manuscript to a generative AI service or asks AI to write novel prose.

AI is used to support the development process, not to replace the author's creative work.

---

## Installation

Pergamum is still under active development, and there are currently no general-purpose release builds.

For now, it can be run from source using the development environment.

```bash
npm install
npm run dev
```

---

## Architecture and design decisions

Pergamum records major architectural decisions as ADRs (Architecture Decision Records).

Looking only at the code, the reasons behind decisions such as:

> Why UUIDv7?  
> Why are Glossary surface forms stored separately?  
> Why is SQLite the canonical structured-data store?  
> Why are snapshots not authoritative?

would gradually disappear over time.

For that reason, Pergamum tries to record not only **what was chosen**, but also **what alternatives were considered and why they were rejected**.

Current major ADRs:

- [ADR-0001: Project Persistence Architecture](./docs/adr/0001-project-persistence-architecture.md)
- [ADR-0002: Structured Project Data and Glossary Model](./docs/adr/0002-structured-project-data-and-glossary-model.md)

Sometimes the design is decided before the implementation.

Code can often be changed cheaply later. Data structures tend to become expensive to change very quickly.

---
