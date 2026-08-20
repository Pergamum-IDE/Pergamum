# ADR-0007: Recovery and Runtime Coordination

**Status:** Proposed

**Date:** 2026-08-20

---

## Context

ADR-0006 は durable state categories と settings architecture を定義する。設計レビューの結果、recovery と runtime coordination の詳細は ADR-0006 に置くには粒度が大きすぎることが分かった。

Recovery は、まだ manuscript file になっていない author-created text を守るための仕組みである。Runtime coordination は、same-project open 状況や正常終了が曖昧な project について best-effort の warning signal を提供する。

どちらも project open、startup、安全性に関わるため settings に隣接するが、settings ではない。

ADR-0007 は recovery と runtime coordination の詳細判断を所有する。

---

## Related ADRs

- ADR-0000 Accessibility and Inclusive Interaction Principles は、recovery restore と conflict UX が user-visible で、ユーザーを迷わせないことを求める。
- ADR-0001 Project Persistence Architecture は、project directory、`pergamum.json`、`pergamum.db` の persistence boundary を定義する。
- ADR-0003 UI Interaction Architecture は、renderer/main boundary と project/open document state separation を定義する。ADR-0007 は ADR-0003 の frozen interaction invariants を変更しない。
- ADR-0006 Durable State Categories and Settings Architecture は、state categories と settings architecture を定義する。

---

## Relationship to ADR-0006

**R-1. ADR-0007 は ADR-0006 の state categories に依存する。**

ADR-0007 は ADR-0006 が定義した categories を使い、settings architecture を再定義しない。

ADR-0007 は以下の詳細判断を所有する。

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

**R-2. Recovery は author-created text を守るために存在する。**

Recovery は、まだ manuscript file になっていない author-created text を守るために存在する。

Recovery は単なる UI state ではない。

Pergamum は、silent data loss より duplicate recovery candidates を選ぶ。Automatic overwrite より explicit user choice を選ぶ。

### Recovery Storage

**R-3. Recovery は既定で app-local である。**

Recovery は既定で app `userData` 配下に属する。

Recovery を project directory に既定で書き込んではならない。

Recovery を `pergamum.json` に書き込んではならない。

Recovery を project-local `pergamum.db` に既定で書き込んではならない。

Recovery を ordinary settings に保存してはならない。

Recovery を generic settings table に保存してはならない。

SQLite を使う場合、recovery は dedicated recovery table/store を使わなければならない。

Recovery は app-local であるため、ある device は別 device の recovery records を既定では観測しない。

### Recovery Identity

**R-4. Recovery record は独立した record identity を持つ。**

Recovery record は project name を key にしてはならない。

Project name、file name、relative path、absolute path は primary identity として十分に安定していない。Project は rename / copy / clone される。同じ project が NAS storage や複数 device 上で異なる mount path に現れる。

Recovery record は独自の `recoveryId` を持つ。

`recoveryId` は record identity である。

Project/document information は target fingerprint であり、primary key ではない。

同じ observed file target に対しても、複数 instance または複数 session が個別の保護を必要とする場合、複数の recovery records が存在する。

Project name、file name、relative path、absolute path は primary identity として十分に安定していない。Project は rename / copy / clone される。同一 device 上でも、drive letter、UNC path、folder move、symlink、junction、NAS mount によって observed path が変わりうる。

**R-5. Recovery update identity は明示的に扱う。**

同じ app instance かつ同じ editor session は、同じ recovery record を update する。

別 app instance は、別 app instance の recovery record を上書きしてはならない。

Recovery は app-local であるため、cross-device recovery records は既定では共有されない。ADR-0007 は、PC1 が PC2 の app-local recovery record を観測すると主張してはならない。

以下の fields は conceptual examples であり、必須 schema ではない。

```text
recoveryId
appInstanceId
editorSessionId
target fingerprint
base file state
```

`deviceId` は optional / future-facing である。将来設計で保持する場合でも、app-local recovery である限り、別 device の recovery records を既定で観測するための値ではない。

### Recovery ID Collision Handling

**R-6. Recovery IDs は collision-resistant opaque identifiers である。**

Recovery record IDs は collision-resistant opaque identifiers である。

ADR-0007 は UUIDv7 を必須とはしない。

Concrete ID algorithm は future implementation Issue で決定する。

Pergamum は ID uniqueness だけを data loss 防止策として頼ってはならない。

Storage は uniqueness を enforce しなければならない。

Collision は detect しなければならない。

Collision が起きた場合、新しく生成した ID で retry しなければならない。

Collision は既存 recovery record を replace してはならない。

New recovery record creation で `INSERT OR REPLACE`-style behavior を使うことは禁止する。

Same editor session update は explicit update でなければならない。Primary key collision による accidental replacement であってはならない。

### Untitled Document Recovery

**R-7. Recovery は untitled の author-created text も対象にする。**

Recovery は、まだ manuscript file を持たない author-created text にも適用する。

Untitled recovery records は target file path fingerprint を持たない。

Untitled recovery records も recovery record identity を持つ。

Untitled recovery の restore は、project file path を勝手に作ったり、project に黙って保存したりしてはならない。

Untitled recovery は explicit user-visible flow で restore しなければならない。

Exact UX は future Issue である。

### Restore Behavior

**R-8. Recovery restore は明示的かつ非破壊である。**

Recovery は manuscript-text-bearing data を保存する。

Recovery data を debug logs に出してはならない。

Recovery は、restart 時に manuscript files を黙って上書きしてはならない。

Restore は explicit user-visible flow でなければならない。

Recovery base 以降に source file が変更されている場合、Pergamum はどちらも黙って上書きしてはならない。

**R-9. 複数 recovery candidates は explicit user selection を要求する。**

同じ target document に複数 recovery candidates が存在する場合、Pergamum はそれらをユーザーに提示しなければならない。

Pergamum は自動選択してはならない。

Restore は explicit user selection を必要とする。

Exact comparison UI / restore UI は future Issue である。

### Recovery Retention and Deletion

**R-10. Recovery records には retention/deletion policy が必要である。**

Recovery records は無期限に蓄積してはならない。

Editor session に対応する recovery record は、target document が successfully saved され、対応する editor session が cleanly closes したときに削除しなければならない。

Recovery candidate は、restore が完了してユーザーが不要になったと確認したとき、またはユーザーが明示的に discard したときに削除しなければならない。

Abnormal-exit recovery records には retention policy が必要である。

Exact retention period/count は future Issue である。

Recovery deletion は manuscript files を変更してはならない。

Recovery deletion を silent manuscript overwrite として実装してはならない。

Recovery は manuscript-text-bearing data を含むため、retention policy は privacy と storage safety の一部である。

### Same Project / Same Path Multi-Instance Behavior

**R-11. v0.90.0 では multiple application instances を前提条件として扱う。**

v0.90.0 は hard exclusive locking または single-instance enforcement を要求しない。

2つの instances が同じ observed project path を開いた場合でも、recovery records は分離しなければならない。

**R-12. Project path matching は best-effort である。**

Project path matching は best-effort である。

同じ underlying storage を指す different drive letters、UNC paths、symlinks、junctions、NAS mount paths が、同じ project として検出されることは保証しない。

2つの roots が different canonical paths として観測される場合、Pergamum は既定で separate project instances として扱う。

### Concurrent Save Protection

**R-13. Manuscript save は external changes を黙って上書きしてはならない。**

v0.90.0 は hard exclusive project locking または single-instance enforcement を要求しない。

ただし Pergamum は、base file state 以降に current editor session の外で manuscript file が変更されたことを検出した場合、その file を黙って上書きしてはならない。

Exact external-change detection method は future Issue である。候補には mtime、size、content hash を含む。

External change を検出した場合、save は explicit user-visible conflict handling を必要とする。

Advisory marker は warning mitigation であり、correctness guarantee ではない。

Recovery separation は、それだけでは concurrent saves から manuscript file を保護しない。

### Runtime Coordination Markers

**R-14. Runtime coordination markers は advisory signals である。**

Runtime coordination marker は settings、session、recovery、project domain data のいずれでもない。

ADR-0007 では `advisory open marker` を internal architecture term として使う。ただし、この語を fixed user-facing copy として露出してはならない。

Runtime coordination markers は best-effort warning signals を提供する。Hard exclusive locks として扱ってはならない。

**R-15. Project-local marker は same-project warning の第一候補である。**

Cross-instance または cross-device warning に shared visibility が必要な場合、project-local marker が same-project open warning の第一候補である。

ADR-0007 は exact marker path / file layout を決定しない。

Future implementation は VCS noise、`.gitignore`、zip distribution risk、privacy、stale marker behavior、cloud-sync behavior を扱わなければならない。

**R-16. Marker payload と identifiers は privacy-limited である。**

Marker には以下を含めてはならない。

- manuscript text
- recovery content
- open document list
- raw OS username
- raw hostname
- machine name

Project-local files を通して exposed される marker identifier は opaque でなければならない。

Project-local marker identifiers は、すべての projects をまたいで globally stable であってはならない。

Project-scoped または instance-scoped opaque identifiers を優先する。

Project-local marker payload に app-wide stable `deviceId` を使ってはならない。ただし future privacy review が承認した場合は除く。

**R-17. Active-looking markers は警告し、stale markers は block しない。**

Active-looking marker は warning と user choice を発生させる。

User-facing copy は状況を説明しなければならない。"advisory open marker" とは言ってはならない。

Stale marker は project open を妨げてはならない。

Stale marker は、recovery candidates を確認するための signal である。

復元対象の未保存 manuscript content が存在するかどうかは、marker 自体ではなく recovery candidates が決める。

### Cloud-Synchronized Folders

**R-18. Cloud-synchronized folders は best-effort local paths として扱う。**

Cloud-synchronized folders は、ordinary local filesystem paths として best-effort に扱う。

Pergamum は以下に対する recovery semantics を定義または保証しない。

- delayed synchronization
- conflict-copy files
- remote merge conflicts
- collaborative editing

これらは ADR-0007 の対象外である。

Pergamum は manuscript files を黙って上書きしてはならない。

Pergamum は recovery candidate を黙って1つ選んではならない。

---

## Consequences

Recovery は settings、session、project settings、project domain data から分離される。

App-local recovery は、recovery contents を既定で project directory に書き込まず、local unsaved text を保護する。

Project-local runtime markers は advisory に留まり、locks にはならない。

Same-project detection は best-effort であり、correctness guarantee と誤解してはならない。

Cloud-sync-specific conflicts は対象外のままだが、Pergamum は non-destructive restore rules を維持する。

---

## Alternatives Considered

### recovery を project directory に保存する

既定動作としては却下する。

Recovery は manuscript-text-bearing data を含む。Project directory に既定で書き込むと、version-control noise、accidental distribution、manuscript source of truth との混同を招く。

### project name または file path を recovery identity にする

却下する。

Project names と paths は、rename、copy、clone、NAS mount、multi-device workflows の間で安定しない。

### runtime marker を recovery truth として扱う

却下する。

Runtime markers は advisory coordination signals である。未保存 manuscript content が存在するかどうかは recovery candidates が決める。

### hard project lock を強制する

ADR-0007 では却下する。

v0.90.0 は hard exclusive locking または single-instance enforcement を要求しない。

---

## Future Work

- recovery store schema
- recovery restore UX
- recovery candidate comparison UI
- recovery diagnostics
- advisory marker path/file layout
- marker stale detection policy
- `.gitignore` / VCS / zip distribution policy for project-local markers
