# Design: Project Scaffold + Shared Zod Schemas

**Issue**: #1  
**Task**: Task 1 — Project scaffold + shared Zod schemas  
**Author**: Claude (autonomous)  
**Status**: Draft → Awaiting approval  

---

## 1. Summary
Bootstrap the monorepo so all three packages (`shared`, `backend`, `frontend`) are valid TypeScript workspaces with ESLint configured. The `shared` package exports all Zod validation schemas that both the backend (for route validation) and future frontend (for form validation) will import. This is the foundation every subsequent task builds on.

---

## 2. API Contract
No endpoints in this task — pure infrastructure and schema definitions.

---

## 3. Database Schema Changes
No schema changes in this task.

---

## 4. Service Layer Logic
No service logic in this task.

### Shared Zod schemas to be exported from `packages/shared/src/schemas/`

**auth.ts**
- `RegisterSchema` — `{ email: string (email), password: string (min 8), name: string (min 1) }`
- `LoginSchema` — `{ email: string (email), password: string }`
- `RefreshTokenSchema` — `{ refreshToken: string }`

**group.ts**
- `CreateGroupSchema` — `{ name: string (min 1, max 100), description?: string (max 500) }`
- `InviteMemberSchema` — `{ email: string (email) }`

**expense.ts**
- `CreateExpenseSchema` — `{ description: string (min 1), amount: number (positive, max 2 decimals), paidBy: string (uuid), splitAmong: string[] (uuid[], min 1) }`
- `PaginationSchema` — `{ page?: number (min 1, default 1), limit?: number (min 1, max 100, default 20) }`

**settlement.ts**
- `CreateSettlementSchema` — `{ toUserId: string (uuid), amount: number (positive) }`

**error.ts**
- `ErrorResponseSchema` — `{ error: { code: string, message: string } }` (shared response shape)

---

## 5. Balance Calculation Impact
Not applicable.

---

## 6. Test Plan

### Unit tests
| Test | Expectation |
|------|-------------|
| `RegisterSchema > valid input` | Parses without error |
| `RegisterSchema > short password` | Throws ZodError |
| `RegisterSchema > invalid email` | Throws ZodError |
| `CreateExpenseSchema > negative amount` | Throws ZodError |
| `CreateExpenseSchema > empty splitAmong` | Throws ZodError |

### Integration tests (Supertest)
Not applicable for this task.

### Frontend tests
Not applicable (frontend skeleton only).

---

## 7. Out of Scope
- No actual route handlers, services, or DB code.
- No frontend components — only the package skeleton.
- No Docker or Postgres setup (that's Task 2).

---

## 8. Open Questions
None.
