

## Plan: Replace hardcoded lovable.app URLs with flowsert.com

### Findings

7 files contain `flowsert.lovable.app`. Here's the full list:

| File | Line(s) | Context |
|------|---------|---------|
| `send-notification-email/index.ts` | 23, 24 | Email link URLs |
| `send-dm-notification/index.ts` | 129 | "View Message" button href |
| `send-certificate-expiry-notifications/index.ts` | 108 | "View My Profile" button href |
| `send-project-invitation/index.ts` | 205 | "View Invitation" button href |
| `create-portal-session/index.ts` | 90 | Stripe portal return URL fallback |
| `auth-email-hook/index.ts` | 44 | `SAMPLE_PROJECT_URL` constant |
| `_shared/cors.ts` | 4 | CORS allowed origins list |

### Changes

**5 edge functions** — replace `https://flowsert.lovable.app` with `https://flowsert.com` in all email links and redirect URLs:
- `send-notification-email/index.ts` (lines 23-24)
- `send-dm-notification/index.ts` (line 129)
- `send-certificate-expiry-notifications/index.ts` (line 108)
- `send-project-invitation/index.ts` (line 205)
- `create-portal-session/index.ts` (line 90)

**1 shared utility** — `_shared/cors.ts`: keep `flowsert.lovable.app` in the CORS allowed origins list alongside `flowsert.com`, since the lovable.app preview domain still needs to make requests during development.

**1 template file** — `auth-email-hook/index.ts`: update `SAMPLE_PROJECT_URL` to `https://flowsert.com`.

After making changes, a full search will confirm zero remaining `flowsert.lovable.app` references outside of `_shared/cors.ts`.

### Risk
Edge function changes → **anchor required** (Q2). Low functional risk — string replacements only.

