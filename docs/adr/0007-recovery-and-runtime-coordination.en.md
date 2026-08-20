# ADR-0007: Recovery and Runtime Coordination

**Status:** Proposed

**Date:** 2026-08-20

---

## Context

ADR-0006 defines durable state categories and settings architecture. During
design review, recovery and runtime coordination were found to be too detailed
for ADR-0006.

Recovery protects author-created text that has not yet become the manuscript
file. Runtime coordination provides best-effort warning signals about
same-project open situations and unclearly closed projects.

Both topics are adjacent to settings because they affect project open, startup,
and safety. They are not settings.

ADR-0007 owns detailed recovery and runtime coordination decisions.

---

## Related ADRs

- ADR-0000 Accessibility and Inclusive Interaction Principles requires recovery
  restore and conflict UX to be user-visible and non-confusing.
- ADR-0001 Project Persistence Architecture defines the project directory,
  `pergamum.json`, and `pergamum.db` persistence boundary.
- ADR-0003 UI Interaction Architecture defines the renderer/main boundary and
  project/open document state separation. ADR-0007 does not change ADR-0003
  frozen interaction invariants.
- ADR-0006 Durable State Categories and Settings Architecture defines state
  categories and settings architecture.

---

## Relationship to ADR-0006

**R-1. ADR-0007 depends on ADR-0006 state categories.**

ADR-0007 uses the categories defined by ADR-0006 and does not redefine settings
architecture.

ADR-0007 owns detailed decisions about:

- recovery storage
- recovery identity
- recovery write safety
- recovery restore behavior
- recovery ID collision handling
- same-project multi-instance behavior
- runtime coordination markers
- stale marker handling
- cloud-synchronized folder out-of-scope behavior

---

## Decision

### Recovery Purpose

**R-2. Recovery exists to protect author-created text.**

Recovery exists to protect author-created text that has not yet become the
manuscript file.

Recovery is not merely UI state.

Pergamum prefers duplicate recovery candidates over silent data loss, and
explicit user choice over automatic overwrite.

### Recovery Storage

**R-3. Recovery is app-local by default.**

Recovery belongs under app `userData` by default.

Recovery must not be written to the project directory by default.

Recovery must not be written to `pergamum.json`.

Recovery must not be written to project-local `pergamum.db` by default.

Recovery must not be stored in ordinary settings.

Recovery must not be stored in a generic settings table.

If SQLite is used, recovery must use a dedicated recovery table/store.

Because recovery is app-local, one device does not observe another device's
recovery records by default.

### Recovery Identity

**R-4. Recovery records have independent record identity.**

A recovery record must not be keyed by project name.

Project name, file name, relative path, and absolute path are not stable enough
as primary identity. Projects are renamed, copied, and cloned. The same project
appears at different mount paths on NAS storage and multiple devices.

A recovery record has its own `recoveryId`.

`recoveryId` is record identity.

Project/document information is a target fingerprint, not the primary key.

The same observed file target has multiple recovery records when multiple
instances or sessions require separate protection.

**R-5. Recovery update identity is explicit.**

The same app instance and same editor session update the same recovery record.

A different app instance must not overwrite another app instance's recovery
record.

Because recovery is app-local, cross-device recovery records are not shared by
default. ADR-0007 must not claim that PC1 observes PC2's app-local recovery
record.

The following fields are conceptual examples, not a required schema:

```text
recoveryId
appInstanceId
editorSessionId
target fingerprint
base file state
```

`deviceId` is optional and future-facing. If it is retained in a future design,
app-local recovery still means it is not used to observe another device's
recovery records by default.

### Recovery ID Collision Handling

**R-6. Recovery IDs are collision-resistant opaque identifiers.**

Recovery record IDs are collision-resistant opaque identifiers.

ADR-0007 does not require UUIDv7 specifically.

The concrete ID algorithm is a future implementation Issue.

Pergamum must not rely on ID uniqueness as the only protection against data loss.

Storage must enforce uniqueness.

Collision must be detected.

Collision must retry with a newly generated ID.

Collision must not replace an existing recovery record.

`INSERT OR REPLACE`-style behavior is forbidden for new recovery record
creation.

Same editor session update must be an explicit update, not accidental
replacement by primary key collision.

### Untitled Document Recovery

**R-7. Recovery includes untitled author-created text.**

Recovery applies to author-created text that has no manuscript file yet.

Untitled recovery records do not have a target file path fingerprint.

Untitled recovery records still have recovery record identity.

Restore for untitled recovery must not invent a project file path or silently
save into the project.

Untitled recovery must be restored through an explicit user-visible flow.

The exact UX is a future Issue.

### Restore Behavior

**R-8. Recovery restore is explicit and non-destructive.**

Recovery stores manuscript-text-bearing data.

Recovery data must not be emitted to debug logs.

Recovery must not silently overwrite manuscript files on restart.

Restore must be an explicit user-visible flow.

If the source file changed since the recovery base, Pergamum must not silently
overwrite either side.

**R-9. Multiple recovery candidates require explicit user selection.**

If multiple recovery candidates exist for the same target document, Pergamum
must present them to the user.

Pergamum must not choose automatically.

Restore requires explicit user selection.

The exact comparison UI / restore UI is a future Issue.

### Recovery Retention and Deletion

**R-10. Recovery records require retention and deletion policy.**

Recovery records must not accumulate indefinitely.

A recovery record for an editor session must be deleted when the target
document is successfully saved and the corresponding editor session closes
cleanly.

A recovery candidate must be deleted when restore completes and the user
confirms it is no longer needed, or when the user explicitly discards it.

Abnormal-exit recovery records need a retention policy.

The exact retention period/count is a future Issue.

Recovery deletion must not modify manuscript files.

Recovery deletion must not be implemented as silent manuscript overwrite.

Because recovery contains manuscript-text-bearing data, retention policy is part
of privacy and storage safety.

### Same Project / Same Path Multi-Instance Behavior

**R-11. Multiple application instances are an accepted condition for v0.90.0.**

v0.90.0 does not require hard exclusive locking or single-instance enforcement.

If two instances open the same observed project path, recovery records must
remain separate.

**R-12. Project path matching is best-effort.**

Project path matching is best-effort.

Different drive letters, UNC paths, symlinks, junctions, and NAS mount paths
that point to the same underlying storage are not guaranteed to be detected as
the same project.

If two roots are observed as different canonical paths, Pergamum treats them as
separate project instances by default.

### Concurrent Save Protection

**R-13. Manuscript save must not silently overwrite external changes.**

v0.90.0 does not require hard exclusive project locking or single-instance
enforcement.

However, Pergamum must not silently overwrite a manuscript file if it detects
that the file changed outside the current editor session since the base file
state.

The exact external-change detection method is a future Issue. Candidates include
mtime, size, and/or content hash.

If external change is detected, save must require explicit user-visible conflict
handling.

An advisory marker is a warning mitigation, not a correctness guarantee.

Recovery separation does not by itself protect the manuscript file from
concurrent saves.

### Runtime Coordination Markers

**R-14. Runtime coordination markers are advisory signals.**

A runtime coordination marker is not settings, session, recovery, or project
domain data.

ADR-0007 uses `advisory open marker` as an internal architecture term. It must
not be exposed as fixed user-facing copy.

Runtime coordination markers provide best-effort warning signals. They must not
be treated as hard exclusive locks.

**R-15. Project-local marker is the first candidate for same-project warnings.**

A project-local marker is the first candidate for same-project open warning when
cross-instance or cross-device warning needs shared visibility.

ADR-0007 does not decide the exact marker path or file layout.

Future implementation must address VCS noise, `.gitignore`, zip distribution
risk, privacy, stale marker behavior, and cloud-sync behavior.

**R-16. Marker payload and identifiers are privacy-limited.**

A marker must not contain:

- manuscript text
- recovery content
- open document list
- raw OS username
- raw hostname
- machine name

Any marker identifier exposed through project-local files must be opaque.

Project-local marker identifiers must not be globally stable across all
projects.

Project-scoped or instance-scoped opaque identifiers are preferred.

Project-local marker payload must not use an app-wide stable `deviceId` unless a
future privacy review approves it.

**R-17. Active-looking markers warn; stale markers do not block.**

An active-looking marker triggers a warning and user choice.

User-facing copy must describe the situation. It must not say "advisory open
marker".

A stale marker must not prevent project open.

A stale marker is a signal to check recovery candidates.

Recovery candidates, not the marker itself, determine whether unsaved manuscript
content exists.

### Cloud-Synchronized Folders

**R-18. Cloud-synchronized folders are best-effort local paths.**

Cloud-synchronized folders are treated as ordinary local filesystem paths on a
best-effort basis.

Pergamum does not define or guarantee recovery semantics for:

- delayed synchronization
- conflict-copy files
- remote merge conflicts
- collaborative editing

These cases are out of scope for ADR-0007.

Pergamum must not silently overwrite manuscript files.

Pergamum must not silently choose one recovery candidate.

---

## Consequences

Recovery remains separate from settings, session, project settings, and project
domain data.

App-local recovery protects local unsaved text without writing recovery contents
into the project directory by default.

Project-local runtime markers remain advisory and do not become locks.

Same-project detection is best-effort and must not be mistaken for a correctness
guarantee.

Cloud-sync-specific conflicts remain out of scope, while Pergamum still follows
non-destructive restore rules.

---

## Alternatives Considered

### Store recovery in the project directory

Rejected as the default.

Recovery contains manuscript-text-bearing data. Writing it into the project
directory by default risks version-control noise, accidental distribution, and
confusion with manuscript source of truth.

### Use project name or file path as recovery identity

Rejected.

Project names and paths are not stable across rename, copy, clone, NAS mount,
or multi-device workflows.

### Use runtime marker as recovery truth

Rejected.

Runtime markers are advisory coordination signals. Recovery candidates determine
whether unsaved manuscript content exists.

### Enforce a hard project lock

Rejected for ADR-0007.

v0.90.0 does not require hard exclusive locking or single-instance enforcement.

---

## Future Work

- recovery store schema
- recovery restore UX
- recovery candidate comparison UI
- recovery diagnostics
- advisory marker path/file layout
- marker stale detection policy
- `.gitignore` / VCS / zip distribution policy for project-local markers
