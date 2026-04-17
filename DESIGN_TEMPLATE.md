# Design: [Feature Name]

**Issue**: #[number]  
**Task**: [task number and name from task breakdown]  
**Author**: Claude (autonomous)  
**Status**: Draft → Awaiting approval  

---

## 1. Summary
One paragraph describing what this task builds and why it matters for the MVP.

---

## 2. API Contract

### Endpoints

#### `METHOD /api/v1/path`
**Auth required**: yes/no  
**Request body** (if applicable):
```json
{
  "field": "type and description"
}
```
**Success response** (`2xx`):
```json
{
  "field": "type and description"
}
```
**Error responses**:
| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Request body fails Zod schema |
| 401 | UNAUTHORIZED | Missing or invalid JWT |
| 403 | FORBIDDEN | User lacks permission |
| 404 | NOT_FOUND | Resource does not exist |

*(Repeat for each endpoint in this task)*

---

## 3. Database Schema Changes

### New tables
```sql
-- describe any new tables with column names, types, constraints
CREATE TABLE example (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

### Modified tables
Describe any columns added/changed to existing tables.

### Drizzle schema (TypeScript)
```typescript
export const example = pgTable('example', {
  id: uuid('id').primaryKey().defaultRandom(),
  // ...
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});
```

### Indexes
List any indexes to be added and the query they support.

---

## 4. Service Layer Logic

Describe the business logic in plain language for each service function:

### `ServiceName.methodName(params)`
1. Validate preconditions (list them)
2. Step-by-step logic
3. What is returned

*Include any edge cases or error conditions that must be handled.*

---

## 5. Balance Calculation Impact
*(Skip if this task does not touch expenses or settlements)*

Describe how this change affects balance calculations. Confirm it does not break the invariants in CLAUDE.md section "Balance Calculation Rules".

---

## 6. Test Plan

### Unit tests
| Test | Expectation |
|------|-------------|
| `ServiceName > methodName > happy path` | Returns expected shape |
| `ServiceName > methodName > missing field` | Throws validation error |

### Integration tests (Supertest)
| Test | Endpoint | Expectation |
|------|----------|-------------|
| Creates resource successfully | `POST /api/v1/...` | `201` + body matches schema |
| Rejects unauthenticated request | `POST /api/v1/...` | `401` |

### Frontend tests (React Testing Library)
*(Skip if this task is backend-only)*
| Test | Component | Expectation |
|------|-----------|-------------|
| Renders loading state | `ComponentName` | Shows spinner |
| Renders data after fetch | `ComponentName` | Shows expected text |

---

## 7. Out of Scope
List anything explicitly NOT included in this task that might seem related.

---

## 8. Open Questions
Any decisions that need human input before implementation starts.
