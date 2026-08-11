# ADR-0001: Project Persistence Architecture

**Status:** Accepted

**Date:** 2026-08-11

---

## Context

Pergamum は Markdown エディタではなく、**Novel IDE** である。

Markdown は原稿本文の保存形式として採用しているが、Pergamum が管理する情報は本文だけではない。

将来的に Pergamum は以下の情報を管理する。

- Glossary
- Characters
- Organizations
- Places
- Timeline
- Occurrences
- AI Context
- Assets
- Project Metadata

これらは本文とは異なる構造化データであり、Markdown に埋め込むことは適切ではない。

一方、作家は Git 等によるバージョン管理を行う可能性がある。

また、長期間にわたる執筆では、データ破損からの復旧手段も重要となる。

Project Persistence の基本方針をここで定義する。

---

## Decision

### 1. Manuscript

原稿本文は Markdown ファイルとして保存する。

Markdown は Pergamum の内部形式ではなく、原稿データの保存形式である。

Pergamum は Markdown ファイルを直接編集対象とする。

---

### 2. Project Configuration

プロジェクト設定は

```text
pergamum.json
```

に保存する。

ここにはプロジェクト全体の設定のみを保持する。

構造化データは保持しない。

---

### 3. Structured Project Data

構造化データは

```text
pergamum.db
```

へ保存する。

SQLite を Project Database として採用する。

`pergamum.db` は Project に属する構造化データの**正本（Canonical Source）**とする。

将来的に以下の情報を格納する。

- Glossary
- Characters
- Organizations
- Places
- Timeline
- Occurrences
- Asset Metadata
- その他の構造化データ

SQLite は Project Database として利用し、アプリケーション内部の実装詳細ではなく、Project の構成要素として扱う。

---

### 4. Binary Assets

画像、PDF、音声などのバイナリアセットはデータベースへ保存しない。

実ファイルは Project ディレクトリ内へ保存する。

例

```text
project/
├── assets/
│   ├── images/
│   ├── audio/
│   └── reference/
```

SQLite には

- Relative Path
- Title
- Tags
- Description
- 関連情報

などのメタデータのみ保持する。

Pergamum は Asset File を管理するのではなく、Asset Metadata を管理する。

---

### 5. JSON Snapshots

SQLite は Project Database の正本とする。

一方で、

- Git による差分確認
- AI への入力
- デバッグ
- 災害復旧

を考慮し、SQLite の内容を JSON としてエクスポート可能な構造を採用する。

JSON は**バックアップおよび交換形式**であり、正本ではない。

通常動作では JSON を読み込まない。

JSON Snapshot は SQLite の内容から生成される派生データである。

Snapshot の生成タイミングや配置場所は別 ADR にて定義する。

---

### 6. Filesystem Responsibilities

Project は以下の責務を持つ。

```text
Project
│
├── Markdown
│
├── SQLite Database
│
├── Assets
│
└── Configuration
```

各要素は明確に責務を分離する。

Markdown は構造化データを保持しない。

SQLite は本文を保持しない。

Asset は Filesystem 上で管理する。

---

### 7. Access Model

Renderer は Filesystem や SQLite へ直接アクセスしない。

アクセスは

```text
Renderer

↓

Preload

↓

Main Process

↓

Project Database
```

の責務を維持する。

Electron Security Model

- contextIsolation = true
- sandbox = true
- nodeIntegration = false

を継続する。

---

## Consequences

本 ADR により Pergamum は以下の構成を採用する。

```text
Project
│
├── pergamum.json
├── pergamum.db
├── manuscript/
├── assets/
└── ...
```

これにより

- Markdown は人間が読みやすく保守しやすい
- 構造化データは SQLite により高速・安全に管理できる
- Asset は通常の画像編集ソフト等から直接利用できる
- 将来的な Knowledge Base の拡張が容易になる
- AI やエクスポート機能との連携を容易にできる

---

## Alternatives Considered

### JSON を正本とする

却下。

データ量およびリレーションの増加に伴い管理が複雑になる。

全文書検索や関連情報取得にも適さない。

---

### SQLite に Binary Asset を格納する

却下。

Git との親和性が低く、画像編集ソフトとの連携も悪化する。

Asset は Filesystem 上に保持する方が自然である。

---

### Markdown Front Matter に構造化情報を保持する

却下。

本文と Knowledge Base が密結合となり、長期的な拡張性を損なう。

Pergamum は Markdown エディタではなく Novel IDE である。

---

## Future Work

本 ADR は永続化アーキテクチャのみを定義する。

以下は別 ADR または個別 Issue にて定義する。

- Database Schema
- Migration Strategy
- Snapshot Generation
- Snapshot Recovery
- Asset Management
- Knowledge Base Schema
- Plugin Data Storage
- AI Context Storage
