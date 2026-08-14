# Pergamum ロードマップ

## この文書の目的

この文書は、Pergamum の開発ロードマップを整理するための文書である。

実装スコープの正本は GitHub Issue とする。
この文書は、開発の方向性・優先順位・保留事項・今後の候補を見失わないための地図として扱う。

```text
Issue:
  実装スコープの正本

PR:
  実装結果と検証結果の記録

ADR:
  取り返しにくい設計判断の記録

roadmap.md:
  方向性・優先順位・保留事項の整理
```

この文書に書かれている項目は、必ずしも実装を約束するものではない。
実際に着手する前には、個別の GitHub Issue としてスコープ・非スコープ・受け入れ条件・テスト観点を定義する。

---

## Pergamum の基本方針

Pergamum は、小説を書く人のための open-source IDE である。

中心に置くものは、作者が書いた本文である。
Pergamum は本文を勝手に書き換えない。

```text
本文:
  作者の正本

Glossary:
  作品内の語彙・人物・地名・組織・概念などを管理する構造化データ

Preview / UI:
  本文を読む・確認するための補助表示

Linter / Suggestion:
  本文を変更せず、気づきを提示する補助機能
```

特に日本語テキスト処理では、正規化・表記統一・補完・推測を安易に行わない。

```text
やらないこと:
  Unicode 正規化による本文変更
  表記揺れの自動修正
  中黒の自動挿入・削除
  三点リーダーやダッシュの自動整形
  Glossary alias の自動追加
  曖昧一致の自動解決
```

作者が明示的に選んだ場合だけ、補助機能として作用する。

Pergamum の UI は、本文を書く場を守る。
本文の文脈を隠しすぎない。
本文そのものを覆いすぎない。

```text
本文を書く場:
  Editor
  Preview

本文の周辺作業:
  Navigator
  Search
  Occurrences
  Diagnostics
  Output
  Debug Log
  Utility Window / 支援ウィンドウ
```

探す・辿る・診断する・出力する・ログを確認する作業は、本文領域ではなく、周辺 UI に逃がす。

---

## 現在地

現在は Phase 3 に入っている。

Phase 2 では、Glossary と Markdown Preview の接続が成立した。
Preview 上の本文に Glossary match を装飾し、Hover Card で情報を表示できるようになった。

Phase 3 では、その接続が「つながりすぎる」問題を制御する。

```text
Phase 3 の合言葉:
  つながりすぎないようにする
```

Phase 3 前半では、Glossary surface matching の boundary resolver と、form ごとの matching boundary UI を整備した。

Phase 3 後半では、本文を書く場と、周辺作業の場を分離していく。

```text
本文を書く場:
  Editor / Preview

本文の周辺作業:
  Navigator
  Utility Window / 支援ウィンドウ
  Search
  Occurrences
  Diagnostics
  Output
  Debug Log
```

直近では Issue #81「Glossary occurrence navigation foundation」を完了した。
Glossary Editor から、保存済み entry の surface が Markdown 文書内に出現する箇所へ移動できるようになった。

ただし、Glossary Editor 上の `◀ / ▶` ボタンを押すと Markdown Editor tab へ移動するため、連続操作中に Glossary Editor 側のボタンが画面から消える。

これは Foundation issue としては許容する。
次の UX 改善候補として、支援ウィンドウに Occurrences tab を置く。

---

## Phase 3: つながりすぎないようにする

### 目的

Glossary matching は便利だが、単純な substring matching では誤検出が起きる。

例:

```text
surface:
  メイド

本文:
  オーダーメイド
```

この場合、単純な substring matching では `オーダーメイド` の中の `メイド` が match してしまう。

Phase 3 では、以下を実現する。

```text
誤検出を抑える:
  つながるべきでない語をつなげない

明示的に調整できる:
  作者が必要な場合だけ、form 単位で matching 境界を調整できる

本文を変更しない:
  本文の自動修正や自動正規化は行わない

候補として提示する:
  表記揺れや alias 候補は、将来 Linter / Suggestion として扱う
```

---

## 完了済み: Phase 3 の基礎

### Boundary resolver foundation

Glossary surface matching に boundary resolver を導入した。

matching pipeline は以下の順序とする。

```text
raw candidate collection
→ boundary filter
→ range grouping
→ leftmost-longest / maximal munch
```

重要な点は、boundary filter を leftmost-longest / maximal munch の前に置くこと。

これにより、`オーダーメイド` の中の `メイド` のような候補を、range grouping に入る前に除外できる。

### start / end 語彙への整理

Glossary boundary policy の内部語彙を `left/right` から `start/end` に整理した。

これは表示上の左右ではなく、論理文字列上の一致範囲の開始側・終了側を表す。

```text
matchBoundaryStart:
  論理文字列上の一致範囲の開始側境界

matchBoundaryEnd:
  論理文字列上の一致範囲の終了側境界
```

この整理により、縦書き・RTL・BiDi などの表示方向に依存しない語彙になった。

### Advanced matching settings UI

Glossary Form 編集 UI から、form ごとの boundary policy を編集できるようにした。

対象は以下。

```text
canonical form
alias
variant
```

UI では以下の項目を持つ。

```text
機械検索用詳細設定

一致開始側の境界
一致終了側の境界
```

選択肢は以下。

```text
自動
厳密
なし
```

内部値は以下のまま維持する。

```text
auto
strict
none
```

開閉状態は保存しない。
保存するのは Glossary form の boundary policy だけである。

dogfood では以下を確認した。

```text
canonical: メイド

本文:
  メイドさんはオーダーメイドの品を受け取った。

自動 / 自動:
  メイドさん の メイド は match
  オーダーメイド の メイド は match しない

なし / 自動:
  メイドさん の メイド は match
  オーダーメイド の メイド も match
```

### Glossary occurrence navigation foundation

保存済み Glossary entry の surface が、直近の Markdown 文書内でどこに出現するかへ移動できるようにした。

Glossary Editor header に以下のボタンを追加した。

```text
◀ 前の使用箇所
▶ 次の使用箇所
```

追加 command ID:

```text
glossary.entry.previousOccurrence
glossary.entry.nextOccurrence
```

Occurrence navigation は、Preview DOM や rendered HTML offset ではなく、raw Markdown text に対して行う。

```text
buildGlossarySurfaceIndex([entry])
  ↓
matchGlossarySurfacesInText(text, index)
```

例:

```markdown
**メイド**が控えている
```

この場合、選択されるのは `メイド` のみであり、Markdown 記法の `**` は含まれない。

```markdown
*オーダ*ーメイドの品
```

このような Markdown 記法をまたぐ表記結合はしない。
Editor raw Markdown text を正とする。

Occurrence navigation は保存済み snapshot を使う。
未保存 draft の canonical surface / forms は使わない。

Glossary Editor 表示中は対象 MarkdownEditor が unmount されているため、App 側で以下の経路を取る。

```text
Glossary Editor button
  ↓
Command Registry
  ↓
App.tsx occurrence navigation
  ↓
last active Markdown document を決定
  ↓
editorNavigation.openEditor(id, { history: "skip" })
  ↓
pendingMarkdownSelection を set
  ↓
MarkdownEditor mount/effect で selection 適用
```

Navigation History には積まない。

Project switch 時には、occurrence navigation に関する一時状態を掃除する。

```text
glossaryOccurrenceCursor
lastActiveMarkdownEditorId
pendingMarkdownSelection
```

dogfood では以下を確認した。

```text
**メイド**:
  メイドだけ選択される
  ** は含まれない

複数メイド:
  ◀ / ▶ で前後移動できる
  wrap-around する

オーダーメイド:
  default auto boundary で メイド は拾われない

未保存 draft:
  保存済み surface で移動する

Navigator search:
  0件に絞っても occurrence navigation / Preview decoration に影響しない
```

ただし、Glossary Editor 上の `◀ / ▶` を押すと Markdown Editor tab へ移動するため、連続操作中に Glossary Editor 側のボタンが画面から消える。

これは Foundation issue としては許容する。
次の UX 改善候補として、支援ウィンドウに Occurrences tab を置く。

---

## 近いうちにやること

### Workbench resizable panes and sidebar collapse foundation

Workbench の主要ペインを、初期段階で明示的に制御できるようにする。

現状、左 Navigator / Editor / Preview の幅は固定に近い。
dogfood を進めると、Glossary や Preview の表示幅を作業内容に応じて変えたくなる。

候補 Issue:

```text
Workbench resizable panes and sidebar collapse foundation
```

目的:

```text
左 Navigator 幅を drag で変更可能にする
Editor / Preview split を drag で変更可能にする
左 Activity Bar の active icon 再クリックで Navigator を collapse / restore できるようにする
Activity Bar 自体は常に表示する
```

通常:

```text
[Activity Bar] [Navigator] [Editor] [Preview]
```

Navigator collapse 時:

```text
[Activity Bar] [Editor] [Preview]
```

初期状態案:

```ts
interface WorkbenchLayoutState {
  sidebar: {
    collapsed: boolean;
    width: number;
  };
  editorPreview: {
    ratio: number;
  };
}
```

初期値候補:

```text
sidebar.width:
  260px 前後

editorPreview.ratio:
  0.5

sidebar.collapsed:
  false
```

制約候補:

```text
sidebar min:
  180px

sidebar max:
  420px

editor min:
  320px

preview min:
  280px
```

状態はアプリケーションインスタンス中だけ保持する。
初期実装では settings / project config / DB / session restore には保存しない。

実装時の注意:

```text
PointerEvent ベースで drag する
pointer capture を使う
min / max clamp する
window resize 時に clamp する
drag 中の text selection を抑制する
```

非スコープ候補:

```text
下ペイン
支援ウィンドウ
layout 永続化
keyboard shortcut
command palette
terminal
per-project layout
split editor 増殖
```

---

### Utility Window shell foundation

本文領域の下に、補助作業を受け止めるアプリ内ペインを追加する。

Internal name:

```text
Utility Window
```

Japanese UI:

```text
支援ウィンドウ
```

English UI:

```text
Utility Window
```

「補助ウィンドウ」ではなく「支援ウィンドウ」とする。
本文を書くのは作者であり、Pergamum は勝手に本文を書き換えない。
しかし、探す・辿る・診断する・出力する作業は支援する。

候補 Issue:

```text
Utility Window shell foundation
```

役割:

```text
上:
  本文を書く / 読む / Preview する

左:
  Project / Glossary / Search などの Navigator

下:
  一時的な操作・探索・結果表示
```

初期スコープ候補:

```text
Workspace 下部に支援ウィンドウ領域を追加する
open / close できる
active tab を持てる
初期タブは空 shell または Occurrences のみ
height は固定、または最小限の可変
状態はアプリケーションインスタンス中のみ保持する
```

初期実装では以下に保存しない。

```text
settings
project config
DB
session restore
```

将来タブ候補:

```text
使用箇所 / Occurrences
コマンド / Command
検索 / Search
診断 / Diagnostics
出力 / Output
ターミナル / Terminal
デバッグログ / Debug Log
```

推奨実装順:

```text
1. Utility Window shell foundation
2. Occurrences tab
3. Command tab
4. Diagnostics / Output
5. Debug Log tab
6. Terminal
```

非スコープ候補:

```text
Terminal
Git
Command Palette 本実装
Diagnostics 本実装
Output 本実装
Debug logging
layout 永続化
```

---

### Glossary occurrences Utility Window tab foundation

Issue #81 で Glossary occurrence navigation の技術経路は通った。
しかし、Glossary Editor 上の `◀ / ▶` を押すと Markdown Editor tab へ移動するため、連続操作中にボタンが画面から消える。

これを改善するため、支援ウィンドウに `使用箇所 / Occurrences` tab を置く。

候補 Issue:

```text
Glossary occurrences Utility Window tab foundation
```

UI 案:

```text
語彙: メイド    1 / 3    ◀  ▶    [語彙を開く] [閉じる]
```

英語:

```text
Entry: メイド    1 / 3    ◀  ▶    [Open entry] [Close]
```

目的:

```text
Markdown Editor へ移動した後も、現在の Glossary occurrence navigation を継続できる UI を提供する
```

初期スコープ候補:

```text
occurrence navigation target entry を保持する
current index / total count を表示する
◀ / ▶ を支援ウィンドウから呼べる
Markdown Editor 上で連続移動できる
[語彙を開く] で Glossary Editor へ戻れる
[閉じる] で tracking を終了できる
```

注意:

```text
#81 の index-based cursor tracking は、文書編集後に直感とズレる可能性がある。
初期では許容する。
```

将来検討:

```text
content hash
range anchoring
cursor-position-aware navigation
```

非スコープ候補:

```text
range anchoring 本実装
文書編集に追随する occurrence 再計算
複数 entry の同時 tracking
Project 全体検索
```

---

### renderer `.test.tsx` を Vitest 実行対象に含める

現在、`tests/renderer/glossaryEditor.test.tsx` が存在するが、Vitest の include pattern が `tests/**/*.test.ts` のため、`.test.tsx` が実行対象に入っていない。

UI テストが増える前に整理したい。

候補 Issue:

```text
Include renderer .test.tsx files in Vitest config
```

目的:

```text
.test.tsx ファイルを Vitest 実行対象に含める
既存の非実行テストを実行対象にする
必要に応じてファイル命名・設定を整理する
```

非スコープ候補:

```text
UI テスト基盤の全面刷新
testing-library 導入
E2E テスト導入
```

---

### Glossary entry deletion foundation

Glossary entry を UI から削除できるようにする。

現在は dogfood を進めるほど試験用エントリが増える。
削除できない Glossary は運用上の摩擦になる。

候補 Issue:

```text
Glossary entry deletion foundation
```

目的:

```text
Glossary Sidebar または Glossary Editor から entry を削除できるようにする
削除前に確認する
削除後に Sidebar / open document / active editor の状態を整える
```

検討事項:

```text
削除確認の文言
削除対象が現在開いている Glossary Editor の場合の挙動
削除後にタブを閉じるか NotFound 表示にするか
Navigation history に残っている場合の扱い
```

非スコープ候補:

```text
Undo
Trash / recycle bin
複数選択削除
本文からの参照削除
```

---

### Glossary navigator search foundation

Glossary Sidebar 上で検索・絞り込みできるようにする。

Glossary は人物・地名・組織・アイテム・概念などですぐ増える。
数十件を超えた時点で検索が必要になる。

候補 Issue:

```text
Glossary navigator search foundation
```

対象:

```text
canonical surface
alias
variant
kind
```

初期スコープ候補:

```text
単純な contains 検索
大文字小文字の扱いは既存方針に合わせる
検索欄は Glossary Sidebar 内に置く
検索結果から Glossary Editor を開ける
```

非スコープ候補:

```text
fuzzy search
ranking
全文検索
タグ検索
正規表現検索
保存された検索条件
```

---

### Glossary forms management polish

Glossary Form 編集 UI の使い勝手を整える。

Issue #71 により canonical / alias / variant の boundary policy は編集できるようになった。
次は form 編集全体の摩擦を減らす。

候補 Issue:

```text
Glossary forms management polish
```

候補:

```text
重複 surface の UI feedback
空 surface の扱いを分かりやすくする
alias / variant の削除操作の視認性を上げる
warning policy の説明文を追加する
form の並び順を整理する
canonical / alias / variant の視覚的階層を整理する
```

非スコープ候補:

```text
tags
custom kind
bulk edit
import / export
```

---

## Phase 3 後半候補

### Glossary alias suggestion for punctuation variants

中黒あり / なしのような表記差を検出し、alias 候補として提示する。

例:

```text
ジャンヌ・ダルク
ジャンヌダルク

トータル・エクリプス
トータルエクリプス
```

重要なのは、自動で match させないこと。
自動で alias を追加しないこと。

```text
やること:
  候補として提示する

やらないこと:
  本文の自動修正
  alias の自動追加
  fuzzy matching
  中黒の自動無視
```

候補 Issue:

```text
Glossary alias suggestion for punctuation variants
```

検討事項:

```text
候補をどこに出すか
Glossary Editor 内に出すか
Linter / Suggestion として出すか
候補の採用操作をどうするか
```

---

### Japanese notation variant linter foundation

日本語表記揺れを検出する Linter の基礎を作る。

ただし、日本語表記揺れは危険が多い。
文脈なしに「誤り」と断定できないものが多い。

分類が必要。

```text
文脈なしに検出しやすいもの:
  括弧の対応不整合
  明らかな記号の混在
  同一ファイル内での明確な表記差

統計的にしか言えないもの:
  漢字 / かな の揺れ
  中黒の有無
  長音符 / ダッシュ / ハイフンの揺れ
  数字表記の揺れ
```

Linter の表現は断定しない。

望ましい表現:

```text
表記が混在している可能性があります。
出版慣習では、三点リーダーを偶数個で揃えることがあります。
同一人物と思われる表記が複数あります。
```

避ける表現:

```text
誤りです。
修正します。
自動変換します。
```

候補 Issue:

```text
Japanese notation variant linter foundation
```

---

### Glossary match navigation foundation

Preview 上の Glossary match から、対応する Glossary Editor へ移動できるようにする。

候補 Issue:

```text
Glossary match navigation foundation
```

目的:

```text
Preview 上の Glossary match を起点に Glossary Editor を開く
既存の glossary.entry.open command を使う
Navigation history との関係を整理する
```

検討事項:

```text
Hover Card 内に「開く」操作を置くか
match そのものをクリック可能にするか
キーボード操作をどうするか
Navigation history に積むか
```

非スコープ候補:

```text
本文側のジャンプ
本文の自動編集
Hover Card / Balloon 用語整理
```

---

### Debug mode JSONL logging foundation

Debug mode のログ基盤を作る。

候補 Issue:

```text
Debug mode JSONL logging foundation
```

基本方針:

```text
--debug 起動オプションを追加する
--debug が指定された場合、現在のアプリケーションインスタンスについてデバッグログをファイルに出力し続ける
ログ形式は JSONL とする
```

Debug Log tab は、ファイルログ出力そのものではなく、直近の warning / error を表示する viewer として扱う。
そのため、ログ基盤と Debug Log tab は別 Issue に分ける。

JSONL を採用する理由:

```text
1行1イベント
人間も読める
grep / jq / parser にかけやすい
AI に読ませやすい
将来の Debug Log viewer や issue report export に流用しやすい
```

ファイル名候補:

```text
debug-{sessionUuidV7}--{yyyy-mm-dd}--{hh}-{MM}.jsonl
```

例:

```text
debug-018f4b8c-7a2b-7c3d-8e4f-100000000001--2026-08-14--15-32.jsonl
```

ローテーション方針:

```text
最大行数でローテーションする
現在のログファイルが最大行数に達したら、その時点のローカル日付・時刻を使って新しい JSONL ファイルを開く
同じ分に複数回ローテーションしてファイル名が衝突する場合だけ suffix を付ける
```

イベント形式候補:

```ts
interface DebugLogEvent {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  source: string;
  message: string;
  sessionId: string;
  details?: Record<string, unknown>;
}
```

重要な制限:

```text
Debug log must not write manuscript body text by default.
```

OK:

```text
timestamp
level
source
message
sessionId
editorId
entryId
relativePath
document length
occurrence count
range start/end
error name/message
```

慎重:

```text
glossary surface text
selected text
description text
```

NG:

```text
document.content 全文
段落全文
manuscript body text
glossary description 全文
project config 内の secret-ish 情報
```

非スコープ候補:

```text
Utility Window Debug Log tab
ログファイル viewer
issue report export
remote telemetry
本文内容の収集
```

---

### Utility Window debug log tab foundation

Debug mode JSONL logging foundation の後に、支援ウィンドウ上で直近の warning / error を確認できる viewer を作る。

候補 Issue:

```text
Utility Window debug log tab foundation
```

位置づけ:

```text
Debug Log tab:
  直近の warn / error を見るための viewer

JSONL file sink:
  --debug 時に全 debug / info / warn / error を保存するログ基盤
```

Debug Log tab はログ保存そのものではない。
ログ基盤の in-memory / event-bus sink を UI に表示するものとして扱う。

初期スコープ候補:

```text
支援ウィンドウに Debug Log tab を追加する
直近の warn / error を表示する
timestamp / level / source / message を表示する
詳細 details を必要に応じて展開できる
```

非スコープ候補:

```text
JSONL file sink 本体
ログファイルの全文 viewer
ログ検索
ログエクスポート
remote telemetry
本文内容の表示
```

---

## dogfood を楽にするための候補

### Session restore foundation

前回開いていたプロジェクト・タブ・アクティブエディタを復元する。

候補 Issue:

```text
Session restore foundation
```

目的:

```text
アプリ再起動後に前回の作業状態へ戻れるようにする
dogfood の摩擦を減らす
```

検討事項:

```text
復元対象:
  last opened project
  open documents
  active editor
  sidebar mode

復元しないもの:
  一時的な UI 開閉状態
  stale な editor resolution result
```

EditorId / Project Context / Navigation History と絡むため、慎重に切る。

---

### Hierarchical file explorer foundation

File Explorer を階層表示にする。

候補 Issue:

```text
Hierarchical file explorer foundation
```

目的:

```text
小説プロジェクトのフォルダ構造を自然に扱えるようにする
chapters / notes / worldbuilding / drafts などを見やすくする
```

非スコープ候補:

```text
ファイル作成
ファイル削除
ファイル移動
rename
drag and drop
```

---

### Outline View

アクティブな編集中 Markdown ファイルの階層構造にあわせて、アウトラインビューを表示する。

候補 Issue:

```text
Outline view foundation
```

目的:

```text
Markdown heading をもとに現在の文書構造を表示する
長い章や設定メモを移動しやすくする
```

検討事項:

```text
heading level の扱い
現在位置の highlight
クリック時の editor navigation
Navigation history に積むか
```

非スコープ候補:

```text
複数ファイル横断 outline
章構成管理
heading の自動修正
本文構造の自動生成
```

---

### Application menu / shortcut polish

アプリケーションメニューとショートカットを整理する。

候補 Issue:

```text
Application menu and shortcut polish
```

検討事項:

```text
Ctrl+S:
  active editor の保存

Ctrl+F:
  検索

Ctrl+H:
  置換

Glossary entry open / create:
  command 経由

コンテキストメニュー:
  選択中テキストを Glossary に追加
```

注意:

```text
キーバインドの全面カスタマイズは初期スコープにしない
OS / Electron / browser default と衝突しない
Mac 表示ラベルと Windows/Linux 表示ラベルを分ける
```

---

### Command tab / Command Launcher

マウス操作に依存せず、キーボードから各種操作を呼び出せる UI は必要になる。

ただし、VSCode 型の上中央 overlay Command Palette は、Pergamum では慎重に扱う。

理由:

```text
本文の文脈を隠す
視線を奪う
プログラミング IDE 感が強すぎる
IME や Hover Card と衝突しやすい
```

将来的な方針:

```text
Command Palette / Command Launcher は、本文中央に大きく overlay しない
支援ウィンドウ内の transient command UI として検討する
```

候補:

```text
支援ウィンドウ > コマンド tab
Command Lane inside Utility Window
```

候補 Issue:

```text
Command tab foundation
```

非スコープ候補:

```text
VSCode 型 overlay palette
全 command の網羅
キーバインド全面カスタマイズ
plugin command registration
```

---

### UI Polish

UI を細部まで調整する。

候補:

```text
タブを閉じるボタン
About ダイアログ
empty state
loading state
error state
status message の整理
他 dogfooding で判明したもの
```

---

### settings.json

現在 Pergamum 内部でハードコードされている初期値や、エディタフォント名、サイズ、ビューワーフォント名等の設定 UI とそれを保持する settings.json を用意する。

settings.json を app 単位にするか project 単位にするかは、設定項目ごとに慎重に判断する。

検討事項:

```text
app settings:
  theme
  editor font
  preview font
  UI language
  debug related preferences

project settings:
  project-specific output settings
  project-specific glossary policy
  project-specific manuscript conventions
```

注意:

```text
初期実装では、layout の一時状態を settings.json に保存しない
Workbench layout の永続化は後回しにする
```

---

### DB snapshot generation

`pergamum.db` の内容から、人間が読める JSON snapshot を生成する。

目的は、DB の中身を確認しやすくすること、Git 差分で構造化データの変化を追いやすくすること、将来の復元機能の足場を作ることである。

```text
pergamum.db:
  構造化データの正本

snapshot JSON:
  DB から生成される派生データ
  正本ではない
```

初期方針:

```text
Main Process が生成する
Renderer は DB / snapshot に直接触らない
DB 保存成功後に生成する
snapshot 生成失敗時に DB 保存を巻き戻すかは慎重に判断する
```

非スコープ候補:

```text
snapshot からの復元
snapshot の手動編集
schema migration の代替
クラウド同期
```

---

### DB snapshot restore

JSON snapshot から `pergamum.db` を復元する。

復元は既存 DB を置き換える危険な操作であるため、snapshot 生成より後に扱う。

初期方針:

```text
snapshot を validate する
一時 DB に復元する
schema validation を通す
成功後に既存 DB をバックアップして置換する
失敗時に既存 DB を壊さない
```

非スコープ候補:

```text
曖昧な自動修復
破損 snapshot の部分復元
異なる schema version 間の自動変換
```

---

### Color theme foundation

長時間執筆・編集するために、カラーテーマを切り替えられるようにする。

初期段階では、ビルトインテーマとしてライトテーマとダークテーマを用意する。

```text
built-in themes:
  light
  dark
```

ユーザー定義テーマは、任意 CSS を直接読み込むのではなく、まずは許可されたテーマトークンを設定として受け取る方式を検討する。

```text
common tokens:
  app background
  app foreground
  panel background
  panel foreground
  border color
  muted foreground
  accent color
  accent foreground
  selection background
  selection foreground
  warning color
  error color
  success color

editor tokens:
  editor background
  editor foreground
  editor selection background
  editor selection foreground

preview / viewer tokens:
  preview background
  preview foreground
  preview muted foreground
  preview heading foreground
  preview link foreground

glossary match tokens:
  glossary match foreground
  glossary match background
  glossary match underline

glossary hover card tokens:
  glossary card background
  glossary card foreground
  glossary card border

typography tokens:
  font family
  font size
  line height
```

これらは、アプリ全体、エディタ、プレビュー、Glossary の一致箇所、Hover Card 本体を別々に調整できるようにするためのものである。

検討事項:

```text
テーマ設定を app 単位にするか project 単位にするか
settings.json とどう関係させるか
CSS variables をテーマ境界にするか
ユーザー定義テーマをどこまで許可するか
破綻したテーマ設定から復旧する手段を用意するか
```

非スコープ候補:

```text
任意 CSS の直接読み込み
テーママーケットプレイス
テーマ同期
プラグインによるテーマ配布
高度なテーマエディタ
```

---

## v0.9 に向けた候補

v0.9 は、Git 統合や Plugin API を含めない dogfood 可能な配布版を目指す。

### v0.9 に欲しいもの

```text
Workbench resizable panes
Sidebar collapse
Utility Window shell
Glossary occurrences tab
Glossary entry deletion
Glossary navigator search
階層 File Explorer
Session restore
Settings 整理
Application menu
基本ショートカット
Context menu
DB snapshot generation
UI Polish
exe 配布
README / FAQ 整理
```

### v0.9 では外してよいもの

```text
Git 統合
Integrated Terminal
Plugin API
複雑な Linter
高度な fuzzy matching
縦書き出力
本文エクスポート
共同編集
クラウド同期
layout 永続化
```

### DB 方針

v0.9 までは DB schema 破壊を許容する。
既存の開発 DB は捨ててよい。

ただし、v1.0 以降は migration が必要になる。

```text
v0.9 まで:
  schema 破壊可
  migration 不要
  dogfood DB は必要に応じて再作成

v1.0 以降:
  schema version 管理
  migration 必須
```

---

## v1.0 に向けた候補

v1.0 は、日常的に使える安定版を目指す。

候補:

```text
DB migration
DB snapshot restore
Project settings の安定化
Glossary 管理 UI の安定化
Session restore の安定化
Crash recovery
基本的な Linter
Export / output foundation
FAQ / Help
```

v1.0 では、ユーザーのデータを壊さないことを重視する。

---

## v1.x 以降の候補

v1.x 以降では、v1.0 までに固めた本文正本・Glossary・Workbench・支援ウィンドウの上に、より大きな補助機能を載せる。

候補:

```text
Git status / diff / commit UI
Integrated Terminal optional / experimental
Plugin API
Trusted UI Extension
高度な Linter
Export / output の拡張
縦書き出力
EPUB / PDF / DOCX 出力
```

Terminal は Git 統合とセットで考える。

```text
Git UI:
  よく使う操作を安全に提供する

Terminal:
  UI で覆いきれない操作の escape hatch
```

ただし、Terminal は実装コストが高いため後回しにする。

理由:

```text
OS 依存
shell 選択が必要
PTY 制御が必要
node-pty など native module が絡む可能性
packaging / CI / security が重くなる
```

ロードマップ感:

```text
v0.9:
  Terminal なし
  Git なしでも dogfood 可能にする

v1.0 前後:
  Git status / diff / commit UI を検討

v1.x:
  Integrated Terminal optional / experimental
```

---

## 保留・駐車場

### Glossary Balloon 用語

本文上の Glossary match にカーソルを合わせたときに表示される UI を、ユーザー向けに「語彙バルーン」と呼ぶ案がある。

ただし、内部実装名 `HoverCard` は現状維持する。

現時点の方針:

```text
内部実装名:
  HoverCard を維持

ユーザー向け用語:
  語彙バルーン は候補として保留
```

理由:

```text
Hover Card は実装実態に合っている
Balloon は吹き出し形状を期待させる可能性がある
内部語彙と UI 語彙は別の最適化対象
```

---

### Plugin API

初期リリースでは外す可能性が高い。

将来候補:

```text
Command registration
Linter registration
Renderer extension
Trusted UI Extension
```

注意点:

```text
プラグインに本文編集権限を渡すか
Renderer をどこまで触らせるか
セキュリティ境界をどうするか
署名 / trust model をどうするか
```

---

### Git integration

初期リリースでは外す方向。

理由:

```text
Git は外部ツールで扱える
小説 IDE としてのコアではない
初期実装に含めると複雑化する
```

ただし、将来的には以下を検討する可能性がある。

```text
変更検知
commit helper
history viewer
diff viewer
```

Terminal は Git 統合とセットで考える。

Git UI は、よく使う操作を安全に提供する。
Terminal は、UI で覆いきれない操作の escape hatch として扱う。

ただし、Terminal は実装コストが高いため後回しにする。

理由:

```text
OS 依存
shell 選択が必要
PTY 制御が必要
node-pty など native module が絡む可能性
packaging / CI / security が重くなる
```

ロードマップ感:

```text
v0.9:
  Terminal なし
  Git なしでも dogfood 可能にする

v1.0 前後:
  Git status / diff / commit UI を検討

v1.x:
  Integrated Terminal optional / experimental
```

---

### Custom kind

Glossary entry の `kind` をユーザー定義可能にする案。

現状は固定 enum。

```text
term
person
place
organization
item
concept
```

将来案:

```text
glossary_kinds table
id: UUIDv7
display_name
sort_order
is_builtin
```

注意点:

```text
kind key をどう扱うか
表示名変更と内部 ID の関係
既存 entry との互換性
```

---

### tags

Glossary entry に tags を付ける案。

用途:

```text
章
勢力
時代
登場頻度
視点人物
ネタバレ管理
```

現時点では Future Work。

---

### Export / output

Markdown 本文から提出用原稿を出力する機能。

候補:

```text
ルビ対応
縦書き対応
文字数カウント
章単位出力
PDF / DOCX / EPUB
```

ただし、本文正本を Markdown とする方針は維持する。

---

## 直近の推奨 Issue 順

現時点では、以下の順で進める。

```text
1. Workbench resizable panes and sidebar collapse foundation
2. Utility Window shell foundation
3. Glossary occurrences Utility Window tab foundation
4. Debug mode JSONL logging foundation
5. Utility Window debug log tab foundation
6. Command tab foundation
```

理由:

```text
Workbench layout:
  支援ウィンドウを入れる前に、上位レイアウトの責務境界を固める

Utility Window shell:
  本文周辺作業を逃がす場所を作る

Occurrences tab:
  #81 の UX 課題を自然に改善する

Debug logging:
  将来の dogfood / issue report / AI 解析に備える

Command tab:
  本文中央 overlay を避けた command launcher の置き場所を作る
```

---

## ロードマップ運用

この文書は、完璧に保つ必要はない。
大きな方針・近い候補・保留事項を忘れないために更新する。

運用案:

```text
Issue を作る前:
  この文書から候補を拾う

Issue を作った後:
  必要なら候補名を Issue 番号付きに更新する

Issue が完了した後:
  完了済みに移す、または該当項目に完了メモを追記する

方針が変わった場合:
  古い記述を消すか、保留・却下として残す
```

この文書は、Pergamum の「開発の地図」であり、法律ではない。
実装時の正本は GitHub Issue とする。
