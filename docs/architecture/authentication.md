# Authentication & Session Strategy

## Overview

Authentication verifies identity and controls access to Forge for the private 45-member learning community.

---

## Confirmed Strategy (ADR 0004)

1. **Pre-Seeded Member Accounts**: Since all 45 community members are already known, public registration is **NOT** supported. Accounts are pre-created via database seeds or admin creation.
2. **Simple & Secure Login**: Members log in using their pre-assigned email and password.
3. **Session Cookies (HTTP-only)**: Secure, HTTP-only cookie-based sessions for simple, transparent authentication in Express.js without managing manual JWT token storage on the client.
4. **Role Enforcement**: Middleware checks every request to verify active session and role (`MEMBER` vs `ADMIN`).

---

## Architectural Benefits

- **Zero Friction**: No unneeded signup forms or public user validation.
- **Maximum Privacy**: Prevents unauthorized external users from creating accounts on the platform.
