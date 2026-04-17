# Design: Expenses API

**Issue**: #1  
**Task**: Task 5 — Expenses API (add, list, get, delete)  
**Author**: Claude (autonomous)  
**Status**: Draft → Awaiting approval  

---

## 1. Summary
Implement expense management within a group: adding an expense with equal-split logic (amounts distributed evenly among specified members, remainder cent assigned to the payer), paginated listing, fetching a single expense with its splits, and soft deletion. Only group members can interact with a group's expenses.

---

## 2. API Contract

### `POST /api/v1/groups/:groupId/expenses`
**Auth required**: yes  
**Request body**:
```json
{
  "description": "Dinner at Nobu",
  "amount": 120.00,
  "paidBy": "uuid-of-payer",
  "splitAmong": ["uuid1", "uuid2", "uuid3"]
}
```
**Success response** (`201`):
```json
{
  "id": "uuid",
  "groupId": "uuid",
  "description": "Dinner at Nobu",
  "amount": "120.00",
  "paidBy": { "id": "uuid", "name": "Alice" },
  "type": "expense",
  "splits": [
    { "userId": "uuid1", "name": "Alice", "amount": "40.00" },
    { "userId": "uuid2", "name": "Bob",   "amount": "40.00" },
    { "userId": "uuid3", "name": "Carol", "amount": "40.00" }
  ],
  "createdAt": "iso8601"
}
```
**Error responses**:
| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Body fails Zod `CreateExpenseSchema` |
| 401 | UNAUTHORIZED | Missing/invalid JWT |
| 403 | FORBIDDEN | Caller is not a member of the group |
| 404 | GROUP_NOT_FOUND | Group doesn't exist or is soft-deleted |
| 422 | PAYER_NOT_MEMBER | `paidBy` user is not in the group |
| 422 | SPLIT_USER_NOT_MEMBER | One or more `splitAmong` users are not in the group |

---

### `GET /api/v1/groups/:groupId/expenses`
**Auth required**: yes  
**Query params**: `page` (default 1), `limit` (default 20, max 100)  
**Success response** (`200`):
```json
{
  "expenses": [
    {
      "id": "uuid",
      "description": "Dinner at Nobu",
      "amount": "120.00",
      "paidBy": { "id": "uuid", "name": "Alice" },
      "type": "expense",
      "createdAt": "iso8601"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 42 }
}
```
**Error responses**:
| Status | Code | When |
|--------|------|------|
| 401 | UNAUTHORIZED | Missing/invalid JWT |
| 403 | FORBIDDEN | Caller not a member |
| 404 | GROUP_NOT_FOUND | Group doesn't exist |

---

### `GET /api/v1/groups/:groupId/expenses/:expenseId`
**Auth required**: yes  
**Success response** (`200`): Same shape as the `POST` success response above.  
**Error responses**:
| Status | Code | When |
|--------|------|------|
| 401 | UNAUTHORIZED | Missing/invalid JWT |
| 403 | FORBIDDEN | Caller not a member |
| 404 | GROUP_NOT_FOUND | Group doesn't exist |
| 404 | EXPENSE_NOT_FOUND | Expense doesn't exist or is soft-deleted |

---

### `DELETE /api/v1/groups/:groupId/expenses/:expenseId`
**Auth required**: yes  
**Success response** (`204`): Empty body.  
**Error responses**:
| Status | Code | When |
|--------|------|------|
| 401 | UNAUTHORIZED | Missing/invalid JWT |
| 403 | FORBIDDEN | Caller is not a member of the group |
| 404 | GROUP_NOT_FOUND | Group doesn't exist |
| 404 | EXPENSE_NOT_FOUND | Expense doesn't exist or already deleted |

---

## 3. Database Schema Changes
Uses `expenses` and `expense_splits` tables from Task 2. No new tables.

---

## 4. Service Layer Logic

### `ExpenseService.create({ groupId, description, amount, paidBy, splitAmong, callerUserId })`
1. Lookup group by `id` where `deleted_at IS NULL` — throw `GROUP_NOT_FOUND` if missing.
2. Assert `callerUserId` is a member — throw `FORBIDDEN` if not.
3. Assert `paidBy` is a member — throw `PAYER_NOT_MEMBER` if not.
4. Assert every id in `splitAmong` is a member — throw `SPLIT_USER_NOT_MEMBER` if any is not.
5. Compute equal splits:
   - `baseAmount = floor(amount * 100 / splitAmong.length) / 100` (integer cents division)
   - `remainder = amount * 100 - baseAmount * 100 * splitAmong.length` (remainder cents)
   - Assign `baseAmount` to all; add `remainder / 100` to the payer's split (so totals always equal `amount`).
6. Within a DB transaction:
   - Insert `expenses` row.
   - Insert one `expense_splits` row per member in `splitAmong`.
7. Return full expense with splits.

### `ExpenseService.list({ groupId, callerUserId, page, limit })`
1. Verify group exists and caller is a member (same checks as above).
2. Query `expenses` where `group_id = groupId AND deleted_at IS NULL`, ordered by `created_at DESC`.
3. Apply `LIMIT limit OFFSET (page-1)*limit`.
4. Count total with a separate `COUNT(*)` query.
5. Return `{ expenses, pagination }`.

### `ExpenseService.getById({ groupId, expenseId, callerUserId })`
1. Verify group exists and caller is a member.
2. Lookup expense by `id` where `group_id = groupId AND deleted_at IS NULL` — throw `EXPENSE_NOT_FOUND` if missing.
3. Join `expense_splits → users` to get split details.
4. Return full expense object.

### `ExpenseService.softDelete({ groupId, expenseId, callerUserId })`
1. Verify group exists and caller is a member.
2. Lookup expense — throw `EXPENSE_NOT_FOUND` if missing or already deleted.
3. Set `deleted_at = NOW()` on the `expenses` row.
4. Return nothing (204).

---

## 5. Balance Calculation Impact
- Equal-split amounts are computed at write time and stored in `expense_splits`. This is the authoritative ledger for balance calculations (Task 6).
- The remainder-cent-to-payer rule ensures `SUM(expense_splits.amount) = expenses.amount` exactly, preventing rounding drift.
- Soft-deleted expenses are excluded from balance queries via `deleted_at IS NULL` filter.

---

## 6. Test Plan

### Unit tests
| Test | Expectation |
|------|-------------|
| `ExpenseService > create > equal split 3 people $10` | Each split = $3.34 for payer, $3.33 others (total = $10.00) |
| `ExpenseService > create > payer not in group` | Throws `PAYER_NOT_MEMBER` |
| `ExpenseService > create > split user not in group` | Throws `SPLIT_USER_NOT_MEMBER` |
| `ExpenseService > create > non-member caller` | Throws `FORBIDDEN` |

### Integration tests (Supertest)
| Test | Endpoint | Expectation |
|------|----------|-------------|
| Add expense | `POST /api/v1/groups/:id/expenses` | `201` + expense with splits |
| Add expense unauthenticated | `POST /api/v1/groups/:id/expenses` | `401` |
| Add expense as non-member | `POST /api/v1/groups/:id/expenses` | `403` |
| List expenses page 1 | `GET /api/v1/groups/:id/expenses` | `200` + pagination |
| List expenses page 2 | `GET /api/v1/groups/:id/expenses?page=2` | `200` + correct offset |
| Get single expense | `GET /api/v1/groups/:id/expenses/:eid` | `200` + splits |
| Delete expense | `DELETE /api/v1/groups/:id/expenses/:eid` | `204` |
| Get deleted expense | `GET /api/v1/groups/:id/expenses/:eid` | `404 EXPENSE_NOT_FOUND` |
| List excludes deleted | `GET /api/v1/groups/:id/expenses` | Deleted expense absent |

---

## 7. Out of Scope
- Non-equal split strategies (percentage, exact amounts).
- Editing an existing expense.
- Expense categories or attachments.

---

## 8. Open Questions
None.
