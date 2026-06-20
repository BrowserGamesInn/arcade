# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Task Workflow (start here for any new task)

When starting work on **any new task**, follow this sequence:

1. **Create todos as issues in GitHub Projects first** — break the work into discrete issues/cards before any implementation.
2. **Take one issue at a time** — pick a single issue, then plan toward its implementation before coding.
3. **Work in vertical slices** — each issue/increment cuts through the full stack (end-to-end feature value), not horizontal layers.

Do not begin coding across multiple concerns at once.

## Monorepo Structure

- `packages/engine` → `@arcade/engine`: Three.js renderer, ECS (Miniplex), input, asset management
- `games/conveyor-puzzle` → `@arcade/conveyor-puzzle`: Stage-1 game consuming the engine

Package manager: **pnpm 11.8.0**. Task runner: **Turbo**. Node version: **25.9.0** (see `.nvmrc`).

## Commands

```
pnpm dev          # start conveyor-puzzle dev server (Vite, hot reload)
pnpm build        # turbo build across all packages
pnpm test         # vitest across all packages
pnpm lint         # eslint across all packages
pnpm typecheck    # tsc --noEmit across all packages
```

## Architecture Rule: Three.js Import Boundary

**Game packages must never import `three` directly.** All Three.js usage must go through `@arcade/engine`'s public API. ESLint (`no-restricted-imports`) enforces this at lint time.

```ts
// ✗ BAD — in games/
import * as THREE from 'three';

// ✓ GOOD — use engine exports
import { createRenderer } from '@arcade/engine';
```

## TypeScript Conventions

- **Strict mode** is on (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`).
- Intentionally unused parameters must be prefixed with `_` (e.g., `_dt`, `_event`) to satisfy the linter.

## Code Style

Prettier is configured (`.prettierrc.json`): single quotes, semi-colons, trailing commas, print width 100, 2-space indent. ESLint flat config (`eslint.config.js`) disables style rules that conflict with Prettier.

## Commit Conventions

**Conventional commits are enforced** via Husky + commitlint. Format: `type(scope): message`

Examples: `feat(conveyor-puzzle): add audio system`, `fix(engine): correct sink detection`

Husky also runs `pnpm test` as a pre-commit hook — commits will fail if tests don't pass.

## Workspace Dependencies

Conveyor-puzzle depends on engine via `workspace:*`. No need to publish or link manually — Turbo and pnpm handle this. Use `pnpm install` at the repo root to wire everything up.
