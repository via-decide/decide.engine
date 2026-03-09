# Plan: Wrap Your GPT with Email Verification + Controlled Access

## Goal
Create a secure wrapper flow so users must verify email before they can access your GPT experience.

Because direct access to a shared ChatGPT link cannot be reliably permission-gated by your own app alone, the wrapper should control **entry, identity, entitlement, and usage tracking**.

> Chosen approach for this project: **Option A (full API wrapper)** with beta onboarding via **dharam@viadecide.com**.

---

## 1) Product Decisions (Before Build)

1. **Access model**
   - Public sign-up + email verification + optional waitlist approval
   - Invite-only with pre-approved email domain/list
   - Paid access (Stripe) + verified email required

2. **Session model**
   - Short-lived app session JWT (15–60 min)
   - Refresh token in HttpOnly cookie
   - Optional device limit per user

3. **GPT delivery model (selected)**
   - **Option A (Selected): API wrapper app**
     - Build your own chat UI and call OpenAI API server-side.
     - Full control over verification, quotas, audit logs, and revocation.
   - **Option B (Not selected): Redirect to ChatGPT shared/custom GPT URL after verification**
     - Simpler, but weaker control once user reaches ChatGPT directly.
     - Can reduce casual leakage with signed one-time links + expiry, but cannot fully prevent sharing.

---

## 2) Target Architecture

## Frontend
- Landing page with "Continue with Email"
- Verify-email page (OTP or magic link callback)
- App shell/chat page behind authenticated route guard
- Usage/quota widget + account settings
- Beta CTA block on the website with a prefilled `mailto:dharam@viadecide.com` join request

## Backend (serverless-friendly)
- `POST /auth/start` → send OTP/magic link
- `POST /auth/verify` → verify token/code
- `POST /auth/refresh` → rotate session
- `POST /auth/logout`
- `GET /me` → identity + entitlement
- `POST /chat` → proxied GPT interaction (if Option A)

## Data Model
- `users(id, email, email_verified_at, status, created_at)`
- `email_verifications(id, user_id, code_hash, expires_at, attempts, consumed_at)`
- `sessions(id, user_id, refresh_hash, expires_at, ip, ua)`
- `entitlements(id, user_id, plan, active, expires_at)`
- `usage_events(id, user_id, event_type, tokens, created_at)`
- `audit_logs(id, actor_user_id, action, metadata, created_at)`

---

## 3) Email Verification Flow (Hardened)

1. User enters email at `/auth/start`
2. Normalize email (lowercase, trim, optional plus-alias policy)
3. Rate-limit by IP + email (e.g., 5/min, 20/day)
4. Generate random code/token; store **hash only** (never plaintext)
5. Send via provider mailbox (primary contact: `dharam@viadecide.com`)
6. User submits code/clicks magic link to `/auth/verify`
7. Verify hash with constant-time compare and check expiry/attempt count
8. Mark verification consumed and set `email_verified_at`
9. Issue session cookies (HttpOnly, Secure, SameSite=Lax/Strict)
10. Redirect to protected app route

Security controls:
- Single-use verification tokens
- 10–15 minute expiry
- Lockout after N failed attempts
- Replay protection (consumed_at)
- Audit logging for send/verify failures

---

## 4) Access Control Layer

Gate all protected routes and APIs by:
1. Authenticated session
2. Verified email
3. Active entitlement (if paid/private)

Pseudocode policy:
- `if !session => 401`
- `if !email_verified_at => 403 verify_required`
- `if !entitlement.active => 402/403 plan_required`
- else allow

---

## 5) GPT Integration Strategy

## Option A (Selected): Fully Wrapped GPT via API
- Your backend receives user prompt
- Adds system instructions / policy
- Calls OpenAI Responses/Chat API
- Streams tokens back to UI
- Logs usage + enforces limits

Pros:
- Real ownership of access control
- Easy to revoke users
- Better analytics and moderation

## Option B (Not selected): Guarded Redirect to Shared GPT Link
- After verification, issue short-lived signed redirect token
- `GET /gpt-entry?token=...` validates token, then redirects to ChatGPT link
- Burn token after first use

Limitations:
- User can still share final destination URL
- Limited observability once off-site

---

## 6) Phased Implementation Plan

## Phase 0 — Foundation (1–2 days)
- Choose provider stack (DB + email + auth library)
- Define env vars/secrets and rotation policy
- Add baseline monitoring (Sentry/Logtail)

Deliverables:
- Architecture doc
- `.env.example` with required keys
- Threat model checklist

## Phase 1 — Verification MVP (2–3 days)
- Build `/auth/start` and `/auth/verify`
- Implement OTP or magic-link templates
- Add basic verified-session middleware
- Protect one test route `/app`

Acceptance:
- Unverified user blocked
- Verified user reaches `/app`
- Expired token rejected

## Phase 2 — GPT Access Wrapper (2–4 days)
- Implement Option A or B
- Add route guard + entitlement checks
- Add abuse protections (rate limit, bot checks)

Acceptance:
- Only verified users can reach GPT experience
- Revoked user blocked immediately

## Phase 3 — Production Hardening (2–3 days)
- Add refresh token rotation + session revocation
- Add audit dashboards + alerts
- Add legal pages (ToS/Privacy) and consent capture

Acceptance:
- Security checklist passed
- Monitoring alert fires on auth anomalies

## Phase 4 — Growth & Ops (ongoing)
- Cohort analytics (activation after verification)
- A/B test onboarding copy
- Add referral/invite workflows

---

## 7) Recommended Tech Stack (Practical)

- Frontend: Next.js or existing static frontend + protected app page
- Backend: Node serverless functions (fits current repo style)
- DB: Postgres (Supabase/Neon) or DynamoDB
- Email: Resend/Postmark/SES
- Auth helpers: custom + jose/jsonwebtoken, or Clerk/Auth.js/Supabase Auth
- Rate limiting: Upstash Redis or provider-native edge limits

---

## 8) API Contract Sketch

- `POST /api/auth/start`
  - body: `{ email }`
  - response: `{ ok: true }` (always generic)

- `POST /api/auth/verify`
  - body: `{ email, code }` or `{ token }`
  - response: `{ ok: true, user, requiresPlan?: boolean }`

- `GET /api/me`
  - response: `{ user, verified: true, entitlement }`

- `POST /api/chat`
  - body: `{ messages, conversationId }`
  - response: streamed model output

---

## 9) Security & Compliance Checklist

- SPF/DKIM/DMARC configured for sending domain
- HttpOnly + Secure cookies only
- CSRF protection on state-changing routes
- CORS locked to your domains
- Input schema validation on every endpoint
- PII minimization + retention policy
- GDPR/India DPDP compliance review (depending on audience)

---

## 10) Rollout Plan

1. Internal beta (10 users)
2. Closed alpha (invite list)
3. Public launch with rate caps
4. Weekly security review + abuse tuning

Key metrics:
- verification success rate
- time-to-first-response after verify
- abuse rate (blocked events / total)
- retention (D1/D7)

---

## Immediate Next Actions (This Week)

1. Start Phase 1 with **Option A** only (no redirect-guard implementation).
2. Configure outbound auth emails and beta intake mailbox for `dharam@viadecide.com`.
3. Implement `/api/auth/start` and `/api/auth/verify`, then protect `/app`.
4. Add a minimal admin page to revoke users and view verification logs.
5. Run small invite-only pilot before broad release.

---

## 11) Monetization Plan for the Main GPT

Target asset:
- Main GPT entry currently referenced as a shared GPT link.

Monetization model (recommended):
1. **Free tier (verified email only)**
   - Limited daily prompts (e.g., 10/day)
   - Basic response depth
2. **Pro monthly** (e.g., ₹499–₹1499/month)
   - Higher/uncapped usage
   - Priority model settings and faster responses
   - Access to premium templates/workflows
3. **Team plan** (₹2999+/month)
   - Shared seats, org billing, usage controls
   - Audit export and admin controls

Revenue controls to implement:
- Stripe/Razorpay subscription status mapped to `entitlements`
- Grace period + retry logic for failed renewals
- Hard usage caps by plan (`usage_events`-driven)
- Optional prepaid credits for heavy users

Pricing experiment sequence:
- Week 1: Pro at ₹999 with 7-day trial
- Week 2: A/B ₹699 vs ₹1199
- Week 3: Add annual plan with 2 months free

---

## 12) Delivery Plan: How Users Get Access

1. **Discovery**
   - User lands on ViaDecide page and clicks GPT beta CTA.
2. **Intake**
   - User submits email (or sends mail to `dharam@viadecide.com` during beta).
3. **Verification**
   - OTP/magic link verification completes.
4. **Checkout / Entitlement**
   - Free plan auto-provision OR paid checkout for Pro/Team.
5. **Activation**
   - Redirect to `/app` (your wrapped GPT UI, not direct shared link).
6. **Ongoing access**
   - Session refresh + entitlement checks on every protected route/API.
7. **Retention**
   - Usage nudges, upgrade prompts at cap threshold, reactivation campaigns.

Onboarding UX must include:
- “What you can do” quickstart prompts
- Remaining quota indicator
- Upgrade CTA at 70% quota usage
- Support contact + cancellation clarity

---

## 13) 14-Day Execution Sprint (Practical)

Day 1–2:
- Finalize plan limits, pricing, and payment provider.
- Define entitlement states: `free`, `pro`, `team`, `past_due`, `revoked`.

Day 3–5:
- Build auth start/verify + session issue.
- Add `/api/me` and middleware checks.

Day 6–8:
- Build `/api/chat` wrapper with per-plan rate limits.
- Add usage metering and soft/hard caps.

Day 9–10:
- Integrate checkout + webhook handling (activate/revoke entitlements).
- Add billing/account page.

Day 11–12:
- Add analytics events: signup, verify, first prompt, cap hit, upgrade.
- Launch invite-only pilot (20–50 users).

Day 13–14:
- Fix onboarding friction from pilot.
- Public beta release with measured caps.

---

## 14) KPI Dashboard (Must Track)

- Visitor → verified conversion (%)
- Verified → first prompt activation (%)
- Free → Pro conversion (%)
- ARPU / MRR
- Gross margin per paid user (model cost vs revenue)
- Churn (monthly)
- Average response cost per request

Guardrail thresholds:
- If model cost > 35% of Pro revenue, tighten caps or raise price.
- If verification drop-off > 40%, simplify OTP/magic link UX.
- If first-day activation < 50%, improve quickstart prompts.
