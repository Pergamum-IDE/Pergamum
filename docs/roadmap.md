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

---

## 近いうちにやること

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
UIテスト基盤の全面刷新
testing-library 導入
E2Eテスト導入
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

アクティブな編集中mdファイルの階層構造にあわせて、アウトラインビューを表示する。

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

### Command palette

マウス操作に依存せず、キーボードショートカットのみで各種操作を可能にする Command palette を実装する。

---

### UI Polish

UIを細部まで調整する。

- タブを閉じるボタン
- Aboutダイアログ
- 他dogfoodingで判明したもの

---

### settings.json

現在Pergamum内部でハードコードされている初期値や、エディタフォント名、サイズ、ビューワーフォント名等の設定UIとそれを保持する settings.json を用意する。
settings.json はプロジェクト単位でプロジェクトフォルダに保存する。

---

### DB snapshot generation

`pergamum.db` の内容から、人間が読める JSON snapshot を生成する。

目的は、DBの中身を確認しやすくすること、Git差分で構造化データの変化を追いやすくすること、将来の復元機能の足場を作ることである。

```text
pergamum.db:
  構造化データの正本

snapshot JSON:
  DBから生成される派生データ
  正本ではない
```

初期方針:

```text
Main Process が生成する
Renderer は DB / snapshot に直接触らない
DB保存成功後に生成する
snapshot生成失敗時に DB保存を巻き戻すかは慎重に判断する
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

復元は既存DBを置き換える危険な操作であるため、snapshot生成より後に扱う。

初期方針:

```text
snapshot を validate する
一時DBに復元する
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

## v0.9 に向けた候補

v0.9 は、Git 統合や Plugin API を含めない dogfood 可能な配布版を目指す。

### v0.9 に欲しいもの

```text
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
Plugin API
複雑な Linter
高度な fuzzy matching
縦書き出力
本文エクスポート
共同編集
クラウド同期
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
小説IDEとしてのコアではない
初期実装に含めると複雑化する
```

ただし、将来的には以下を検討する可能性がある。

```text
変更検知
commit helper
history viewer
diff viewer
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
表示名変更と内部IDの関係
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
