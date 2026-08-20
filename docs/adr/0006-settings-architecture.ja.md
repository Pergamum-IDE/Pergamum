# ADR-0006: Durable State Categories and Settings Architecture

**Status:** Proposed

**Date:** 2026-08-20

---

## Context

Pergamum には、すでに settings 関連の部分実装が存在する。

- `src/shared/settings.ts`
- `src/main/settingsStore.ts`
- `src/main/projectConfigStore.ts`
- partial `SettingsPanel`
- project-level `settings.preview.renderer`

Issue #150 の整理によって、"settings" という言葉の下に複数の責務が混ざりやすいことが分かった。

- durable な user / project preference
- application settings と project settings の read / fallback behavior
- Settings Catalog metadata と validation
- 将来 settings 化する候補
- hardcoded value inventory
- UI と write path の候補
- session restore state
- recovery data
- runtime coordination state
- internal metadata
- project/domain data

ADR-0006 は、Issue #150 を focused な Settings Catalog Foundation 実装として書き直すために必要な durable state categories と settings architecture を定義する。

ADR-0006 は、recovery identity、recovery restore behavior、runtime coordination marker behavior の詳細を定義しない。それらの規則は ADR-0007 が所有する。

この ADR は runtime 実装が完了していることを主張しない。

---

## Related ADRs

- ADR-0000 Accessibility and Inclusive Interaction Principles は、settings が missing / corrupt / invalid の場合でも startup を安全に継続し、ユーザーを迷わせない user-visible diagnostics へつなげることを求める。
- ADR-0001 Project Persistence Architecture は、`pergamum.json` と `pergamum.db` の責務境界を定義する。
- ADR-0003 UI Interaction Architecture は、renderer / preload / main boundary と、project state / current document / open document state の分離を定義する。ADR-0006 は ADR-0003 の frozen interaction invariants を変更しない。
- ADR-0007 Recovery and Runtime Coordination は、recovery storage、identity、restore、marker、multi-instance、cloud-sync rules の詳細を定義する。

---

## Decision

### Durable State Categories

**S-1. `settings` は意図的な preference / policy である。**

`settings` は、ユーザーまたはプロジェクトが意図的に選んだ preference / policy を指す。

`settings` は、任意の作業復元 UI state、内部実装 metadata、recovery data、runtime coordination state、project domain data ではない。

**S-2. `app-local meta` と `project-local meta` を分ける。**

`app-local meta` は、app `userData` 配下に置くアプリ内部 metadata である。

`project-local meta` は、project DB 自身に属する metadata である。たとえば `(workpath)/pergamum.db` の schema version がこれにあたる。

`pergamum.db` schema version は project-local meta であり、`pergamum.db` 自身の中に置かなければならない。App `userData` だけを project DB schema version の保存先にしてはならない。

**S-3. `session` はユーザーローカルな作業復元状態である。**

`session` は、open editors、active editor、window bounds、pane ratio、selected navigator item、expanded nodes などのユーザーローカルな作業復元状態を指す。

`session` は `settings` ではない。

**S-4. `recovery` は settings でも session でもない。**

Recovery は未保存 manuscript text を守る。未保存 manuscript text は recovery payload になり得るため、recovery はユーザーコンテンツとして扱わなければならない。

Recovery を ordinary settings に保存してはならない。Recovery を project settings または project domain DB に既定で保存してはならない。

Recovery identity、storage、restore flow、coordination rules の詳細は ADR-0007 が定義する。

**S-5. `runtime coordination` は一時的な coordination category である。**

Runtime coordination state は、same-project open 状況または正常終了が曖昧な project について警告するための一時的な coordination state である。

Runtime coordination は `settings`、`session`、`recovery`、project domain data のいずれでもない。

Runtime coordination marker の詳細規則は ADR-0007 が定義する。

### Storage Responsibilities

**S-6. 保存先は責務境界である。**

Pergamum は以下の storage model を採用する。

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

`app userData-side store` は、その data が app `userData` 配下の所有物であることを意味する。ADR-0006 は、他の ADR または既存実装がすでに決定している場合を除き、app-local meta/session storage の backend を選ばない。Backend selection は future implementation Issue である。

User-local session と recovery を project DB または `pergamum.json` に既定で書き込んではならない。

Recovery を generic settings table に保存してはならない。実装する場合、recovery は dedicated recovery store/table を使わなければならない。

**S-7. Project settings は literal `"settings"` section に置く。**

Project settings は `(workpath)/pergamum.json` の literal `"settings"` section に置く。

`pergamum.json` に literal `"settings"` section が存在しない場合、Pergamum は empty project settings として扱う。

`pergamum.json` 内の他の project metadata sections は、別 ADR または Issue が明示的に定義しない限り Project settings ではない。

**S-8. Settings files は flat dotted keys を on-disk representation として使う。**

`settings.json` と `pergamum.json` の literal `"settings"` section は、flat dotted keys を canonical on-disk representation として使う。

Canonical example:

```json
{
  "settings": {
    "editor.lineEndingMarkers.enabled": true,
    "preview.renderer": "markdown"
  }
}
```

Nested object representation は canonical representation ではない。

1つの setting entry は、1つの flat dotted key とその value である。

Catalog lookup、validation、unknown-key handling、scope validation、alias handling、invalid-entry rejection は flat dotted keys に対して行う。

既存実装または既存 file に nested representation が見つかる場合、それは future implementation Issue の alignment/migration concern である。

ADR-0006 は flat representation と nested representation の両対応を定義しない。

### Settings Catalog

**S-9. Settings Catalog は default values の唯一の正本である。**

Settings Catalog は cataloged settings の default values の唯一の正本である。

Setting default values は Settings Catalog に定義しなければならない。

Consumers は cataloged settings に対して `?? 16` のような独自 fallback default を定義してはならない。

Consumers は cataloged setting values を resolved settings path 経由で読む。

**S-10. Catalog definitions は validation と ownership metadata を持つ。**

Catalog definitions は、各 setting に対して必要な validation information を表現しなければならない。

対象には必要に応じて以下を含める。

- type
- enum values
- numeric range
- max length
- allowed character policy
- scope
- default value
- deprecated aliases
- migration notes

**S-11. Setting keys は dot-separated pattern を使う。**

Setting keys は以下の pattern を使う。

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

`area` は top-level category である。`feature` は必要な場合だけ使う。`property` は最終的な設定対象である。

Initial allowed `area` set は以下である。

```text
workbench
editor
preview
quickAccess
files
debug
```

後続 Issue は、同じ概念に対して `editor.caret.width` と `editor.caretWidth` のような naming mix を作ってはならない。

後続 Issue は、同じ UI-level concept に対して `ui` と `workbench` の両方を導入してはならない。

既存 #150/catalog candidates のうち nonconforming areas を使うものは、implementation Issue で align しなければならない。

Examples:

- `ui.fontFamily`
- `ui.fontSize`
- `statusBar.visible`
- `locale`

ADR-0006 は `ui`、`statusBar`、top-level `locale` areas を黙って追加しない。Future implementation は、これらを `S-11` に適合する key へ rename するか、ADR/Issue を通して area set を明示的に拡張しなければならない。

### Effective Settings Resolution

**S-12. Effective settings は単一の canonical resolution order を使う。**

Effective settings は、以下の順で解決する。

```text
Project > Application > Default
```

Project が開かれていない場合は、以下の順で解決する。

```text
Application > Default
```

すべての setting が project-overridable である必要はない。各 catalog entry は、以下のいずれかの scope を宣言しなければならない。

- application-only
- project-only
- application with project override

`project-only` scope は architecture 上の可能性として定義する。ADR-0006 は、初期 #150 implementation が `project-only` setting を登録することを要求しない。

**S-13. Effective settings は定義済み lifecycle point で再解決する。**

main process は、以下のタイミングで effective settings snapshot を再計算する。

- application startup
- project open
- project close
- project switch
- future settings write path で successful write が完了した後

renderer は full resolved effective settings snapshot を受け取る。Initial architecture では diff payload を使わない。

renderer は update event を受け取ったら、次の renderer state update/render cycle で updated settings を適用する。

Project switch における settings resolution は atomic でなければならない。Project switch は1つの effective snapshot を生成し、close-snapshot の後に open-snapshot を続けて emit してはならない。これにより、editor font や preview layout などの project-overridable display settings で double re-layout/flicker を避ける。

### Main / Renderer Boundary

**S-14. main process が settings I/O と resolution を所有する。**

main process は以下を所有する。

- settings file I/O
- parsing
- validation
- fallback
- effective resolution

renderer は IPC 経由で resolved effective settings snapshot を受け取る。

renderer は settings file を直接読んではならない。

renderer が SQLite を直接 import することは禁止する。これは ADR-0003 の Electron boundary を settings architecture 上で再確認する規則である。

### Untrusted Input and Safe Application

**S-15. Application settings と project settings は untrusted input である。**

Application settings と project settings は、どちらも untrusted input として扱う。

Project settings は、shared project directories、version control、copied archives、external storage を通して他者由来の入力になり得る。

String setting は、値が string であるだけでは valid ではない。

main-process validation は必須である。renderer も defense in depth として unsafe DOM/CSS application を避けなければならない。

**S-16. CSS/DOM-facing values には safe application path が必要である。**

CSS-facing values を stylesheet string concatenation で適用してはならない。

CSS-facing values を raw `style` attribute string interpolation で適用してはならない。

DOM-facing values を `innerHTML` で適用してはならない。

CSS-facing setting values は、catalog validation 後に、`style.setProperty` で設定された validated CSS custom properties を通して適用しなければならない。

他の CSS application mechanisms は future design decision を必要とする。

Theme names は arbitrary stylesheet text ではなく enum/catalog references として扱う。

Font family settings は、適用前に max length や allowed character policy などの catalog validation を受けなければならない。

### Known Settings Decisions

**S-17. `preview.renderer` は当面 project-overridable として維持する。**

`preview.renderer` は project-overridable setting として維持する。

Allowed values は Settings Catalog enum の closed set とする。

v0.90.0 の allowed value は以下のみである。

```text
markdown
```

Renderer selection は preview security policy を変更してはならない。

Markdown preview `html:false` は security policy であり、renderer implementation が強制しなければならない。

Project settings は `html:false` を弱めてはならない。

Arbitrary renderer paths、plugin renderers、user-provided renderers は ADR-0006 の対象外である。

将来 `preview.renderer` に新しい値を追加する場合、その変更には security review が必要である。

**S-18. `workbench.colorTheme` を architecture name とする。**

ADR-0006 は selected color theme の architecture name として以下を採用する。

```text
workbench.colorTheme
```

旧 key `appearance.uiTheme` は deprecated read alias として受理する。

新旧両方が存在する場合は、`workbench.colorTheme` を優先する。

Effective snapshot は `workbench.colorTheme` だけを含む。renderer は old/new 両方の key を受け取ってはならない。

Future write path は `workbench.colorTheme` に書き戻さなければならない。

Future write path は、明示的な migration が実装されない限り、unknown/deprecated keys を黙って破棄してはならない。

Deprecated alias acceptance は将来 diagnostics/logging で観測可能にしなければならない。ただし ADR-0006 は diagnostics を実装しない。

既存コードが `ui.fontFamily` を使っている場合、それは alignment candidate である。この documentation-only task では migration を定義しない。

**S-19. `editor.decorations.enabled` は global AND gate である。**

以下の setting は editor decorations 全体の global AND gate である。

```text
editor.decorations.enabled
```

たとえば以下の場合:

```json
{
  "editor.decorations.enabled": false,
  "editor.decorations.lineEndingMarkers.enabled": true
}
```

effective runtime visibility は false である。

個別 decoration toggle は、global decoration gate が disabled のときに visibility を強制してはならない。

### Invalid, Unknown, Scope, Corrupt, and Encoding Handling

**S-20. Unknown keys は resolution で無視する。**

Unknown key は invalid known value ではない。

Unknown key は scope violation ではない。

Unknown keys は resolution で無視する。

Future write path は、version change による data loss を避けるため、実用上可能な範囲で unknown keys を保持しなければならない。

**S-21. Invalid known values は、その scope の値だけを reject する。**

Invalid known value は、その scope の値だけを reject する。Resolution は次の scope へ進む。

例:

```text
Project value invalid
  -> Application value
  -> Default
```

Pergamum は `Project > Application > Default` の順に最初の valid value を探す。どの file scope にも valid value が存在しない場合、catalog default を使う。

**S-22. Settings rejection は closed debug vocabulary を使う。**

Scope violation とは、その key が許可されていない scope に settings entry が置かれている状態を指す。たとえば project settings に application-only key が入っている場合は scope violation である。

Scope violations は reject しなければならない。違反した project entry は採用せず、resolution は application/default chain で継続する。

`settings.rejected` は、invalid known value、scope violation、corrupt settings-file rejection diagnostics の debug event name である。

`settings.rejected` は、implementation が emit する前に debug event allowlist catalog に登録しなければならない。

Event names は closed-set allowlist entries である。

`reason` は closed set である。Initial allowed `reason` values は以下ちょうど3つである。

- `invalidValue`
- `scopeViolation`
- `corruptFile`

新しい reason を追加する場合、debug event allowlist/catalog を更新しなければならない。

Invalid known values または scope violations に `settings.ignored` を使ってはならない。

各 settings resolution pass は `resolutionId` または同等の correlation identifier を持たなければならない。

1回の resolution pass では、同じ key/scope/reason に対する同一 rejection を繰り返し emit してはならない。

Debug payload には manuscript text や user content を含みうる raw setting values を含めてはならない。既存の safe debug logging policy に従わなければならない。

**S-23. Corrupt application settings と corrupt project config は別扱いにする。**

`settings.json` が missing の場合、Pergamum は defaults を使い、startup を失敗させてはならない。

Missing `settings.json` に対して warning は要求しない。

`settings.json` が parse failure または corrupt content を持つ場合、Pergamum は defaults を使い、startup を失敗させてはならない。

Pergamum は corrupt `settings.json` を自動上書きしてはならない。

Pergamum は application settings を load できなかったことをユーザーに通知しなければならない。Notification UX details は future Issue とする。

Notification は、Pergamum が settings file を変更していないことを明確にしなければならない。

`(workpath)/pergamum.json` 全体が parse failure または corrupt content を持つ場合、project open は失敗しなければならない。

Corrupt `pergamum.json` の error は actionable でなければならない。

- file path を示す
- Pergamum が file を変更していないことを示す
- manual repair が可能であることを示す

Pergamum は corrupt `pergamum.json` を自動上書きしてはならない。

`pergamum.json` が parseable で、literal `"settings"` section に invalid entries が含まれる場合、project open は継続する。Pergamum は invalid settings entries を reject し、resolution chain に従い、file を自動上書きしてはならない。

`pergamum.json` の project identity / project metadata と literal `"settings"` section を混同してはならない。

**S-24. Settings files は UTF-8 JSON files である。**

`settings.json` と `pergamum.json` は UTF-8 JSON files である。

Invalid encoding と undecodable bytes は corrupt input として扱う。

Corrupt handling は file を黙って rewrite または normalize してはならない。

BOM handling は、既存 repository policy がない限り ADR-0006 では決定しない。BOM behavior が必要な場合、implementation Issue の明示的な investigation item とする。

### Settings / Domain / Security Boundary

**S-25. Domain data と security policies は ordinary settings ではない。**

以下は settings ではない。

- Glossary Kind
- Glossary Entry/Form
- Glossary form relation
- Glossary warning policy
- Glossary boundary policy
- debug log sink enablement
- Markdown preview `html:false` security policy
- preview performance containment constants
- initial #150 slice における Quick Access prefix customization

Glossary-related domain data は project domain storage に属する。`pergamum.json.settings` に置いてはならない。

Debug log file sink enablement は、`--pergamum-debug` のような CLI/dev-only のままとし、通常の settings toggle にしてはならない。

Markdown preview `html:false` は ordinary project settings によって弱めてはならない。

### Implementation Boundary

**S-26. 後続 settings implementation は ADR-0006 に従う。**

Issue #150 は、この ADR の後で ADR-0006 に従う narrowed implementation Issue として書き直す。

Issue #150 の具体的な task list は Issue body に置く。ADR には置かない。

この ADR は settings implementation が従う durable architectural boundaries を記録する。Issue #150 の一時的な task plan ではない。

---

## Consequences

Settings work は、Catalog に値を追加する前に安定した責務境界を持つ。

Application settings、project settings、project domain data、app-local meta、project-local meta、session state、recovery、runtime coordination は、それぞれ別の owner と storage expectation を持つ。

Project settings は、untrusted input として validation される場合にのみ安全に共有される。

既存の setting name や metadata-only catalog entries には、後続 implementation Issue で alignment が必要になる。

renderer は preload/main boundary の内側に留まり、settings のために直接 filesystem access や SQLite access を得ない。

Recovery と runtime coordination の詳細は ADR-0007 に移る。

---

## Alternatives Considered

### user-visible state をすべて settings に入れる

却下する。

Workbench layout、open editors、active navigator item、window bounds などは session state である。これらを settings として扱うと、意図的な preference と作業復元状態が混ざる。

### recovery data を settings に入れる

却下する。

Recovery は未保存 manuscript text を守る。Recovery を ordinary settings または project settings に隠してはならない。

### renderer が settings file を直接読む

却下する。

Pergamum は Electron boundary を維持する。

```text
Renderer -> Preload -> Main Process
```

Settings I/O は main process に留める。

### architecture name として `appearance.uiTheme` を使う

ADR-0006 では却下する。

`workbench.colorTheme` は workbench-wide selected theme という概念により合っている。また、個別の appearance properties がそれぞれ独立した settings であるかのような誤解を避けやすい。

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
