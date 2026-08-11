# Pergamum

Pergamum is an open-source IDE for novelists.

Pergamum is not merely a Markdown editor.
It is a project-oriented IDE for novel production.

## Principles

- Markdown is the source of truth.
- Keep the architecture simple.
- Prefer readability over cleverness.
- Do not introduce unnecessary dependencies.
- Do not implement future features early.
- Keep each Issue small and focused.
- Architecture first, features second.
- Use Electron security best practices.
- Renderer must not access Node.js directly.
- Filesystem access must go through the preload/Main Process boundary.

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

Implementation begins after Architect review and approval.

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

Extract substantial UI components and document-specific behavior when doing so improves responsibility boundaries.

Do not introduce Redux, Zustand, or another global state-management library unless an Issue requires it or the Architect approves it.

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

Do not introduce a complex filesystem tree model before an Issue actually requires one.

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
