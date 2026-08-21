# Pergamum

Pergamum is an open-source IDE for novelists.

Pergamum is not merely a Markdown editor.  
It is a project-oriented IDE for novel production.

## Principles

- Markdown is the source of truth for manuscript content.
- `pergamum.db` is the source of truth for structured project data.
- `pergamum.json` is the source of truth for project configuration.
- Serialized snapshots are derived deterministic representations, not authoritative data while the database is available.
- Keep the architecture simple.
- Prefer readability over cleverness.
- Do not introduce unnecessary dependencies.
- Do not implement future features early.
- Keep each Issue small and focused.
- Architecture first, features second.
- Use Electron security best practices.
- Renderer must not access Node.js directly.
- Filesystem access from the Renderer must go through the Preload/Main Process boundary.

## Stack

- Electron
- TypeScript
- React
- Vite
- CodeMirror 6

## Development Roles

Pergamum development uses three roles.

- Product Owner: User
  - Defines product vision, Issues, scope, and priorities.
- Architect: ChatGPT
  - Reviews architecture, APIs, scope, and maintainability.
- Implementation: Codex
  - Implements code, refactoring, tests, and CI fixes.

Codex must not silently make product or architectural decisions that materially change the Issue scope.

## Issue Workflow

Development follows GitHub Flow:

Issue  
→ feature branch  
→ implementation  
→ commit  
→ push  
→ Pull Request  
→ CI  
→ merge  
→ Issue close

Feature branch naming:

`feature/<issue-number>-<short-name>`

## Git Workflow

Unless the user explicitly instructs otherwise, all implementation work must be performed on a feature branch.

Before modifying any files:

1. Determine the current Issue number.
2. Propose the expected feature branch name.
3. Verify that the current branch matches the expected feature branch.

Example branch:

`feature/<issue-number>-<short-name>`

Example workflow:

```bash
git switch main
git pull origin main
git switch -c feature/<issue-number>-<short-name>
```

When beginning implementation of an Issue, always remind the user of the expected feature branch before editing any files.

Example:

> Expected feature branch: `feature/8-file-explorer`

If the current branch is not the expected feature branch, stop implementation and ask the user to switch branches before continuing.

If implementation has already started on the wrong branch but has not yet been committed, recommend creating the feature branch immediately:

```bash
git switch -c feature/<issue-number>-<short-name>
```

This safely preserves all uncommitted work on the new feature branch.

Never commit implementation work directly to `main` unless the user explicitly requests it.

Never create commits or Pull Requests until implementation is complete and has been reviewed.

## Before Implementing an Issue

Unless the user explicitly instructs otherwise, do not modify files immediately when asked to implement an Issue.

First:

1. Read the Issue completely.
2. Inspect the current relevant architecture and implementation.
3. Identify the files expected to change.
4. Propose an implementation plan.
5. Identify architectural concerns and possible scope violations.
6. Do not modify files yet.

Report the following:

- Current relevant architecture
- Files expected to change
- Proposed design or state model where applicable
- Proposed data flow where applicable
- Implementation steps
- Architectural concerns

The implementation plan and architectural review should be written in Japanese by default.

Implementation begins only after Architect review and approval.

## Communication

Communicate with the user in Japanese by default.

Implementation plans, architectural notes, status reports, and explanations should be written in Japanese unless the user explicitly requests another language.

Source code, identifiers, API names, commit messages, and established technical terminology may remain in English.

## Scope Control

Treat the GitHub Issue as the source of truth for implementation scope.

Respect:

- Goal
- Tasks
- Acceptance criteria
- Out of scope

Do not implement features listed as out of scope.

If satisfying the Issue appears to require an out-of-scope feature or significant architectural change, report the concern before implementing it.

Prefer the smallest clean implementation that satisfies the current Issue.

## Electron Architecture

Maintain this security boundary:

Renderer  
→ Preload  
→ Main Process

Do not weaken the Electron security configuration without explicit Architect approval.

Expected security settings:

- `contextIsolation = true`
- `sandbox = true`
- `nodeIntegration = false`

IPC should be separated by responsibility.

Examples:

- fileIpc
- projectIpc
- future gitIpc
- future glossaryIpc
- future pluginIpc

Avoid catch-all IPC modules.

## Renderer Architecture

Avoid turning `App.tsx` into a God component.

`App.tsx` may coordinate application-level state and data flow.

Extract substantial UI components and document-specific behavior whenever doing so improves separation of responsibilities.

Do not introduce Redux, Zustand, or another global state-management library unless an Issue explicitly requires it or the Architect approves it.

## Document Architecture

Project state and active document state are separate concepts.

Current architecture:

Project  
→ Documents[]  
→ CurrentDocument  
→ Editor

The expected future direction includes multi-tab editing:

Project  
→ Documents[]  
→ OpenDocuments[]  
→ CurrentDocument  
→ Editor

Do not implement `OpenDocuments[]`, tabs, or other multi-document state until an Issue explicitly requires them.

Current implementations should not unnecessarily prevent that future evolution.

## File Explorer

The File Explorer is navigation UI.

It must not own or duplicate editor document content.

It selects a document through the application's existing document-state flow.

Do not introduce a complex filesystem tree model before an Issue explicitly requires one.

## GUI / Platform UI Guidelines

GUIを実装・変更する場合は、対象プラットフォームのUI規約とアクセシビリティ上の期待を確認すること。

特にダイアログ、ボタン配置、default action、cancel action、destructive action、Enter/Escapeの挙動、キーボードショートカット、アイコンの向き、RTL（Right-to-Left）/ writing direction の影響を受けるレイアウトでは、実装前にOS固有・言語方向固有の注意点をリストアップすること。

macOSについては、必要に応じて Apple Human Interface Guidelines / AppKit の慣例を確認し、単純な左右反転や caller-provided order の流用で済ませないこと。

RTL / writing direction に影響されるCSSでは、可能な限り `left` / `right` / `margin-left` / `margin-right` などの物理方向指定を避け、`inline` / `block` 系の logical properties を優先すること。

OS固有のUI規約に従わない判断をする場合は、その理由をIssueまたはPR本文に明記すること。

## Renderer Direction

Pergamum is expected to eventually support multiple rendering targets, including:

- Markdown
- Kakuyomu
- Narou
- AlphaPolis
- Vertical writing

Do not implement renderer abstraction or target-specific behavior before the corresponding Issue.

Avoid unnecessary architectural assumptions that would make future renderers difficult to introduce.

## Validation

After implementation, run the relevant project checks.

At minimum when applicable:

- `npm run typecheck`
- `npm run build`

Use `npm ci` when a clean dependency installation or CI reproduction is needed.

Clearly report which checks were run and whether they passed.
