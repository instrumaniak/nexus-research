# Authentication & User System

## Roles

| Role | Created by | Permissions |
|---|---|---|
| SUPERADMIN | CLI script only — never via UI | Full admin panel, approve/ban/delete users, view all logs |
| USER | Self-registration | Own chat, own KB, own history only |

## User Status

| Status | Can log in | Description |
|---|---|---|
| PENDING | No | Registered, awaiting superadmin approval |
| ACTIVE | Yes | Approved, full access |
| BANNED | No | Blocked — all refresh tokens revoked on ban |

Status is checked on every authenticated request (not just on login).

## Phase Roadmap

### Phase 1 — Email + Password (build now)

Simple, working auth with no external dependencies.

**Register flow:**
1. POST /auth/register — { username, email, password }
2. Backend: validate, bcrypt hash password (cost 12), insert user (status: PENDING)
3. Return: 201 + message "Account pending approval"

**Login flow:**
1. POST /auth/login — { email, password }
2. Backend: find user by email → compare bcrypt hash → check status
3. If PENDING → 403 "Account pending approval"
4. If BANNED → 403 "Account suspended"
5. If ACTIVE → issue access token (15m) + refresh token (7d, httpOnly cookie)
6. Return: 200 + { accessToken, user: { id, username, email, role } }

**Token refresh:**
1. POST /auth/refresh (no body — refresh token read from httpOnly cookie)
2. Backend: validate refresh token → check not revoked → check user status
3. Revoke old refresh token, issue new refresh token + new access token
4. Return: 200 + { accessToken }

**Logout:**
1. POST /auth/logout
2. Backend: revoke refresh token from cookie
3. Return: 200

**Ban enforcement:**
- On ban: `UPDATE refresh_tokens SET revoked = true WHERE user_id = ?`
- Auth guard checks user.status on every request — banned users rejected immediately

### Phase 2 — Email OTP (after Phase 1 is stable)

Registration flow changes. Everything else stays the same.

1. User submits register form
2. Backend generates 6-digit OTP (otplib), stores in otp_codes table (expires 10m)
3. Nodemailer sends OTP to email via cPanel SMTP
4. User enters OTP on /verify-email screen
5. On valid OTP: create user (status: PENDING) — same as Phase 1 from here
6. On admin approval: Nodemailer sends approval email to user

Also adds:
- Forgot password → POST /auth/forgot-password { email } → OTP sent
- POST /auth/reset-password { email, otp, newPassword } → validate OTP → update password

### Phase 3 — Google OAuth (after Phase 2 is stable)

Do not install `passport-google-oauth20` until Phase 2 is complete.

1. User clicks "Sign in with Google"
2. GET /auth/google → redirect to Google consent
3. GET /auth/google/callback → passport validates
4. Backend: find user by google_id OR email
5. If found + ACTIVE → issue JWT (same as login)
6. If found + PENDING/BANNED → reject with status message
7. If not found → create user (password: null, google_id: set, status: PENDING)
8. Approval flow identical to email registration

## JWT Strategy

```
Access token
  - Expiry: 15 minutes
  - Secret: JWT_ACCESS_SECRET (from .env)
  - Payload: { sub: userId, email, role }
  - Sent: Authorization: Bearer <token> header

Refresh token
  - Expiry: 7 days
  - Secret: JWT_REFRESH_SECRET (from .env)
  - Payload: { sub: userId, jti: uuid }
  - Sent: httpOnly cookie (name: 'refresh_token')
  - Stored: refresh_tokens table (hashed)
  - Rotation: revoked on each use, new one issued
```

## NestJS Guards

Two guards must be applied to every protected route:

```typescript
@UseGuards(JwtAuthGuard, StatusGuard)
```

- `JwtAuthGuard` — validates access token signature and expiry
- `StatusGuard` — checks `user.status === 'ACTIVE'` — catches banned users mid-session

Admin routes additionally require:

```typescript
@UseGuards(JwtAuthGuard, StatusGuard, RolesGuard)
@Roles('SUPERADMIN')
```

## Superadmin CLI

```bash
# Create superadmin (run once after first deploy)
npx ts-node backend/scripts/create-superadmin.ts \
  --username admin \
  --email admin@raziur.com \
  --password 'YourStrongPassword!'

# Running again with same username is a safe no-op
```

## Email Templates (Phase 2)

All emails sent via Nodemailer. Templates are plain text + simple HTML.

| Event | Subject | Content |
|---|---|---|
| OTP verification | "Verify your Nexus account" | 6-digit OTP, expires in 10 minutes |
| Account approved | "Your Nexus account has been approved" | Login link |
| Password reset | "Reset your Nexus password" | 6-digit OTP, expires in 10 minutes |

## cPanel SMTP Config (Phase 2)

```env
SMTP_HOST=mail.raziur.com
SMTP_PORT=587
SMTP_USER=noreply@raziur.com
SMTP_PASS=<smtp_password>
SMTP_FROM=Nexus <noreply@raziur.com>
```

TLS: use `STARTTLS` on port 587. Do not use port 465 (SSL) — cPanel SMTP works better on 587.
