# Design: Database Schema + Migrations

**Issue**: #1  
**Task**: Task 2 — Database schema + migrations (Drizzle ORM)  
**Author**: Claude (autonomous)  
**Status**: Draft → Awaiting approval  

---

## 1. Summary
Define all Drizzle ORM table schemas for the MVP and generate + run the initial migration. This task produces the complete data model that Auth, Groups, Expenses, and Balances tasks will build on. No business logic lives here — only schema definitions, the migration file, and a `docker-compose.yml`-verified migration run.

---

## 2. API Contract
No endpoints in this task.

---

## 3. Database Schema Changes

### New tables

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES groups(id),
  user_id    UUID NOT NULL REFERENCES users(id),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id),
  description TEXT NOT NULL,
  amount      NUMERIC(12, 2) NOT NULL,
  paid_by     UUID NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL DEFAULT 'expense',  -- 'expense' | 'settlement'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE expense_splits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID NOT NULL REFERENCES expenses(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  amount      NUMERIC(12, 2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Drizzle schema (TypeScript)

```typescript
// packages/backend/src/db/schema.ts

import { pgTable, uuid, text, numeric, timestamp, unique } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  email:        text('email').notNull().unique(),
  name:         text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt:    timestamp('deleted_at', { withTimezone: true }),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const groups = pgTable('groups', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        text('name').notNull(),
  description: text('description'),
  createdBy:   uuid('created_by').notNull().references(() => users.id),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt:   timestamp('deleted_at', { withTimezone: true }),
});

export const groupMembers = pgTable('group_members', {
  id:       uuid('id').primaryKey().defaultRandom(),
  groupId:  uuid('group_id').notNull().references(() => groups.id),
  userId:   uuid('user_id').notNull().references(() => users.id),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: unique().on(t.groupId, t.userId),
}));

export const expenses = pgTable('expenses', {
  id:          uuid('id').primaryKey().defaultRandom(),
  groupId:     uuid('group_id').notNull().references(() => groups.id),
  description: text('description').notNull(),
  amount:      numeric('amount', { precision: 12, scale: 2 }).notNull(),
  paidBy:      uuid('paid_by').notNull().references(() => users.id),
  type:        text('type').notNull().default('expense'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt:   timestamp('deleted_at', { withTimezone: true }),
});

export const expenseSplits = pgTable('expense_splits', {
  id:        uuid('id').primaryKey().defaultRandom(),
  expenseId: uuid('expense_id').notNull().references(() => expenses.id),
  userId:    uuid('user_id').notNull().references(() => users.id),
  amount:    numeric('amount', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### Indexes

| Index | Table | Columns | Query supported |
|-------|-------|---------|----------------|
| `idx_users_email` | `users` | `email` | Login lookup |
| `idx_group_members_user` | `group_members` | `user_id` | "list my groups" |
| `idx_group_members_group` | `group_members` | `group_id` | "list group members" |
| `idx_expenses_group` | `expenses` | `group_id, created_at DESC` | Paginated expense list |
| `idx_expense_splits_expense` | `expense_splits` | `expense_id` | Load splits for an expense |
| `idx_expense_splits_user` | `expense_splits` | `user_id` | Balance calculation |
| `idx_refresh_tokens_user` | `refresh_tokens` | `user_id` | Token revocation |

---

## 4. Service Layer Logic
No business logic in this task — schema and migration only.

---

## 5. Balance Calculation Impact
The schema directly encodes the balance calculation rules:
- Rule 1: splits go in `expense_splits` (one row per participant).
- Rule 4: `expenses.type = 'settlement'` distinguishes settlements.
- Rule 5: No cached balance column anywhere — balances are always derived from `expenses` + `expense_splits`.

---

## 6. Test Plan

### Unit tests
Not applicable (no logic).

### Integration tests
| Test | What | Expectation |
|------|------|-------------|
| Migration smoke test | Run `db:migrate` against test DB | Exits 0, all tables exist |
| Unique constraint | Insert duplicate `group_members` row | DB throws unique violation |
| Soft delete column | Insert then null `deleted_at` | Row queryable with null filter |

---

## 7. Out of Scope
- Seed data scripts.
- Any future schema changes (handled via subsequent migrations).
- `updated_at` auto-update trigger — handled at the ORM layer in services.

---

## 8. Open Questions
None.
