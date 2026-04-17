# Design: Groups API

**Issue**: #1  
**Task**: Task 4 — Groups API (create, invite, list, get)  
**Author**: Claude (autonomous)  
**Status**: Draft → Awaiting approval  

---

## 1. Summary
Implement the four group management endpoints: creating a group (creator auto-joins as a member), inviting an existing user by email, listing groups the current user belongs to, and fetching a single group with its member list. All endpoints are protected by JWT. Non-members cannot read or modify a group.

---

## 2. API Contract

### `POST /api/v1/groups`
**Auth required**: yes  
**Request body**:
```json
{ "name": "Trip to Bali", "description": "July 2026 holiday expenses" }
```
**Success response** (`201`):
```json
{
  "id": "uuid",
  "name": "Trip to Bali",
  "description": "July 2026 holiday expenses",
  "createdBy": "uuid",
  "createdAt": "iso8601",
  "members": [{ "id": "uuid", "name": "Alice", "email": "alice@example.com" }]
}
```
**Error responses**:
| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Body fails Zod `CreateGroupSchema` |
| 401 | UNAUTHORIZED | Missing/invalid JWT |

---

### `POST /api/v1/groups/:groupId/members`
**Auth required**: yes  
**Request body**:
```json
{ "email": "bob@example.com" }
```
**Success response** (`201`):
```json
{ "id": "uuid", "name": "Bob", "email": "bob@example.com", "joinedAt": "iso8601" }
```
**Error responses**:
| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Body fails Zod `InviteMemberSchema` |
| 401 | UNAUTHORIZED | Missing/invalid JWT |
| 403 | FORBIDDEN | Caller is not a member of this group |
| 404 | USER_NOT_FOUND | No registered user with that email |
| 404 | GROUP_NOT_FOUND | Group doesn't exist or is soft-deleted |
| 409 | ALREADY_MEMBER | User is already in the group |

---

### `GET /api/v1/groups`
**Auth required**: yes  
**Success response** (`200`):
```json
{
  "groups": [
    {
      "id": "uuid",
      "name": "Trip to Bali",
      "description": "...",
      "memberCount": 3,
      "createdAt": "iso8601"
    }
  ]
}
```
**Error responses**:
| Status | Code | When |
|--------|------|------|
| 401 | UNAUTHORIZED | Missing/invalid JWT |

---

### `GET /api/v1/groups/:groupId`
**Auth required**: yes  
**Success response** (`200`):
```json
{
  "id": "uuid",
  "name": "Trip to Bali",
  "description": "...",
  "createdBy": "uuid",
  "createdAt": "iso8601",
  "members": [
    { "id": "uuid", "name": "Alice", "email": "alice@example.com", "joinedAt": "iso8601" }
  ]
}
```
**Error responses**:
| Status | Code | When |
|--------|------|------|
| 401 | UNAUTHORIZED | Missing/invalid JWT |
| 403 | FORBIDDEN | Caller is not a member |
| 404 | GROUP_NOT_FOUND | Group doesn't exist or is soft-deleted |

---

## 3. Database Schema Changes
Uses `groups` and `group_members` tables from Task 2. No new tables.

---

## 4. Service Layer Logic

### `GroupService.create({ name, description, userId })`
1. Insert row into `groups` with `created_by = userId`.
2. Insert row into `group_members` with `group_id = newGroup.id, user_id = userId`.
3. Wrap both inserts in a DB transaction.
4. Return group + members array.

### `GroupService.inviteMember({ groupId, callerUserId, email })`
1. Lookup group by `id` where `deleted_at IS NULL` — throw `GROUP_NOT_FOUND` if missing.
2. Assert `callerUserId` is in `group_members` for this group — throw `FORBIDDEN` if not.
3. Lookup invitee by `email` (case-insensitive, `deleted_at IS NULL`) — throw `USER_NOT_FOUND` if missing.
4. Check `group_members` for `(group_id, user_id)` uniqueness — throw `ALREADY_MEMBER` if exists.
5. Insert `group_members` row.
6. Return the new member's public profile.

### `GroupService.listForUser({ userId })`
1. Join `group_members → groups` where `user_id = userId` and `groups.deleted_at IS NULL`.
2. For each group, also count members via a subquery or separate count.
3. Return array sorted by `groups.created_at DESC`.

### `GroupService.getById({ groupId, callerUserId })`
1. Lookup group by `id` where `deleted_at IS NULL` — throw `GROUP_NOT_FOUND` if missing.
2. Assert `callerUserId` is a member — throw `FORBIDDEN` if not.
3. Join `group_members → users` to get full member list.
4. Return group + members.

---

## 5. Balance Calculation Impact
Not applicable (no expenses touched here).

---

## 6. Test Plan

### Unit tests
| Test | Expectation |
|------|-------------|
| `GroupService > create > happy path` | Returns group with creator as sole member |
| `GroupService > inviteMember > non-member caller` | Throws `FORBIDDEN` |
| `GroupService > inviteMember > unknown email` | Throws `USER_NOT_FOUND` |
| `GroupService > inviteMember > already member` | Throws `ALREADY_MEMBER` |
| `GroupService > getById > non-member caller` | Throws `FORBIDDEN` |

### Integration tests (Supertest)
| Test | Endpoint | Expectation |
|------|----------|-------------|
| Create group | `POST /api/v1/groups` | `201` + group with members |
| Create group unauthenticated | `POST /api/v1/groups` | `401` |
| Invite member | `POST /api/v1/groups/:id/members` | `201` + member object |
| Invite already-member | `POST /api/v1/groups/:id/members` | `409 ALREADY_MEMBER` |
| Invite as non-member | `POST /api/v1/groups/:id/members` | `403 FORBIDDEN` |
| List groups | `GET /api/v1/groups` | `200` + array |
| Get group as member | `GET /api/v1/groups/:id` | `200` + group + members |
| Get group as non-member | `GET /api/v1/groups/:id` | `403 FORBIDDEN` |

---

## 7. Out of Scope
- Group deletion or archiving.
- Removing a member from a group.
- Group admin roles / permissions beyond membership.

---

## 8. Open Questions
None.
