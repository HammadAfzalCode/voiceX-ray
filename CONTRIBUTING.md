# Contributing to Voice X-Ray

Thank you for your interest in contributing. This document covers commit conventions, PR workflow, and how to add new tools or adapters.

## Development setup

```bash
git clone https://github.com/your-org/voice-x-ray.git
cd voice-x-ray
npm install
cp .env.example .env   # fill in API keys
```

Run the backend and frontend in separate terminals:

```bash
npm run dev --workspace=backend
npm run dev --workspace=frontend
```

## Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint.

```
<type>(<scope>): <description>

feat(backend): add Spotify tool
fix(frontend): prevent barge-in storm on rapid interim events
docs: update README quick-start
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `ci`, `deps`, `chore`

**Scopes:** `backend`, `frontend`, `domain`, `infra`, `ws`, `deploy`, `ci`, `docs`

Commits that don't follow the convention will be rejected by the `commit-msg` hook.

## Pull requests

- One logical change per PR.
- Reference any related issue: `Closes #123`.
- Fill in the PR template — summary bullets and a test plan.
- Ensure `npm run lint:backend`, `npm run lint:frontend`, `npm run typecheck:backend`, `npm run typecheck:frontend`, and `npm test` all pass before requesting review.

## Adding a new tool

1. Create `backend/src/infrastructure/tools/<name>.tool.ts` with a `ToolSpec` export.
2. Register it in `backend/src/infrastructure/tools/tool-registry.ts` (add to `ALL_SPECS` and `HANDLER_MAP`).
3. Write a unit test in `backend/src/infrastructure/tools/<name>.tool.spec.ts`.
4. Document the tool in the `README.md` "Adding Tools" section if behaviour is non-obvious.

## Adding a new LLM or TTS adapter

Implement the port interface in `backend/src/domain/ports/` and register the adapter in `backend/src/app.module.ts` by swapping the DI token binding.

## Code style

- Strict TypeScript — no `any`, no `@ts-ignore`.
- ESLint + `@typescript-eslint` rules are enforced via CI.
- No unnecessary comments — name your variables well instead.
- Tests live next to the code they test (`*.spec.ts`).

## Releasing

Releases are cut by pushing a semver tag:

```bash
git tag v1.2.3
git push origin v1.2.3
```

The `release` workflow builds and pushes Docker images to GHCR and creates a GitHub release with auto-generated notes.
