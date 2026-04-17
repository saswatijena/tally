# Issue #1: MVP Core — Auth, Groups, Expenses, Balances

## Context
We are building a Splitwise clone. This is the foundational MVP issue covering all core
functionality: user authentication, group management, expense tracking, and balance calculation.

The full tech stack and conventions are in `CLAUDE.md`. Read it before doing anything else.

## Scope of this issue
Build the complete backend API for the MVP. Frontend is out of scope for this issue.

## High-level features needed

### 1. Auth
- Register with email + password
- Login → returns JWT access token + refresh token
- Refresh token endpoint
- Get current user profile

### 2. Groups
- Create a group (name, optional description)
- Invite members by email (they must already be registered)
- List all groups the current user belongs to
- Get a single group with its members

### 3. Expenses
- Add an expense to a group (description, amount, paid_by, split among which members)
- Support split strategies: equal split only for MVP
- List all expenses in a group (paginated, newest first)
- Get a single expense with its splits
- Delete an expense (soft delete)

### 4. Balances
- Get all balances within a group (who owes whom how much)
- Get the current user's net balance across all groups
- Settle up: record a settlement between two users in a group

## Acceptance criteria (overall)
- All endpoints return consistent JSON error shapes: `{ error: { code, message } }`
- All protected endpoints return 401 when JWT is missing/invalid
- Balance calculations must be accurate to 2 decimal places
- All endpoints have integration tests passing against a real test database
- npm test and npm run lint pass with zero errors

## What I want Claude to do
Break this into tasks, write designs, wait for my approval at each stage, then implement.
Follow the workflow in CLAUDE.md exactly.

---
*Assign this issue to `claude-bot` to trigger the autonomous workflow.*
