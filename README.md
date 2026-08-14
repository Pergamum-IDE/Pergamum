# Pergamum

[日本語](./README.md) | [English](./README.en.md)

Pergamum（ペルガモン）は、**小説を書く人のためのオープンソース統合執筆環境**です。

MIT ライセンスで公開しているフリーソフトウェアです。

ただし、単なる Markdown エディタを作ろうとしているわけではありません。

小説を書いていると、本文とは別に大量の情報が発生します。

人物名。地名。組織名。固有名詞。別称。表記揺れ。時系列。人物同士の関係。ある出来事がいつ起きたのか。ある人物がその時点で何を知っていたのか。

作品が長くなるほど、それらを作者の記憶だけで維持することは難しくなります。

Pergamum は、**本文を書く場所と、作品世界について作者が知っていることを管理する場所を分け、その両方をひとつの執筆環境として扱う**ことを目指しています。

なお、Pergamum は現在まだ開発初期です。ここで述べている構想のすべてが実装済みというわけではありません。

ちなみに Pergamum とは、現在のトルコ西部にあった古代ギリシャ都市の名前です。アレクサンドリア図書館に匹敵する大図書館を擁し、羊皮紙（parchment）の語源にもなりました。

---

## なぜ作るのか

小説そのものは、ただの文章です。

だから本文は Markdown でいい。

一方で、

> この人物にはどんな別名があるのか
> この表記は単なる揺れなのか、それとも意図した別称なのか
> この出来事は何年何月に起きたのか
> この人物はこの場面の時点で、その事実を知っていたのか

といった情報は、文章だけでは扱いにくいものです。

そこを無理に Markdown へ埋め込むのではなく、構造化されたデータとして別に持たせます。

Pergamum では、現在その役割を次のように分けています。

```text
Markdown
  原稿本文の正本

pergamum.db
  人物・用語・地名・組織・概念など
  構造化された作品情報の正本

pergamum.json
  プロジェクト設定

Assets
  画像などのバイナリデータ
```

本文をデータベースの都合に合わせることもしないし、構造化情報を Markdown の中へ押し込むこともしません。

それぞれを、一番扱いやすい場所に置きます。

---

## Pergamum が大事にしていること

Pergamum が最終的にやりたいのは、作者の代わりに小説を書くことではありません。

**作者が既に決めたことを忘れないための道具**を作ることです。

Pergamum は、本文を勝手に書き換えません。

特に日本語テキスト処理では、正規化・表記統一・補完・推測を安易に行いません。

```text
やらないこと:
  Unicode 正規化による本文変更
  表記揺れの自動修正
  中黒の自動挿入・削除
  三点リーダーやダッシュの自動整形
  Glossary alias の自動追加
  曖昧一致の自動解決
```

作者が明示的に選んだ場合だけ、補助機能として作用します。

Pergamum の UI は、本文を書く場を守ります。

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

探す・辿る・診断する・出力する・ログを確認する作業は、本文領域ではなく、周辺 UI に逃がします。

---

## Glossary とは

Pergamum では、作品内の人物・地名・組織・用語・概念などを Glossary として管理します。

たとえば、織田信長に関係する語として、

```text
織田信長
吉法師
信長
お館さま
茶筅髷
```

という文字列が本文中に現れたとします。

このうち、

```text
織田信長:
  人物そのものの表記

吉法師:
  幼名

信長:
  略称

お館さま:
  立場に応じた呼称

茶筅髷:
  髪型
```

として、文脈によって扱いが異なります。

`吉法師` や `お館さま` は同じ人物を指すことがあります。
一方、`茶筅髷` は人物ではなく髪型を表す語であり、同じ実体ではありません。

Pergamum では、単に似た文脈に現れるからといって、文字列を勝手に同じ実体へまとめません。

さらに、同じ人物を指す文字列であっても、その意味は同じではありません。

Pergamum では、こうした情報を単なる文字列の一覧ではなく、独立した軸として扱います。

```text
Entry:
  人物 / 地名 / 組織 / 用語 / 概念などの実体

Form:
  正規表記 / 別称 / 異表記などの表層形

Warning policy:
  警告するか、無視するかなどの方針

Boundary policy:
  本文中のどの範囲を一致として扱うか
```

また、同じ表層形が複数の実体を指すことも許します。

「武将」という語が複数の人物を指し得るなら、Pergamum は勝手に一人を選びません。

**曖昧なら、曖昧であると報告する。**

これは Pergamum の重要な設計原則です。

---

## 現在できること

Pergamum は現在も開発初期ですが、以下の基盤が実装されています。

```text
Markdown プロジェクトを開く
Markdown 本文を編集する
Markdown Preview を表示する
Glossary entry を作成・編集する
Glossary form を管理する
Glossary match を Preview 上に装飾する
Glossary match の Hover Card を表示する
Glossary entry から本文中の使用箇所へ移動する
SQLite に構造化プロジェクトデータを保存する
```

Glossary については、以下のような経路で Renderer から Project Database へアクセスします。

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

現在の Glossary model では、Entry と Form を分離しています。

```text
Entry:
  作品世界上の実体

Form:
  本文中に現れる文字列
```

Form には、canonical / alias / variant のような役割を持たせることができます。

また、Glossary matching では boundary policy を扱います。

たとえば、`メイド` という surface がある場合、

```text
メイドさん
オーダーメイド
```

の両方に単純一致してしまうと誤検出が起きます。

そのため Pergamum では、Glossary form ごとに一致範囲の境界を調整できます。

```text
一致開始側の境界:
  自動 / 厳密 / なし

一致終了側の境界:
  自動 / 厳密 / なし
```

内部値は以下です。

```text
auto
strict
none
```

この設定により、作者が必要な場合だけ、form 単位で matching の挙動を調整できます。

---

## 現在開発中のこと

現在は Phase 3「つながりすぎないようにする」の後半に入っています。

Phase 3 前半では、Glossary matching の boundary resolver と、form ごとの matching boundary UI を整備しました。

Phase 3 後半では、本文を書く場と、周辺作業の場を分離していきます。

直近の主な開発テーマは以下です。

```text
Workbench layout:
  Navigator / Editor / Preview のペインを扱いやすくする

Sidebar collapse:
  左 Navigator を折りたたんで本文領域を広く使えるようにする

Utility Window / 支援ウィンドウ:
  使用箇所、検索、診断、出力、ログなどを受け止める下部ペイン

Occurrences tab:
  Glossary entry の使用箇所を連続して辿るための UI

Debug mode JSONL logging:
  dogfood や不具合解析のためのデバッグログ基盤
```

特に、Glossary occurrence navigation は技術経路としては実装済みですが、現在は Glossary Editor から使用箇所へ移動すると Markdown Editor へ画面が切り替わります。

そのため、連続して使用箇所を辿る UX にはまだ改善余地があります。

この問題に対して、将来的には支援ウィンドウ上の Occurrences tab で操作を継続できるようにする予定です。

---

## データを失わないために

小説は、作者が何十時間、何百時間とかけて作るデータです。

そのため Pergamum では、構造化情報についても「壊れたら作り直せばいい」とは考えていません。

`pergamum.db` を構造化データの正本としつつ、将来的には Git で差分を確認でき、人間にも読める決定論的な snapshot を生成する予定です。

snapshot は第二の正本にはしません。

正本を二つ作ると、どちらが正しいのかという問題が必ず発生するからです。

その代わり、以下のような一方向の関係にします。

```text
pergamum.db
  ↓
deterministic snapshot
  ↓
Git / backup / external tools
```

snapshot から復元するときは、現在の DB を退避し、snapshot 全体を検証したうえで、トランザクションを用いてデータベースを再構築する方針です。

まだ実装されていませんが、これは既にアーキテクチャ上の原則として決定しています。

---

## AI について

Pergamum の開発では、設計レビューや実装支援に生成 AI を活用しています。

一方、現時点の Pergamum 本体には、作者の原稿を生成 AI へ送信したり、AI に小説本文を書かせたりする機能はありません。

AI は開発プロセスを支援するために利用しており、作者の創作そのものを置き換えることは目的としていません。

---

## インストール

Pergamum は現在開発中であり、一般利用向けの配布物はまだありません。

現時点では、ソースコードから開発環境を構築して試すことができます。

開発には Node.js 24 LTS を使用します。

```bash
npm install
npm run dev
```

開発時によく使う検証コマンドは以下です。

```bash
npm run typecheck
npm test
npm run build
```

---

## 設計について

Pergamum では、大きな設計判断を ADR（Architecture Decision Record）として残しています。

コードだけを見ると、

> なぜ UUIDv7 なのか
> なぜ Glossary の表記を別テーブルにしたのか
> なぜ SQLite が正本なのか
> なぜ snapshot を正本にしないのか
> なぜ Command / Navigation / Editor identity を分けるのか

といった理由は時間とともに失われます。

そのため、「何を採用したか」だけでなく、**何を検討し、なぜ採用しなかったのか**もできるだけ記録しています。

現在の主要な ADR:

- [ADR-0001: Project Persistence Architecture](./docs/adr/0001-project-persistence-architecture.md)
- [ADR-0002: Structured Project Data and Glossary Model](./docs/adr/0002-structured-project-data-and-glossary-model.md)
- [ADR-0003: UI Interaction Architecture](./docs/adr/0003-ui-interaction-architecture.md)
- [ADR-0004: Manuscript Non-Destructive Policy](./docs/adr/0004-manuscript-non-destructive-policy.md)

実装より先に設計を決めることもあります。

あとで安く直せるコードより、あとで高くつくデータ構造を先に決めたいからです。

---

## ロードマップ

Pergamum の開発ロードマップは以下に整理しています。

- [Pergamum ロードマップ](./docs/roadmap.md)

実装スコープの正本は GitHub Issue です。
ロードマップは、方向性・優先順位・保留事項を見失わないための地図として扱います。

---

## ライセンス

Pergamum は MIT ライセンスで公開しています。
