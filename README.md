# arcade

Monorepo for browser 3D games built on a shared Three.js + ECS engine.

## Structure

```
packages/engine/          @arcade/engine   — Three.js renderer, ECS (miniplex), input, assets
games/conveyor-puzzle/    @arcade/conveyor-puzzle — Stage-1 game
```

## Development

```bash
pnpm install
pnpm dev          # starts conveyor-puzzle dev server
pnpm test         # run all tests
pnpm lint         # lint all packages
pnpm typecheck    # type-check all packages
pnpm build        # build all packages
```

## Architecture

- **ECS**: entities are plain data; systems are pure functions. Domain logic has no `three` dependency.
- **Rendering boundary**: only `@arcade/engine` imports `three`. ESLint enforces this.
- **CI**: lint + typecheck + test + build run on every PR via GitHub Actions.
- **Commits**: conventional commit format enforced by commitlint + husky.
