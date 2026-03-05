# Phase 3 — Email OTP + Password Reset

## Status: NOT STARTED

## Prerequisite: Phase 2 complete

## Scope

Add email verification on registration, approval notification emails, and password reset flow.
Uses Nodemailer + cPanel SMTP. No changes to the login/JWT flow.

## User Stories

- As a Visitor, I want to receive a 6-digit OTP on my email after submitting the registration form
- As a Visitor, I want the OTP to expire after 10 minutes
- As a Visitor, I want to request a new OTP if mine has expired
- As a User, I want to receive an email when my account has been approved by the admin
- As a User, I want to request a password reset by email OTP if I forget my credentials

## Schema Additions

- `otp_codes` table (already stubbed in schema.ts — activate migration)

## New API Endpoints

```
POST   /auth/verify-email         { email, otp }
POST   /auth/resend-otp           { email }
POST   /auth/forgot-password      { email }
POST   /auth/reset-password       { email, otp, newPassword }
```

## Registration Flow Change

Phase 1: register → PENDING immediately
Phase 3: register → send OTP email → verify OTP → PENDING

The rest of the flow (PENDING → admin approval → ACTIVE) is unchanged.

## Email Events

| Event | Trigger |
|---|---|
| OTP verification | POST /auth/register |
| Approval notification | Admin clicks Approve in admin panel |
| Password reset OTP | POST /auth/forgot-password |
