# ADR-0003: UI Interaction Architecture

- Status: **Accepted**
- Date: 2026-08-12
- Revision: r4（最終版）
- Invariants: **I-1 〜 I-41 / 凍結済み**
- Deciders: PO / Architect / Reviewer
- Related: ADR-0001（データアーキテクチャ）, ADR-0002（Glossary データモデル）

---

## Context

ADR-0001 で「Markdown が原稿本文の正本、pergamum.db が構造化データの正本」という**データの憲法**を、ADR-0002 で **Glossary モデルの憲法**を定めた。Issue #38 / #40 の完了により、

```PlainText
SQLite → Store → IPC → Preload → Renderer
```

の縦方向のレイヤリングは実装として確立した。

一方、Renderer 内部の横方向の構造――ユーザーの操作がどこを通ってどこへ届くのか――は明文化されていない。Phase 2-3 では Glossary を Special Tab として Main Area に出し、Navigation History と Command Registry を導入する。これらは相互に型を共有するため、実装順に関わらず**語彙と不変条件を先に固定しないと、後続 Issue が前段の決定を作り直すことになる**。

本 ADR は Pergamum の**操作モデルの憲法**を定める。個別の API シグネチャは定めない（それは Issue #41〜#43 の裁量）。定めるのは、それらが満たさなければならない不変条件である。

規定する因果関係は次の一本である。

```PlainText
Editor Identity → Command → Navigation intent → Editor opening → Editor
```

同時に、混同されやすい以下の概念を明確に分離する。

```PlainText
Navigator selection  ≠  Active Editor
Command              ≠  Undo transaction
Editor を開く         ≠  History へ push する
EditorId             ≠  必ずしも durable な identity
EditorId             ≠  必ずしも Context 非依存な identity
```

---

## 用語定義

本 ADR 以降、以下の6語はここでの意味でのみ用いる。コード・Issue・レビュー・コミットメッセージにおいても同様とする。

### Editor Identity（EditorId）

作業対象となるオブジェクトを、その EditorId が属する Context 内で一意に指す識別子。**Pergamum 全体で唯一の定義を持つ型**であり、Command 引数・Open Documents のキー・Navigation Entry の三者はこの同一の型を共有する。

安定性は二段階を区別する。

- **session-stable**（全 EditorId が必須）— 同一セッション・同一 Context 内において、同じオブジェクトは常に同じ EditorId で指される。
- **durable**（一部のみ）— セッションを越えて同じオブジェクトを指し直せる。ファイルや Glossary entry は durable。未保存の untitled document は durable ではない。

scope は種別により異なる（I-10）。現在判明しているものは以下である。

```PlainText
file              application scope
untitled          session scope
projectDocument   project scope
glossaryEntry     project scope
```

`file` が application scope であるとは、Project Context を伴わずに canonical path のみから resolve できる、すなわち identity が filesystem に従属することを意味する。対して `projectDocument` と `glossaryEntry` は Project Context に従属する。

EditorId が一意であることと、EditorId 単体から resolve できることは別の性質である。`glossaryEntry` の UUIDv7 は衝突しないが、どの `pergamum.db` を参照すべきかは EditorId からは分からない。UUID の一意性は scope の問題を解決しない。

### Editor

EditorId で名指しできるオブジェクトの編集・閲覧面。Main Area に表示される。Markdown 原稿と Glossary entry は、種別が違うだけで同格の Editor である。

### Panel

アプリケーション自身の状態や補助情報を表示する領域。名指しの対象となるオブジェクトを持たない。Preview、および現時点の Project Settings がこれに当たる。

### Navigator

Sidebar に表示される一覧・探索面。オブジェクトの**存在**を提示し、Editor を開く起点となる。Navigator は Editor の代替となる編集面を持たない。

### Command

UI から独立した、名前付きの実行単位。安定した ID、表示名、任意の有効性判定、実行本体を持つ。

### Navigation

Editor 間の移動、およびその履歴。Editor の種別を知らない。

---

## Decision

不変条件には識別子（I-n）を与える。テスト名・Issue 本文・レビュー指摘はこの識別子を参照すること。

**番号は本 ADR が Accepted となった時点で凍結する。**以降の追加は末尾への追記とし、廃止された条項は欠番として残す。番号の再利用および全体の振り直しは行わない。

### 1. レイヤと責務

```PlainText
Activity Bar   … Workspace の切替専用
Sidebar        … Navigator
Main Area      … Editor
Panel          … 補助表示
```

- **I-1** Activity Bar は Workspace の切替のみを行う。任意の Command の起動口として使ってはならない。
- **I-2** Sidebar は Navigator であり、Editor の内容および編集中の状態を保持しない。Command を通じたオブジェクトの変更は I-3 の範囲で許される。
- **I-3** オブジェクトの内容を継続的に閲覧・編集する作業面は、Editor として Main Area に開く。Navigator および modal は、rename・toggle・削除確認など、作業面を必要としない限定的な操作を提供してよい。ただしそれらが Editor の代替となる編集面を持ってはならない。
- **I-4** I-3 により Navigator や modal が提供する限定的な操作も、I-15 の対象である。Editor 側の同等操作と同一の Command を実行しなければならない。

判定例:

```PlainText
Glossary Navigator
 ├─ rename                    OK（作業面不要）
 ├─ delete                    OK
 ├─ favorite toggle           OK
 └─ definition の全文編集      NG → Editor で開く
```

I-2 が禁じるのは状態の保持であり、I-3 が許すのは操作の起動である。Navigator が編集中バッファの正本になることは許されないが、Command 経由で Store を変更することは許される。

### 2. Editor Identity

- **I-5** Editor を一意に指す型の定義は Pergamum 内に**ちょうど一つ**存在する。Command / Open Documents / Navigation の間に変換層を置いてはならない。
- **I-6** すべての EditorId は session-stable である。
- **I-7** 一つの logical object を指す EditorId の表現は一つに正規化される。Pergamum の identity 規則上、同一の logical object を複数の kind または複数の値で表現してはならない。
- **I-8** EditorId は serializable である。永続化・履歴・ログにおいて同一の canonical representation へ落とせること。
- **I-9** serialization は損失なく往復できる。`deserialize(serialize(id))` は元の EditorId と等価でなければならない。serialization format は本 ADR で規定しない。
- **I-10** Project に属するオブジェクトを指す EditorId は active Project Context に scoped される。同じ EditorId の値は、その Project Context 内でのみオブジェクトを一意に指す。Project Context が変更された場合、旧 Context に属する Open Documents、Navigation、およびその他の project-scoped Editor state は、新しい Context で再利用してはならない。durable な project-scoped Editor を Session Restore する場合は、Project Context を先に復元し、その Context の下で EditorId を resolve する。
- **I-11** scoped な EditorId を、それが属する Context の外へ持ち出してはならない。Context を越えて保持・記録・伝達する場合は、Context を識別する情報を伴わなければならない。
- **I-12** 正規化を必要とする EditorId は、単一の構築境界を通して生成する。Renderer 内の任意の箇所で EditorId を直接組み立てる実装を許さない。
- **I-13** Editor Identity に基づく Session Restore の対象は durable な Editor に限る。durable でない Editor の内容を別の仕組みで復元する可能性を、本 ADR は禁止しない。

#### 一次表現

**構造化 discriminated union を一次表現とする。**文字列表現はその serialization として位置づける。

理由: Editor 種別は今後増加する。文字列を一次表現にすると `startsWith('glossary:')` や `split(':')` が各所に発生し、種別追加時に網羅性が保証されない。union であれば TypeScript が exhaustiveness を検査する。

既存 `OpenDocumentsState` の文字列 ID は、Issue #41 / #42 で serialization 境界へ移す。

#### I-10 の一般性

I-10 は `projectDocument` 固有の規則ではなく、Project に属するあらゆるオブジェクトに適用される。将来 DB-backed な Editor（timeline event、character、location、plot thread 等）が追加された場合も、追加の条項を必要とせず I-10 に乗る。

Project Context 変更時に Navigation History をどう扱うかは Issue #43 の判断である。History には project scope の項目と application scope の項目（`file`）が混在するため、字面に忠実な部分的除去は I-33（除外前後の順序と現在位置の整合）の作業を再度要求する。**History 全体を破棄する**のが実装上も意味論上も素直であり、本 ADR はそれを推奨するが禁止も強制もしない。

#### I-11 の境界

Context を越えて Editor を参照する必要が生じた場合に必要となるのは、Project Context と EditorId の対である。ただし**この対を新たな EditorId 型として定義してはならない。** `EditorId` / `ContextualEditorId` / `GlobalEditorRef` のように識別子型が増殖すると I-5 が実質的に失われる。

必要になった段階で、EditorId を内包する参照型（`{ context, editorId }` 相当）として定義する。具体的な型は本 ADR で規定しない。

#### I-7 の範囲

I-7 は Pergamum の identity 規則上の一意性を要求するものであり、**ファイルシステム上の物理的同一性の判定までは要求しない。** symlink、junction、UNC パス、case-insensitive な volume 上の表記差などによって同一実体を指す複数の EditorId が生じ得ることは、本 ADR では許容する。

Issue #41 で最低限決めるのは以下である。

- project.rootPath 配下は `projectDocument`、それ以外は `file` として、両者が重複しないこと
- `file` の path canonicalization の範囲（relative / absolute、`.` と `..`、separator、drive 表記、case のどこまでを正規化するか）
- symlink の実体同一性は解決しない、という明示

#### I-12 の実装上の注意

TypeScript の通常の union では、任意の箇所での literal 構築を型で防げない。

```PlainText
raw input + active Project Context → canonicalization → EditorId
```

という入口が一つであることが要求であり、手段は規定しない。factory 関数、branded type、lint rule のいずれをどこまで用いるかは Issue #41 で検討する。

**正規化は active Project Context の下で行われる。**同一の物理ファイルは、Project Context によって `projectDocument` になるか `file` になるかが変わるため、構築境界は path のみの純関数として実装できない。Project Context は暗黙のグローバル参照ではなく明示的な入力として渡すこと。

この帰結として、Issue #41 は「型を新設する Issue」ではなく「既存の ID 生成箇所を構築境界へ集約する Issue」になる見込みである。

### 3. Command

- **I-14** Command の実装は UI を参照しない。DOM、React、Sidebar の状態に依存してはならない。
- **I-15** Toolbar / Shortcut / Command Palette / Plugin / AI / Navigator は、同一の操作について**同一の Command** を実行する。UI ごとに実装を複製してはならない。
- **I-16** Command の実行は常に await 可能である。同期・非同期の差は Registry が吸収する。
- **I-17** Command の失敗は reject として呼び出し側へ伝播する。成否を結果オブジェクトへ包んではならない。失敗を処理する責任は UI 境界にあり、未処理の rejection を発生させてはならない。
- **I-18** Command Registry は undo を提供しない。undo は各 Editor / domain の責務である。
- **I-19** Command は表示名を定義時に持つ。ID から表示名を導出してはならない。
- **I-20** Command は有効性判定のためのフックを持ち得る。指定されない場合は有効とみなす。判定は副作用を持たない。

I-17 の根拠: Result 型を採用すると全 Command が成否の分岐を扱うことになり、TypeScript の例外機構と二重の誤り伝播経路が生じる。Plugin および AI からの呼び出しにおいても、失敗が観測可能であることが正しい。

### 4. Command ID は公開契約

Pergamum は MIT で公開され、将来 Plugin と AI が Command を参照する。したがって Command ID は事実上の public API である。

- **I-21** Command ID は `<domain>.<object>.<verb>` 形式とする。domain と object の境界が自明な場合に限り二階層を許す（例: `navigation.back`）。
- **I-22** 公開後の Command ID の rename は破壊的変更として扱う。旧 ID は非推奨期間を設けて alias として維持する。
- **I-23** Navigator の操作と Editor の操作は別の Command ID を持つ。両者を兼ねる ID を定義してはならない。

命名例:

```PlainText
workspace.files.focus        Workspace View の切替
workspace.glossary.focus     同上
glossary.entry.open          domain object を Editor で開く
glossary.entry.create
glossary.entry.delete
navigation.back
navigation.forward
editor.close
editor.save
```

### 5. Editor を開く経路

- **I-24** Editor 実体を開く低レベル経路は**ただ一つ**である。Navigator、Command Palette、Shortcut、Navigation History、Session Restore、Plugin、AI はすべてこの経路を通る。
- **I-25** Editor を開くことは、それ自体では Navigation History への記録を含意しない。履歴に積むか否かは呼び出し側の意図として明示される。

I-25 は、History back/forward および Session Restore が「開く」操作を再帰的に履歴へ積む事故を防ぐ。意図の表現方法（オプション引数か、上位関数の分離か）は Issue #42 / #43 で決める。

### 6. Navigation

- **I-26** Navigation History は Editor の種別を知らない。EditorId のみを保持する。
- **I-27** Navigation History は Renderer memory にのみ存在し、永続化しない。
- **I-28** Navigation 時に resolve 不能な履歴項目は無効化し、履歴から除外して、指定方向の次の有効な項目へ移動する。空の Editor を生成してはならない（lazy invalidation）。
- **I-29** 除外の対象は確定的な不存在のみとする。一時的な障害（外部ストレージの不可用、ロック競合等）を resolve 失敗として除外してはならない。
- **I-30** 除外は EditorId 単位で行い、履歴内の同一 EditorId をすべて対象とする。訪問した一件のみを除外してはならない。
- **I-31** 指定方向に有効な項目が存在しない場合、操作は no-op とする。現在の Editor を維持し、履歴位置を不整合にしてはならない。
- **I-32** Navigation 操作は直列化される。要求順を保った逐次実行とし、resolve 中に次の Navigation 操作を並行実行してはならない。
- **I-33** 除外の前後で、残存する履歴項目の相対順序および現在位置の整合性は保たれる。

I-29 の根拠: 復帰可能な障害で履歴を永久に失うことを防ぐ。この区別のため、resolve の結果は成否二値では表現できず、少なくとも「解決済み」「確定的に不在」「一時的に不可用」の区別が必要になる。具体的な結果型は Issue #43 に委ねる。

I-30 の根拠: 一件のみの除外では、同一オブジェクトが複数回現れる履歴で同じ失敗を繰り返す。

I-32 の根拠と補足: resolve は Store への問い合わせを伴うため非同期であり、直列化しなければ除外と位置更新が競合する。なお逐次実行される各要求は、**その要求が処理される時点の履歴状態**に対して評価される。要求時点の履歴位置を snapshot して後から適用してはならない。Back を連続で要求した場合、先行する要求が除外を引き起こせば後続の要求の移動先は変化する。

除外が生じたことをユーザーへ通知するか否かは UI の判断であり、本 ADR は規定しない。

### 7. Navigator と Editor の関係

- **I-34** Navigator の selection は、どの Editor が開いているかの正本ではない。両者を同一視してはならない。
- **I-35** Navigator は active Editor から自身の表示状態を派生させてよい（reveal / highlight）。
- **I-36** I-35 による Navigator の表示状態の更新は、Editor を開く・閉じる・切り替えるいずれの副作用も持ってはならない。

I-36 は I-35 を許した帰結として必須である。これがなければ reveal 実装時に Navigator と Editor の間でフィードバックループが生じる。

### 8. Editor の状態

Markdown はファイル保存、Glossary は DB write であり、保存の意味論が異なる。しかし Editor として同格に扱うため、状態表現の**軸**を共通化する。

- **I-37** 保存または外部同期の状態を持つ Editor は、それらを直交する軸として表現する。一つの状態列挙へ統合してはならない。
  - 保存軸: `clean` / `dirty` / `saving` / `saveFailed`
  - 同期軸: `fresh` / `stale` / `deleted`
- **I-38** 「衝突」は独立した状態ではなく、`dirty` かつ `stale` の導出である。
- **I-39** Issue #42 の時点では型のみを導入し、遷移の実装は行わない。

I-37 は全 Editor に両軸の保持を要求しない。read-only Editor（Search 結果、Git diff、Timeline 閲覧、生成された Preview 等）は、いずれの軸も持たなくてよい。軸の分離のみを規定するのは、`dirty` と `stale` が独立に成立し得る（編集中の entry が他経路で書き換えられる）ためである。

### 9. Editor と Panel の境界

- **I-40** 作業対象となるオブジェクトを EditorId で名指しできるものは Editor である。名指しの対象を持たない補助表示は Panel である。
- **I-41** Editor は Navigation の対象となる。これは判定基準ではなく I-40 の帰結である。

この基準により、Project Settings は現在 Panel だが、将来「設定という名指し可能なオブジェクト」として扱う場合は Editor へ移る。移す場合は本 ADR の改訂ではなく Issue の判断でよい。

---

## Consequences

### 得られるもの

- 後続 Issue が前段の型契約に乗るだけになり、Phase 2-3 内での作り直しが発生しない。
- Toolbar / Shortcut / Palette / Plugin / AI の追加が、いずれも Command を呼ぶだけの作業になる。
- Codex が実装する際、および Reviewer が穴を探す際に、参照すべき不変条件を識別子で指定できる。
- Navigation と Editor 種別が分離されるため、Timeline / Git Editor の追加が Navigation に影響しない。
- I-10 により、Project ディレクトリを別の場所へ移動しても `projectDocument` の identity は保たれる。rootPath を EditorId に焼き込む設計では失われる性質である。
- I-10 が scope の規則として一般化されているため、DB-backed Editor の追加は条項の追加を必要としない。

### 支払うもの

- Issue #41 のスコープが「Command Registry の箱」から「型契約の確定」へ拡大する。着手前の設計コストが増える。
- I-5 により、EditorId の変更は広範囲へ波及する。型を一つに集約した代償である。
- I-11 により、Context を越えて Editor を参照する機能（recent files、横断検索等）は EditorId 単体では実装できず、Context 識別子との対を扱う必要がある。
- I-24 により、Editor を開く処理の追加は常に単一経路の改修となる。局所的な近道が取れない。
- I-29 と I-32 により、Navigation の実装は素朴な配列とインデックスでは済まない。resolve の非同期性と失敗種別の判定を持ち込む必要がある。

### リスク

- I-37 の2軸は、将来 domain が増えたときに3軸目を要求する可能性がある。軸の追加は型の変更であり I-5 と同様に波及する。
- I-22 により、Command ID の設計ミスは公開後に安価に直せない。Issue #41 で ID を切る際は Reviewer が命名を個別に確認する。
- I-12 の構築境界は、迂回するコードが混入すると静かに破れる。強制手段を持たない場合、I-7 と I-6 は実装規律のみに依存する。
- I-7 が物理的同一性を要求しないため、symlink 等を経由して同一実体に対し複数の Editor が開き得る。双方が `dirty` になった場合、後に保存した側が他方の変更を上書きする。同期軸の `stale` による検出は可能だが、防止はできない。本 ADR はこれを許容する。
- I-10 は project-scoped state の再利用のみを禁じており、`untitled` および project 外の `file` の扱いには言及していない。`untitled` は durable でないため（I-13）、Project Context の切替時に未保存内容が失われる経路が残る。draft recovery を実装するか否かは別途判断する。

---

## Out of scope

本 ADR は以下を定めない。いずれも意図的な保留である。

- 具体的な関数シグネチャおよびモジュール構成
- EditorId の serialization format、および `file` の path canonicalization の具体的範囲（Issue #41）
- Navigation の resolve 結果型、および Project Context 変更時の Navigation History の扱い（Issue #43）
- Context を越えた Editor 参照型（`{ context, editorId }` 相当）の定義。必要になった時点で決定する。
- Command Palette の検索方式、MRU 順（Issue #44）
- Glossary 編集の undo 実装、トランザクション境界（Issue #45）
- **Command ID の namespace 予約**（built-in と Plugin 提供 Command の衝突回避）。Plugin Foundation 着手時に決定する。
- Design Token および Theme。操作意味論と視覚意味論は変更理由が異なるため混在させない。Theme 対応の着手時に **ADR-0004: Visual Design System / Theme Architecture** として分離する。

---

## References

- ADR-0001: Data Architecture
- ADR-0002: Glossary Data Model
- Issue #38: Activity Bar
- Issue #40: Glossary Sidebar
