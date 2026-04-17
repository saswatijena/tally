# Splitwise Clone — Claude Code Instructions

## Project Overview
A Splitwise replica with core features: groups, expenses, and balance calculations.

## Tech Stack
- **Backend**: Node.js 20 + Express
- **Frontend**: React 18 + Vite
- **Database**: PostgreSQL 15
- **ORM**: Drizzle ORM (type-safe, schema-first)
- **Auth**: JWT (access token 15min + refresh token 7d)
- **Testing**: Vitest + Supertest (backend), Vitest + React Testing Library (frontend)
- **Validation**: Zod (shared schemas between frontend and backend)

## Repository Structure
```
splitwise-clone/
├── CLAUDE.md
├── DESIGN_TEMPLATE.md
├── .github/
│   └── workflows/
│       ├── claude-build.yml       # autonomous build trigger
│       └── claude-pr-review.yml   # auto-review on PR open
├── packages/
│   ├── shared/                    # shared Zod schemas + types
│   ├── backend/                   # Express API
│   │   ├── src/
│   │   │   ├── db/                # Drizzle schema + migrations
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   └── tests/
│   └── frontend/                  # React + Vite
│       ├── src/
│       │   ├── api/
│       │   ├── components/
│       │   ├── pages/
│       │   └── hooks/
│       └── tests/
├── docker-compose.yml             # local postgres
└── package.json                   # workspace root
```

## Code Conventions

### General
- TypeScript everywhere. Strict mode on. No `any`.
- Conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`
- Branch naming: `feature/<issue-number>-short-description`
- All errors must be typed and handled explicitly — no silent catches.

### Backend
- Routes are thin: validate input (Zod), call service, return response.
- Services contain all business logic and DB queries.
- Every route must have a corresponding integration test via Supertest.
- Use database transactions for any operation that touches multiple tables.
- HTTP status codes must be semantically correct (201 for creates, 204 for deletes, etc.)

### Frontend
- Functional components only. Hooks for all state and side effects.
- API calls live in `src/api/` — never call fetch directly from components.
- Every component must have at least a smoke test (renders without crashing).

### Database
- All schema changes via Drizzle migrations — never raw ALTER TABLE in tests or seeds.
- Use `snake_case` for column names.
- Every table needs `created_at` and `updated_at` timestamps.
- Soft deletes via `deleted_at` nullable timestamp — never hard delete.

### Testing Requirements
- **Minimum 80% coverage** on backend services.
- Integration tests must use a real test database (see docker-compose).
- Tests must be isolated: each test suite seeds its own data and tears down.
- No mocking the database in integration tests.

## Balance Calculation Rules (critical domain logic)
These rules must be encoded precisely:
1. When an expense is added, splits are recorded in `expense_splits` (one row per participant).
2. A "balance" between user A and B is: `sum(what A paid that B owes) - sum(what B paid that A owes)`.
3. Balance simplification: reduce N-person debts to minimum transactions (greedy algorithm).
4. Settlements create a special `expense` record with `type = 'settlement'` — they are not split further.
5. Balances are always calculated fresh from the ledger — never stored as a cached balance column.

## Autonomous Workflow — HOW CLAUDE MUST BEHAVE

### Step 1: Task breakdown (triggered by new Issue)
When assigned to an Issue, Claude must:
1. Read the issue carefully.
2. Post a comment with a numbered task list (each task = one PR).
3. For each task, write: task name, acceptance criteria (bullet list), estimated complexity (S/M/L).
4. Add the label `awaiting-approval` to the Issue.
5. **STOP. Do not proceed until the human replies with approval.**

### Step 2: Design (after task approval)
For each task, Claude must:
1. Create a file `docs/designs/<issue-number>-<task-slug>.md` using DESIGN_TEMPLATE.md.
2. The design must cover: API contract, DB schema changes, service layer logic, test plan.
3. Open a draft PR titled `[DESIGN] <task name>` with only the design doc.
4. Add the label `awaiting-approval`.
5. **STOP. Do not write any implementation code until the human approves the design.**

### Step 3: Implementation (after design approval)
After the human comments approval on the design PR:
1. Convert the draft PR to a real branch.
2. Implement exactly what the design describes — no scope creep.
3. Write tests first (TDD): write failing tests, then make them pass.
4. Run `npm test` and `npm run lint` — both must pass before opening the PR.
5. Open a PR with the description filled out per the PR template below.
6. **Do NOT merge** — post the PR and wait for review.

### Step 4: Self-review (automatic via GitHub Action)
The `claude-pr-review.yml` workflow triggers automatically. Claude will:
1. Review its own PR for: correctness, test coverage, adherence to conventions, security issues.
2. Post a structured review comment.
3. If issues found: push fixes on the same branch.
4. If no issues: approve the PR with a comment summarising what was built.

## PR Description Template
Every PR Claude opens must follow this format:
```
## What
<one sentence>

## Why
<one sentence>

## Changes
- <bullet list of files changed and why>

## Test plan
- <how to verify this works>

## Checklist
- [ ] Tests written and passing
- [ ] Lint passing
- [ ] No breaking changes to existing API
- [ ] Design doc followed exactly
```

## Useful Commands
```bash
# Start local postgres
docker-compose up -d

# Run all tests
npm test --workspaces

# Lint
npm run lint --workspaces

# Run migrations
npm run db:migrate --workspace=packages/backend

# Start dev servers
npm run dev --workspaces
```
