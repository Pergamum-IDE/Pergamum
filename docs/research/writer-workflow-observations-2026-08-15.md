# Writer workflow observations

Date: 2026-08-15
Status: Observation note
Scope: Mid- to long-term design input for Pergamum

---

## 1. Purpose

この文書は、筆者が見聞きした書き手の運用、既存ツール、創作支援AIの使われ方から、Pergamum の中長期設計へ反映できそうな観察を整理するためのメモである。

特定のコミュニティ、個人、発言、会話ログを記録・引用するものではない。
ここに残すのは、個別の発言内容ではなく、そこから筆者が抽出した設計上の示唆である。

Pergamum の基本方針は変えない。

- 本文は作者の正本である
- Pergamum は本文を勝手に書き換えない
- 設定・語彙・状態は、本文を読む／書く作業を助けるために構造化する
- AI 生成機能そのものは中核にしない
- ただし、AI や外部ツールが欲しがる作品固有データを渡せる形にすることは検討する

---

## 2. Public note policy

この文書は公開リポジトリに置く可能性があるため、以下を記録しない。

- 特定のコミュニティ名
- チャンネル名
- 発言者名
- 発言日時
- 発言の直接引用
- 個人に紐づく未公開の運用詳細

公開文書に残すのは、以下に限定する。

- 観察されたワークフローの型
- 既存ツールの一般的な特徴
- Pergamum に関係する設計仮説
- 将来 Issue / ADR / roadmap に移す候補

---

## 3. Observed tool patterns

### 3.1 VS Code extension as writing environment

小説執筆向けの VS Code 拡張はすでに存在する。

代表的な機能として、以下が見られる。

- 縦書きプレビュー
- 原稿管理
- 文字数カウント
- ルビや会話記法のハイライト
- Git と連携した編集量の可視化

これは Pergamum にとって、「なぜ VS Code 拡張ではなくスタンドアロンなのか」を考えるための強い比較対象になる。

Pergamum がスタンドアロンである理由は、単にエディタ機能を作りたいからではない。
本文、語彙、出現箇所、構造化された作品情報を、同じ作業面に接続したいからである。

### 3.2 Standalone GUI writer tool

スタンドアロンの小説執筆GUIも存在する。

観察された特徴は以下。

- 縦書きで直接編集する
- 作品情報、本文、プロット、登場人物、世界観、資料、設定などを固定カテゴリで持つ
- ルビ、傍点、三点リーダ、ダッシュなどを入力補助ボタンで扱う
- Git ではなく、アプリ内スナップショットで履歴を持つ

重要なのは、設定情報が独立したページとして存在している点である。
本文と設定が同じアプリ内にあっても、本文上で実行時に接続されているとは限らない。

Pergamum が狙う場所は、設定ページそのものではなく、本文を読んでいるその場所に作品情報を接続することである。

### 3.3 Markdown files as AI context store

AI に長編を書かせる、または補助させる運用では、Markdown ファイル群を設定資料として管理する形が見られる。

観察された特徴は以下。

- 世界観、人物、設定、プロットを複数の Markdown ファイルに分ける
- AI エージェントにそれらを読ませて執筆や検査を行わせる
- 当初は計画書だったものが、話数の進行に応じて状態ストアのように肥大する
- 「この情報はまだ開示されていない」「この人物はまだ知らない」などの変動情報が散文中に埋め込まれる

Markdown ファイル群は柔軟だが、時点ごとの状態を構造として持ちにくい。
人間が読むことはできるが、後から安定して検索・検査するには弱い。

### 3.4 Consistency audit workflow

長編の整合性検査では、以下のような分業が見られる。

- 機械的チェック
  - Grep などで既知の語彙・誤表記を探す
  - 本文全体を AI コンテキストに載せない
- 意味的チェック
  - 話数単位で AI に要約・確認させる
  - 大きな矛盾や時系列の破綻を探す
- 中断再開
  - progress file を持ち、長い検査を分割して進める

この方式は、トークンコストを意識した現実的な運用である。
ただし、既知の誤りしか探せないこと、作品ごとの規則が手作業で書かれやすいことが弱点になる。

Pergamum では、Glossary に作品固有の正典を持たせることで、機械的チェックの精度を上げられる可能性がある。

### 3.5 Japanese proofreading / refinement tools

日本語の校正・推敲支援では、以下のような項目が扱われる。

- 表記揺れ
- 漢字／ひらがなの揺れ
- カタカナ長音の揺れ
- 全角／半角の揺れ
- 文体上の粗さ
- 地の文と会話文の比率などの代理指標

一般的な日本語校正は外部ツールや LLM でも一定程度できる。

しかし、作品固有の正典は一般校正では判断できない。

例:

- ある作品では「スノウドロップ」が正しい
- 別の作品では「スノードロップ」が正しい
- 一般言語としてはどちらも成立する
- したがって、正誤は作品の正典を持っていないと判定できない

この領域は Pergamum の Glossary が担当できる。

### 3.6 Ruby conversion tools

投稿サイトや出力先ごとにルビ記法・制約が異なるため、ルビ変換器が独立ツールとして必要とされている。

観察された問題は以下。

- 親文字数の制限
- ルビ文字数の制限
- サイトごとの記法差
- 出版向け記法と投稿サイト向け記法の差
- 可読性上の目安と、サイト側の規則が混同されやすい

このことから、Pergamum ではルビを単一の記法に固定するより、内部表現と出力先プロファイルを分けるほうがよい可能性がある。

### 3.7 Notebook-style AI source tools

資料をまとめて投入し、AI に参照させる形のツールは、導入が非常に軽い。

強みは以下。

- 無料または低コストで始められる
- インストール不要
- 資料を放り込むだけで使える
- 既存の Markdown やメモ資産を使える

弱点は、変動する情報の扱いである。

- キャラの感情変化
- 知識範囲
- 関係性の変化
- 呼称の変化
- 読者に開示済みの情報

これらは単なる固定設定ではなく、時点に依存する状態である。
資料を丸ごと入れるだけでは、どの時点の情報として扱うべきかが曖昧になりやすい。

---

## 4. Pain points observed

### 4.1 Long-form consistency is difficult

長編では、整合性の担保が難しい。

特に問題になりやすいのは、固定設定ではなく変動情報である。

- 定期的な話の要約
- 呼称の変化
- 関係性の変化
- キャラの感情の変化
- 知識範囲の変化
- 読者への開示タイミング

これらは、単なる glossary entry では表現しきれない。

Pergamum が将来扱うべき本丸は、以下の形に近い。

- 時点
- 実体
- 属性

つまり、ある時点で、ある人物・場所・制度・物品・概念が、どのような状態にあるかを扱う必要がある。

### 4.2 Settings are often separated from text

既存の多くの運用では、設定資料は本文から分離されている。

- 設定ページ
- Markdown 資料室
- AI 用 context files
- 手書きの時系列整理
- 手作業の用語リスト

これらは管理しやすい一方で、本文を書いている瞬間には接続が弱い。

Pergamum が賭けているのは、設定を別の場所に置くことではなく、本文の上に出すことである。

### 4.3 Known error lists are useful but limited

誤表記リストは有効である。

例:

- 誤った表記を Grep で探す
- 正しい表記へ誘導する
- 作品固有の用語を校正に反映する

ただし、誤表記リストは「すでに知っている誤り」しか見つけられない。
まだ誰も気づいていない揺れを見つけるには、別の仕組みが必要になる。

カタカナ長音・小書き仮名の揺れは、日本語創作で特に起きやすい故障モードである可能性が高い。

例:

- スノウ / スノー
- キロ / キーロ
- ニフティ / ニフティー
- パワァ / パワー

これらは一般辞書だけでは決められない。
作品固有の正典が必要である。

### 4.4 High-frequency entries can damage editor UX

Glossary の hover / decoration は、出現頻度が高すぎる entry では邪魔になりうる。

高頻度語をすべて装飾すると、本文が読みにくくなる。
レンダリング負荷以前に、視覚的ノイズとして UX が破綻する可能性がある。

重要な観察:

- hover card の価値は、必ずしも出現頻度に比例しない
- 忘れやすいのは、むしろ低頻度の実体である
- 高頻度語は常時装飾しないほうがよい場合がある

将来候補:

- entry 単位の decoration ON/OFF
- 頻度による自動抑制
- ファイル内初出のみ装飾
- 現在の執筆フェーズに応じた表示強度
- 手動 focus mode

### 4.5 Writing phase changes the desired UI pressure

同じ機能でも、執筆フェーズによって望ましい押しの強さが変わる。

初稿中:

- 流れを止めたくない
- hover や警告が邪魔になりうる
- 表示は控えめでよい

推敲中:

- 積極的に警告してほしい
- 別実体候補や表記揺れを見たい
- 作品全体の整合性を確認したい

したがって、Glossary / Linter / Hover の表示強度は、単なる global on/off では不足する可能性がある。

---

## 5. Design implications

### 5.1 Glossary as work-specific canon

Glossary は、単なる用語メモではない。
作品固有の正典である。

Pergamum の強みは、一般言語の正しさではなく、作品内での正しさを扱える点にある。

一般校正:

- 日本語として自然か
- 誤字脱字がないか
- 文体が揃っているか

作品固有校正:

- この作品ではこの表記が正しいか
- この人物はこの時点でこの呼称を使うか
- この用語は別の実体と混同されていないか
- この表記は許可された異表記か
- この表記は既知の誤表記か

Pergamum は後者を担う。

### 5.2 Erroneous forms

現在の Glossary form は、正しい表記・正しい異表記を表す。

将来は、作品内での誤表記を form として持てる可能性がある。

概念モデル:

- entry
  - canonical form
  - valid alias
  - valid variant
  - erroneous form

これにより、以下が可能になる。

- 既知の誤表記を本文上で警告する
- 正しい表記へ誘導する
- 外部校正ツールや AI に渡す custom terms を生成する
- 作品固有の用語統一を支援する

注意点:

- 自動修正はしない
- warning として表示する
- 正誤の根拠は作品の Glossary である
- 一般辞書では判定しない

### 5.3 Form scope

呼称・異表記は、常に作品全体で有効とは限らない。

必要になりうる scope:

- 話者
- 章
- 話数
- 時点
- 期間
- 関係性
- 文脈

例:

- ある人物だけが使う呼称
- ある章以降にだけ有効な呼称
- 正体が明かされる前だけの呼称
- 立場の変化後に使われる呼称

現時点で時系列DBを作る必要はない。
ただし、form が flat である限界は意識しておく。

Phase 2 / Phase 3 で match boundary を form 単位に持たせたのと同じく、呼称スコープも form 単位で拡張できる可能性がある。

### 5.4 Normalized key for Japanese variant detection

既知の誤表記リストだけでは、未知の揺れを検出できない。

将来候補として、正規化キーによる索引を検討する。

例:

- 長音符の扱い
- 小書き仮名の扱い
- カタカナ表記揺れ
- 全角／半角
- 中黒の有無

正規化キーは、本文を書き換えるものではない。
あくまで検索・候補提示・警告のための派生情報である。

Pergamum の本文非破壊原則に従い、自動修正はしない。

### 5.5 Decoration suppression

Glossary decoration は、すべての entry に対して常時表示すればよいわけではない。

特に高頻度語は、表示価値よりノイズが大きくなる可能性がある。

将来候補:

- entry ごとの decoration setting
- entry ごとの hover setting
- file-local frequency による自動抑制
- project-wide frequency による自動抑制
- 初出のみ表示
- 推敲モードのみ強調

この課題は dogfood を始めると早期に顕在化する可能性がある。

### 5.6 Ruby internal model and output profiles

ルビは、単一の外部記法に固定しないほうがよい。

理由:

- 投稿サイトごとに記法が異なる
- 親文字数・ルビ文字数の制限が異なる
- 出版向けとWeb投稿向けで期待される形式が異なる
- サイト仕様は変わりうる

将来方針:

- 内部表現はひとつ
- 出力時に profile を選ぶ
- profile は外部ファイルとして持てるようにする
- サイト規則違反は error
- 可読性上の目安は style warning
- 規則と仮説を混同しない

Glossary に読みを持たせる場合、初出のみルビなども機械的に扱える可能性がある。

### 5.7 Japanese punctuation linter

日本語創作では、約物の揺れも問題になる。

例:

- ダッシュ族の取り違え
- 三点リーダの個数
- ダッシュの個数
- ハイフン、マイナス、長音符、罫線、漢数字の混同

注意点:

- 長音符は正当な語にも出現する
- 数式のマイナスは正当である
- 罫線や装飾として使われる場合もある
- 文脈を見ずに禁止すると誤検出が多い

したがって、前後の文字種や文脈を見る必要がある。
この点は glossary boundary filter と近い。

自動修正はしない。
警告し、判断は作者に返す。

### 5.8 AI-ready glossary export

Pergamum が AI 生成機能を持たなくても、AI が欲しがるデータを出すことはできる。

Glossary から以下を export できると、外部AI校正・推敲ツールとの接続が容易になる。

- canonical terms
- valid variants
- aliases
- known erroneous forms
- warning notes
- description / notes
- possibly kind

これは Pergamum の既存方針と矛盾しない。

- AIそのものは作らない
- 作品固有の正典を構造化する
- 必要に応じて外部ツールに渡す
- 本文は勝手に書き換えない

AI に払うトークンコストを減らす道具としても意味がある。

### 5.9 Dogfood glossary seed script

実データなしで Glossary を設計すると、想像上の用語を相手にスキーマを決めることになる。

v0.9 までは DB の破壊的変更を許容しているため、製品機能としての import を作る必要はない。
ただし、自分用の開発治具として、Glossary seed script を早めに用意する価値がある。

方針:

- 製品機能ではない
- 汎用CSV importではない
- 自分の seed file だけを読む
- 壊れたら入れ直す
- 使い捨てでよい
- dogfood のための治具である

これにより、以下を早期に確認できる。

- hover card がどの程度邪魔か
- 高頻度語の装飾がどの程度ノイズになるか
- 20語程度でも体感できる問題があるか
- Glossary pane が実データに耐えるか

### 5.10 Glossary pane scalability

初期設計は 200件程度の glossary を前提にしてよい。

ただし、一覧描画だけは後から差し替えやすい構造にする。

避けたいこと:

- 全件を無条件で DOM に出す設計
- pane 全体が list rendering と密結合する設計
- 後から virtual scroll に差し替えにくい設計

今すぐ 2000件前提の UI を作る必要はない。
しかし、件数が増えたときに list 部分だけを差し替えられる境界は欲しい。

### 5.11 Manuscript newline semantics

物理的な改行コードと、小説本文における改行の意味は別問題である。

物理改行コード:

- LF
- CRLF
- CR

本文上の改行セマンティクス:

- 単一改行を段落内改行として扱うか
- 単一改行を段落区切りとして扱うか
- 空行を段落区切りとして扱うか
- Markdown 標準に寄せるか
- Web小説の慣習に寄せるか
- docx export でどう扱うか

Markdown の標準挙動と、日本語Web小説の慣習は必ずしも一致しない。

これは単なる preview 設定ではなく、将来の export にも影響する。
別 Issue / ADR として扱うべき設計論点である。

### 5.12 Deterministic checks before LLM checks

高性能モデルに長編整合性チェックを毎回投げるのはコストが高い。

Pergamum ができること:

- Glossary matching
- known erroneous form detection
- occurrence navigation
- high-confidence mechanical checks
- AI に渡す custom terms の生成
- AI に渡す context の絞り込み

決定的に検出できるものは、先に決定的に検出する。
LLM は、意味的判断や要約が必要な場面に回す。

これは「AIに払う金を減らす道具」という位置づけにもなる。

---

## 6. Strategic implications

### 6.1 Pergamum is not an AI writing generator

Pergamum は、AI に小説を書かせる道具ではない。

より正確には、以下を目指す。

- 本文を正本にする
- 作品固有の正典を構造化する
- 本文上で正典と接続する
- 出現箇所を辿れるようにする
- 必要なら外部AIや校正ツールに渡せる形へ変換する
- ただし本文は勝手に書き換えない

### 6.2 The empty seat

観察した既存ツールや運用では、以下のどちらかに寄りやすい。

- 設定を別ページ・別ファイルに置く
- 設定を AI のコンテキストに丸ごと入れる

Pergamum が狙う空席は、その中間ではない。

Pergamum が狙うのは、本文と設定を実行時に接続する場所である。

つまり、

- 設定資料室ではない
- AI context folder でもない
- 単なる Markdown editor でもない
- 本文上に作品固有正典を重ねる editor である

### 6.3 Dogfood is enough to justify the project

Pergamum は、まず筆者自身のための道具である。

したがって、初期の評価軸は市場規模ではない。
自分の長編 dogfood に耐えるかどうかでよい。

これは市場調査を否定するものではない。
ただし、作り続ける理由を外部需要だけに置かない。

自分用の車輪として成立しているなら、ユーザーは最低一人いる。

### 6.4 Community contact should ask past behavior, not opinions

将来、書き手に話を聞く場合は、意見ではなく過去の行動を聞く。

避けたい質問:

- あったら便利ですか
- こういう機能は欲しいですか
- AIで整合性チェックしたいですか

有効な質問:

- 普段なにで下書きしているか
- 投稿サイトへどう流し込んでいるか
- 改行や空行が崩れて直した経験があるか
- 呼称の変化を実際にどう管理しているか
- 誤表記リストを作ったことがあるか
- 用語統一で困ったときに何をしたか

未来の希望より、過去の行動のほうが設計入力として強い。

---

## 7. Roadmap impact

この観察メモは、直近 Phase 4 の順序を変更しない。

Phase 4:

- Application menu
- Basic shortcuts
- Context menu
- Command tab / command launcher
- Tab close
- About
- command-first foundation

この順序は維持する。

ただし、以下は中長期候補として roadmap / issue backlog / ADR 候補に残す価値がある。

### Near-term or dogfood candidates

- Dogfood glossary seed script
- High-frequency decoration suppression
- Entry-level decoration ON/OFF
- Glossary pane list boundary
- AI-ready glossary export
- Erroneous forms

### Mid-term candidates

- Katakana variant detection via normalized keys
- Japanese punctuation linter
- Manuscript newline semantics
- Ruby internal model and output profiles
- Form scope for names / aliases / honorifics

### Long-term candidates

- Time × entity × attribute model
- Knowledge scope tracking
- Relationship state tracking
- Character emotional state tracking
- Reader disclosure tracking
- Scene / chapter state timeline

---

## 8. Open questions

### 8.1 How much scope should glossary_forms own?

Potential future fields:

- validity
- warning policy
- speaker scope
- chapter scope
- time range
- note
- normalized key

Risk:

- glossary_forms may become too large and ambiguous
- stateful information may deserve a separate model
- adding columns is easy, but UI and mental model may become hard

### 8.2 Where should manuscript newline semantics live?

Potential locations:

- editor setting
- project setting
- export profile
- document metadata
- ADR

This should not be mixed with physical line ending preservation.

### 8.3 How aggressive should hover / warning be?

The answer may depend on writing phase.

Possible modes:

- drafting
- revision
- proofreading
- export validation

### 8.4 Should AI-ready export be a product feature or a dev tool first?

A minimal custom terms export may be cheap and useful.
A full external-tool integration should wait.

---

## 9. Summary

The strongest conclusion from these observations is:

Pergamum should not compete as an AI writing generator.

Pergamum should instead become a work-specific canon editor that keeps manuscript text as the source of truth, connects glossary and structured story data to the text at runtime, and exports that canon for humans, linters, and AI tools when needed.

The core empty seat is:

- text and settings connected at runtime
- work-specific canon instead of general language correction
- deterministic checks before LLM checks
- time-dependent story state as a future extension

This supports the existing direction of Pergamum.

Phase 4 remains command-first.
The observations mainly affect dogfood tooling, glossary evolution, linter candidates, export profiles, and v1.x story-state features.
