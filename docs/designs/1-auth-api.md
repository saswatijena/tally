# Design: Auth API

**Issue**: #1  
**Task**: Task 3 — Auth API (register, login, refresh, me)  
**Author**: Claude (autonomous)  
**Status**: Draft → Awaiting approval  

---

## 1. Summary
Implement JWT-based authentication: user registration, login returning an access token (15 min TTL) and a refresh token (7 day TTL), token refresh, and a protected `GET /auth/me` endpoint. Refresh tokens are stored hashed in the `refresh_tokens` table so they can be revoked. The access token is a short-lived JWT signed with a secret from env vars.

---

## 2. API Contract

### `POST /api/v1/auth/register`
**Auth required**: no  
**Request body**:
```json
{
  "email": "alice@example.com",
  "name": "Alice",
  "password": "secret123"
}
```
**Success response** (`201`):
```json
{
  "user": { "id": "uuid", "email": "alice@example.com", "name": "Alice" },
  "accessToken": "eyJ...",
  "refreshToken": "opaque-random-string"
}
```
**Error responses**:
| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Body fails Zod `RegisterSchema` |
| 409 | EMAIL_TAKEN | Email already registered |

---

### `POST /api/v1/auth/login`
**Auth required**: no  
**Request body**:
```json
{ "email": "alice@example.com", "password": "secret123" }
```
**Success response** (`200`):
```json
{
  "user": { "id": "uuid", "email": "alice@example.com", "name": "Alice" },
  "accessToken": "eyJ...",
  "refreshToken": "opaque-random-string"
}
```
**Error responses**:
| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Body fails Zod `LoginSchema` |
| 401 | INVALID_CREDENTIALS | Email not found or password wrong |

---

### `POST /api/v1/auth/refresh`
**Auth required**: no  
**Request body**:
```json
{ "refreshToken": "opaque-random-string" }
```
**Success response** (`200`):
```json
{ "accessToken": "eyJ...", "refreshToken": "new-opaque-string" }
```
**Error responses**:
| Status | Code | When |
|--------|------|------|
| 401 | INVALID_REFRESH_TOKEN | Token not found, expired, or already used |

---

### `GET /api/v1/auth/me`
**Auth required**: yes (Bearer JWT)  
**Success response** (`200`):
```json
{ "id": "uuid", "email": "alice@example.com", "name": "Alice", "createdAt": "iso8601" }
```
**Error responses**:
| Status | Code | When |
|--------|------|------|
| 401 | UNAUTHORIZED | Missing or invalid JWT |

---

## 3. Database Schema Changes
Uses `users` and `refresh_tokens` tables from Task 2. No new tables.

---

## 4. Service Layer Logic

### `AuthService.register({ email, name, password })`
1. Check `users` table for existing `email` (case-insensitive) — throw `EMAIL_TAKEN` if found.
2. Hash password with `bcrypt` (cost factor 12).
3. Insert new `users` row.
4. Call `AuthService._issueTokens(userId)` and return result alongside user.

### `AuthService.login({ email, password })`
1. Lookup user by `email` (case-insensitive, `deleted_at IS NULL`). Throw `INVALID_CREDENTIALS` if not found.
2. Compare password with `bcrypt.compare` — throw `INVALID_CREDENTIALS` on mismatch (same error, no email enumeration).
3. Call `AuthService._issueTokens(userId)` and return result alongside user.

### `AuthService._issueTokens(userId)` (private)
1. Generate a cryptographically random 32-byte token (`crypto.randomBytes`). This is the raw refresh token returned to the client.
2. Hash the raw token with `sha256` — store the hash in `refresh_tokens`.
3. Set `expires_at = now + 7 days`.
4. Sign a JWT `{ sub: userId }` with `JWT_SECRET`, expiry `15m`.
5. Return `{ accessToken, refreshToken: rawToken }`.

### `AuthService.refresh({ refreshToken })`
1. Hash the incoming token with `sha256`.
2. Lookup `refresh_tokens` by hash where `expires_at > now`.
3. Throw `INVALID_REFRESH_TOKEN` if not found.
4. Delete the old refresh token row (rotation — prevents reuse).
5. Call `AuthService._issueTokens(userId)` and return new token pair.

### `AuthService.getMe(userId)`
1. Lookup user by `id` where `deleted_at IS NULL`. Throw `NOT_FOUND` if missing.
2. Return `{ id, email, name, createdAt }`.

### `authMiddleware` (Express middleware)
1. Read `Authorization: Bearer <token>` header — return 401 if missing.
2. Verify JWT with `JWT_SECRET` — return 401 on any error.
3. Attach `req.user = { id: payload.sub }` for downstream handlers.

---

## 5. Balance Calculation Impact
Not applicable.

---

## 6. Test Plan

### Unit tests
| Test | Expectation |
|------|-------------|
| `AuthService > register > happy path` | Returns user + token pair |
| `AuthService > register > duplicate email` | Throws `EMAIL_TAKEN` |
| `AuthService > login > wrong password` | Throws `INVALID_CREDENTIALS` |
| `AuthService > refresh > expired token` | Throws `INVALID_REFRESH_TOKEN` |
| `AuthService > refresh > reused token` | Throws `INVALID_REFRESH_TOKEN` (token deleted after first use) |

### Integration tests (Supertest)
| Test | Endpoint | Expectation |
|------|----------|-------------|
| Register new user | `POST /api/v1/auth/register` | `201` + accessToken + refreshToken |
| Register duplicate email | `POST /api/v1/auth/register` | `409 EMAIL_TAKEN` |
| Login valid credentials | `POST /api/v1/auth/login` | `200` + token pair |
| Login wrong password | `POST /api/v1/auth/login` | `401 INVALID_CREDENTIALS` |
| Refresh valid token | `POST /api/v1/auth/refresh` | `200` + new token pair |
| Refresh reused token | `POST /api/v1/auth/refresh` | `401 INVALID_REFRESH_TOKEN` |
| Get me authenticated | `GET /api/v1/auth/me` | `200` + user object |
| Get me no token | `GET /api/v1/auth/me` | `401 UNAUTHORIZED` |

---

## 7. Out of Scope
- Email verification flow.
- Password reset.
- OAuth / social login.
- Token revocation on logout (out of scope for MVP).

---

## 8. Open Questions
None.
