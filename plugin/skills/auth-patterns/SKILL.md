---
name: auth-patterns
description: Tanjiro's authentication and authorization skill. JWT, OAuth, session, RBAC patterns with security best practices. Reverse-engineered from alirezarezvani.
---

# Authentication & Authorization Patterns

## Choose Your Strategy

| Strategy | Best For | Trade-offs |
|----------|---------|-----------|
| **JWT (stateless)** | SPAs, mobile apps, microservices | No server-side revocation without blocklist |
| **Session (stateful)** | Server-rendered apps, simple auth | Requires session store (Redis/DB) |
| **OAuth 2.0** | Third-party login (Google, GitHub) | Complex flow, dependency on provider |
| **API Keys** | Service-to-service, developer APIs | No user context, key management overhead |

## JWT Pattern (Recommended for SPAs + APIs)

### Token Structure
- **Access token**: Short-lived (15 minutes), contains user ID + role
- **Refresh token**: Long-lived (7 days), stored in httpOnly cookie
- **Never store access tokens in localStorage** — use memory or httpOnly cookies

### Implementation Flow

```
Login → Verify credentials → Issue access + refresh tokens
        → Store refresh in httpOnly cookie
        → Return access token in response body

API Request → Read access token from Authorization header
           → Verify signature + expiration
           → Extract user from payload
           → Proceed with request

Token Expired → Client sends refresh token (cookie)
             → Verify refresh token
             → Issue new access + refresh tokens
             → Rotate refresh token (one-time use)

Logout → Delete refresh token from DB/blocklist
      → Clear httpOnly cookie
```

### Password Handling
- **Hash**: bcrypt (cost factor 12) or argon2id
- **NEVER**: MD5, SHA1, SHA256 for passwords
- **NEVER**: Store plain-text passwords
- **Salt**: Built into bcrypt/argon2 — don't manually salt

### RBAC (Role-Based Access Control)

```typescript
// Middleware pattern
function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Usage
app.delete('/users/:id', requireRole('ADMIN'), deleteUser);
app.get('/profile', requireRole('USER', 'ADMIN'), getProfile);
```

### OAuth 2.0 (Social Login)

Flow: Authorization Code Grant with PKCE (for SPAs)

```
1. Client redirects to provider: GET /authorize?response_type=code&client_id=...&redirect_uri=...&code_challenge=...
2. User authenticates with provider
3. Provider redirects back with code: GET /callback?code=...
4. Server exchanges code for tokens: POST /token (code + code_verifier)
5. Server creates/finds user, issues own JWT
```

## Security Checklist

- [ ] Passwords hashed with bcrypt (cost 12) or argon2id
- [ ] Access tokens expire in ≤15 minutes
- [ ] Refresh tokens are rotated on each use
- [ ] Refresh tokens stored in httpOnly, secure, sameSite cookies
- [ ] CSRF protection on cookie-based auth
- [ ] Rate limiting on login endpoint (5 attempts per minute)
- [ ] Account lockout after 10 failed attempts
- [ ] Password minimum 8 characters, check against breached password lists
- [ ] No sensitive data in JWT payload (no passwords, no PII beyond user ID)
- [ ] HTTPS only — no auth over HTTP

## Constraints

- ALWAYS use bcrypt or argon2 — never MD5/SHA for passwords
- ALWAYS use httpOnly cookies for refresh tokens — never localStorage
- ALWAYS rotate refresh tokens on use
- ALWAYS rate-limit login endpoints
- OAuth: ALWAYS use PKCE for public clients (SPAs, mobile)
- Include /login, /register, /refresh, /logout, /me endpoints minimum
