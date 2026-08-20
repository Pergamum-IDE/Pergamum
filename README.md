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

Pergamum は現在も開発初期ですが、Markdown 原稿と Glossary を結びつけるための基盤は動き始めています。

現在は、主に以下のことができます。

| 分類 | できること |
| -- | -- |
| Project | Markdown プロジェクトを開く |
| Editor | Markdown 本文を編集する |
| Preview | Markdown Preview を表示する |
| Glossary | Glossary entry を作成・編集・削除する |
| Glossary | Glossary form を管理する |
| Glossary | Glossary match を Preview 上に装飾する |
| Glossary | Glossary match の Hover Card を表示する |
| Glossary | Glossary entry から本文中の使用箇所へ移動する |
| Glossary | Glossary navigator で entry を探す |
| Glossary | Glossary occurrences tab で使用箇所を確認する |
| Workbench | Navigator / Editor / Preview のペインを扱う |
| Workbench | Sidebar を折りたたむ |
| Utility Window | 支援ウィンドウを開く |
| Debug | Debug mode JSONL log を出力する |
| Debug | Debug Log tab でログを確認する |
| Persistence | SQLite に構造化プロジェクトデータを保存する |

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

## 現在の制限

Pergamum は現在も開発初期です。

日常的に dogfood しながら開発していますが、まだ一般利用向けの安定版ではありません。

現時点では、主に以下の制限があります。

| 分類 | 現在の制限 |
| -- | -- |
| File format | 開ける原稿ファイルは `*.md` のみです |
| File format | `*.txt` やその他のテキストファイルは未対応です |
| Encoding | UTF-8 のみ対応しています |
| Encoding | Shift_JIS / EUC-JP / UTF-16 など、UTF-8 以外の文字コードは未対応です |
| Editor tabs | 複数の文書をタブで開くことはできます |
| Editor tabs | ただし、開いたタブを UI から閉じる操作はまだ未実装です |
| Glossary database | Glossary / project database の schema は開発中です |
| Glossary database | 今後の変更で破壊的変更が入る可能性があります |
| Compatibility | 現時点では、永続的な DB 互換性を保証しません |

特に `pergamum.db` は、現在の Pergamum における構造化データの正本です。

その一方で、Glossary model や project data model はまだ安定版ではありません。

そのため、開発初期の段階では、古い `pergamum.db` が将来のバージョンでそのまま使えなくなる可能性があります。

重要な原稿や Glossary を扱う場合は、作業ディレクトリ全体を Git や通常のバックアップで管理してください。

本文 Markdown は、人間が読める通常の UTF-8 Markdown ファイルとして保存します。

一方、Glossary や project metadata については、v0.90.0 までは互換性よりもデータモデルの正しさを優先して変更する場合があります。

---

## 現在開発中のこと

現在は Phase 4「迷わず触れるようにする」の後半です。

Phase 3 では、本文を書く場と周辺作業の場を分離し、Glossary / Navigation / Utility Window / Debug logging / Runtime baseline の基礎を整えました。

Phase 4 では、後続機能を無理なく積み上げるために、操作入口を整理しています。

```text
Command:
  操作の意味

Menu:
  見つけられる入口

Shortcut:
  速く呼ぶ入口

Context menu:
  対象に応じた入口

Command Palette / Command UI:
  操作を探して実行する入口
```

直近の主な開発テーマは以下です。

| 分類 | 開発テーマ |
| -- | -- |
| Command infrastructure | アプリ内の操作を Command Registry に寄せる |
| Command Palette | 操作を検索して実行できる入口を整える |
| Application menu | 日常操作をメニューから辿れるようにする |
| Shortcut | 基本操作をキーボードから呼べるようにする |
| Context menu | 選択中の対象に応じた操作入口を整える |
| Debug logging | dogfood や不具合解析のため、実ユーザー経路の観測を強化する |

Phase 4 の目的は、単にメニューやショートカットを増やすことではありません。

Pergamum の操作を command として整理し、menu / shortcut / context menu / Command Palette から同じ意味の操作を呼べるようにすることです。

これにより、今後の Glossary 操作、Editor 補助表示、検索、設定、出力などを、ばらばらの UI 実装ではなく、一貫した操作体系の上に載せられるようにします。

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
- [ADR-0005: Command Domain Taxonomy](./docs/adr/0005-command-domain-taxonomy.md)

実装より先に設計を決めることもあります。

あとで安く直せるコードより、あとで高くつくデータ構造を先に決めたいからです。

---

## ロードマップ

Pergamum の開発ロードマップは以下に整理しています。

- [Pergamum ロードマップ](./docs/roadmap.md)

実装スコープの正本は GitHub Issue です。

ロードマップは、方向性・優先順位・保留事項を見失わないための地図として扱います。

現在は Phase 4「迷わず触れるようにする」の後半です。

大きな流れは以下です。

```text
Phase 4:
  迷わず触れるようにする

Phase 5:
  触りすぎないようにする

Phase 6:
  閉じても戻れるようにする

Phase 7:
  プロジェクトを歩けるようにする

Phase 8:
  他人の手に渡せるようにする

v0.90.0:
  毎日開けるようにする
```

各 Phase の詳細は `roadmap.md` を参照してください。

---

## ライセンス

Pergamum は MIT ライセンスで公開しています。
