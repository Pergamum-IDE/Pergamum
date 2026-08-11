# ADR-0002: Structured Project Data and Glossary Model

**Status:** Accepted

**Date:** 2026-08-12

---

## Context

ADR-0001 では、Pergamum の Project Persistence を Markdown、`pergamum.db`、`pergamum.json`、Assets に分離した。

Issue #32 では、Glossary UI 実装前に、構造化 Project Data の初期 schema と Glossary の長期 model を確定する。

まだ released database や user-owned database は存在しないため、prototype glossary schema の migration history は作らず、Project Database schema version 1 を最終初期設計として定義し直す。

---

## Decision

### 1. Canonical Data Sources

Pergamum Project の canonical source は責務ごとに分離する。

- Markdown files are canonical for manuscript content.
- `pergamum.db` is canonical for structured project data.
- `pergamum.json` is canonical for project configuration.
- Serialized snapshots are derived deterministic representations and are not authoritative while the database is available.

Markdown は原稿本文の正本であり、Glossary、Characters、Timeline などの構造化データの正本ではない。

---

### 2. Persistent IDs

Glossary entity と textual form の persistent ID は UUIDv7 とする。

- ID は lowercase canonical UUID string として扱う。
- SQLite では `TEXT` として保存する。
- Shared validation は UUIDv7 以外、および uppercase UUID を拒否する。
- Database schema は lowercase/format/version/variant について reasonable な CHECK constraint を持つ。

---

### 3. Glossary Entity/Form Separation

`GlossaryEntry` は論理的な entity を表す。

Initial entry kinds:

- `term`
- `person`
- `place`
- `organization`
- `item`
- `concept`

`GlossaryForm` は manuscript text に現れ得る textual surface form を表す。

Canonical form も特別な文字列 field ではなく、`GlossaryForm` の一種として保存する。

---

### 4. Form Semantics

以下は独立した概念として扱う。

- `kind`: entity の分類
- `relation`: form と canonical form の意味的関係
- `warningPolicy`: editor behavior のための警告方針

Canonical form:

- `isCanonical = true`
- `relation = null`
- `warningPolicy = null`

Non-canonical form:

- `isCanonical = false`
- `relation` is `variant` or `alias`
- `warningPolicy` is `default`, `ignore`, or `warn`

この不変条件は TypeScript validation と SQLite CHECK constraint の両方で表現する。

---

### 5. Canonical Form Invariant

Every glossary entry must have exactly one canonical form.

Database は partial unique index により「1 entry につき canonical form は最大1つ」を強制する。

「少なくとも1つ」は以下で保証する。

- normal write paths in `glossaryStore`
- future snapshot/restore validation

現時点では trigger は導入しない。

---

### 6. Surface Matching and Ambiguity

Initial surface matching is exact string matching.

以下は実装しない。

- Unicode normalization
- width folding
- case folding
- fuzzy matching

同じ `surface` は複数の entries に属してよい。`surface` の global uniqueness は禁止する。

Lookup result は `none`、`unique`、`ambiguous` の discriminated union とし、ambiguous match を silent に解決してはならない。

---

### 7. Snapshot and Restore Architecture

Snapshot は `pergamum.db` から生成される derived representation である。

Snapshot は以下を満たすべきである。

- deterministic
- Git-friendly
- human-readable
- restorable

Structured-data changes mark snapshot state dirty.

Snapshot generation is debounced.

Dirty snapshot state should be flushed on project/application close.

Project opening must detect when the DB is newer than its snapshot and regenerate it.

Restore must:

1. validate the snapshot
2. back up the current database
3. rebuild the database transactionally

Restore validation must enforce the same glossary invariants as normal writes.

Snapshot generation, dirty-state persistence, version comparison, and restore implementation are future work.

---

## Consequences

- Glossary data can represent multiple textual forms per logical entity.
- Ambiguous manuscript surface matches are representable without automatic selection.
- UUIDv7 provides persistent sortable identifiers without exposing SQLite row IDs as domain IDs.
- Prototype integer-ID glossary databases are intentionally rejected and must be recreated during development.
- Future snapshots can be deterministic derived data without becoming a second source of truth.

---

## Alternatives Considered

### Keep `term` on `GlossaryEntry`

Rejected.

It conflates logical entity identity with one textual surface and cannot represent aliases, variants, or ambiguous surfaces correctly.

### Globally unique `surface`

Rejected.

Multiple entities can legitimately share the same surface in fiction projects. The lookup result must preserve ambiguity.

### Schema v2 migration for prototype schema

Rejected.

No released/user-owned Project Database exists yet. Keeping migration history for prototype designs would add noise to the initial architecture.

### Store snapshots as authoritative data

Rejected.

Snapshots are derived deterministic representations. `pergamum.db` remains canonical while available.

---

## Future Work

- Snapshot generation and restore implementation
- Snapshot dirty-state tracking and close-time flush
- Form CRUD and canonical switching
- User-defined glossary tags for project-specific organization. Tags are author-defined metadata and remain separate from fixed `kind` values, which are semantic classifications understood by Pergamum.
- Glossary editor UI
- Manuscript analysis and disambiguation features
- Additional structured data domains such as Characters, Places, Organizations, Timeline, and Assets metadata
