# Design: Balances API

**Issue**: #1  
**Task**: Task 6 — Balances API (group balances, net balance, settle up)  
**Author**: Claude (autonomous)  
**Status**: Draft → Awaiting approval  

---

## 1. Summary
Implement the three balance-related endpoints: fetching simplified balances within a group (greedy minimum-transactions algorithm), fetching the current user's net balance across all groups, and recording a settlement. Balances are always computed fresh from the `expenses` + `expense_splits` ledger — no cached columns. Settlements are stored as a special expense with `type = 'settlement'` and do not create `expense_splits` rows.

---

## 2. API Contract

### `GET /api/v1/groups/:groupId/balances`
**Auth required**: yes  
**Success response** (`200`):
```json
{
  "balances": [
    { "from": { "id": "uuid", "name": "Bob" }, "to": { "id": "uuid", "name": "Alice" }, "amount": "40.00" }
  ]
}
```
Each entry means: `from` owes `to` the given amount. The list is the minimum set of transactions that clears all debts (greedy simplification).

**Error responses**:
| Status | Code | When |
|--------|------|------|
| 401 | UNAUTHORIZED | Missing/invalid JWT |
| 403 | FORBIDDEN | Caller not a member |
| 404 | GROUP_NOT_FOUND | Group doesn't exist |

---

### `GET /api/v1/users/me/balances`
**Auth required**: yes  
**Success response** (`200`):
```json
{
  "netBalances": [
    {
      "groupId": "uuid",
      "groupName": "Trip to Bali",
      "counterparty": { "id": "uuid", "name": "Alice" },
      "amount": "40.00",
      "direction": "owe"
    }
  ],
  "totalOwed": "40.00",
  "totalOwing": "0.00"
}
```
`direction: "owe"` means current user owes the counterparty; `"owed"` means counterparty owes current user.

**Error responses**:
| Status | Code | When |
|--------|------|------|
| 401 | UNAUTHORIZED | Missing/invalid JWT |

---

### `POST /api/v1/groups/:groupId/settlements`
**Auth required**: yes  
**Request body**:
```json
{ "toUserId": "uuid-of-recipient", "amount": 40.00 }
```
**Success response** (`201`):
```json
{
  "id": "uuid",
  "groupId": "uuid",
  "fromUser": { "id": "uuid", "name": "Bob" },
  "toUser": { "id": "uuid", "name": "Alice" },
  "amount": "40.00",
  "type": "settlement",
  "createdAt": "iso8601"
}
```
**Error responses**:
| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Body fails Zod `CreateSettlementSchema` |
| 401 | UNAUTHORIZED | Missing/invalid JWT |
| 403 | FORBIDDEN | Caller not a member |
| 404 | GROUP_NOT_FOUND | Group doesn't exist |
| 422 | RECIPIENT_NOT_MEMBER | `toUserId` is not in the group |

---

## 3. Database Schema Changes
No new tables. Settlements reuse the `expenses` table with `type = 'settlement'`.

**Settlement row shape in `expenses`**:
- `type = 'settlement'`
- `paid_by = fromUserId` (the person paying off the debt)
- `description = 'Settlement'`
- `amount = settlement amount`
- No rows in `expense_splits` — balance queries handle settlements specially.

---

## 4. Service Layer Logic

### `BalanceService._buildLedger(groupId)` (private)
Computes raw pairwise balances from the database:

1. Fetch all non-deleted **expenses** (`type = 'expense'`) with their splits for the group.
2. For each expense: payer is "owed" by each split participant the split amount.
   - `net[payer][participant] += split.amount` (payer lent this to participant)
3. Fetch all non-deleted **settlements** (`type = 'settlement'`) for the group.
4. For each settlement: `paid_by` paid `amount` to the `description`... wait, settlement needs to encode `toUserId`.

**Settlement encoding**: The `expenses` table has `paid_by` for the payer. For settlements, `toUserId` is stored in a dedicated `expense_splits` row with the full `amount` (one row, no equal split). This keeps the ledger uniform.

Revised settlement storage:
- Insert one `expense_splits` row: `user_id = toUserId, amount = settlementAmount`.
- Balance query treats a settlement as "payer paid `amount` to `toUserId`" — reduces what payer owes.

5. After building `net[A][B]` for all pairs, collapse to net bilateral: `balance[A][B] = net[A][B] - net[B][A]`. If positive, A is owed by B.

### `BalanceService._simplify(netBalances)` (private — greedy algorithm)
1. Compute each person's net position: `position[user] = sum(what others owe them) - sum(what they owe others)`.
2. Separate into creditors (positive) and debtors (negative), sorted by absolute value descending.
3. Greedy: match largest debtor with largest creditor, create a transaction for `min(|debtor|, creditor)`, reduce both, repeat until all positions are zero.
4. Return list of `{ from, to, amount }`.

### `BalanceService.getGroupBalances({ groupId, callerUserId })`
1. Verify group exists and caller is a member.
2. Call `_buildLedger(groupId)` then `_simplify(ledger)`.
3. Enrich `from`/`to` with user names via a users lookup.
4. Return the simplified transaction list.

### `BalanceService.getMyNetBalances({ userId })`
1. Get all group IDs where `userId` is a member.
2. For each group, call `_buildLedger(groupId)`.
3. Extract only bilateral entries involving `userId`.
4. Compute `totalOwed` (sum of amounts others owe user) and `totalOwing` (sum of amounts user owes others).
5. Return flat list with group context.

### `BalanceService.settle({ groupId, fromUserId, toUserId, amount })`
1. Verify group exists and `fromUserId` is a member — throw `FORBIDDEN` if not.
2. Verify `toUserId` is a member — throw `RECIPIENT_NOT_MEMBER` if not.
3. Within a DB transaction:
   - Insert `expenses` row: `type = 'settlement', paid_by = fromUserId, amount = amount, description = 'Settlement'`.
   - Insert `expense_splits` row: `expense_id = newExpense.id, user_id = toUserId, amount = amount`.
4. Return the settlement record.

---

## 5. Balance Calculation Impact
This task IS the balance calculation. Confirming invariant compliance:
- **Rule 1**: Regular expense splits are in `expense_splits` (one row per participant). ✓
- **Rule 2**: Balance = `sum(A paid that B owes) - sum(B paid that A owes)` — exactly what `_buildLedger` computes. ✓
- **Rule 3**: `_simplify` uses the greedy minimum-transactions algorithm. ✓
- **Rule 4**: Settlements use `type = 'settlement'` with a single `expense_splits` row pointing to the recipient. ✓
- **Rule 5**: No cached balance column — always computed from ledger. ✓

---

## 6. Test Plan

### Unit tests
| Test | Expectation |
|------|-------------|
| `_simplify > 3-person debt` | Returns minimum transactions (2 not 3) |
| `_simplify > already balanced` | Returns empty array |
| `_simplify > single debt` | Returns one transaction |
| `_buildLedger > with settlement` | Settlement reduces debt correctly |
| `_buildLedger > deleted expense excluded` | Soft-deleted expense not counted |

### Integration tests (Supertest)
| Test | Endpoint | Expectation |
|------|----------|-------------|
| Group balances after expenses | `GET /api/v1/groups/:id/balances` | `200` + correct amounts to 2dp |
| Group balances after settlement | `GET /api/v1/groups/:id/balances` | Settlement reduces owed amount |
| Group balances empty group | `GET /api/v1/groups/:id/balances` | `200` + empty array |
| Net balances across groups | `GET /api/v1/users/me/balances` | `200` + correct totals |
| Settle up | `POST /api/v1/groups/:id/settlements` | `201` + settlement record |
| Settle as non-member | `POST /api/v1/groups/:id/settlements` | `403` |
| Settle to non-member | `POST /api/v1/groups/:id/settlements` | `422 RECIPIENT_NOT_MEMBER` |
| Full multi-person scenario | Add 3 expenses, settle 1, check balances | Correct minimum transactions |

---

## 7. Out of Scope
- Historical balance snapshots.
- Partial settlements (MVP settles full amount between two users).
- Balance notifications.

---

## 8. Open Questions
None.
