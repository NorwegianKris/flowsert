

## Patch: Email Delivery Reliability Hotfix (Final)

🟡 Anchor Recommended. Two files changed, one config left unchanged.

---

### Final tweaks incorporated

1. **`verify_jwt` stays `true`** (default) -- no config.toml change needed. The function is only called from the app with a user session. JWT validation happens both at the gateway and in code (belt + suspenders).

2. **Deadline guard returns a single summary**, not per-recipient errors:
   - Stop the loop
   - Add one error: `{ code: "timeout_guard", message: "Stopped after 100s. Remaining: N" }`
   - Response includes `skipped: N` field for clarity

3. **De-dupe normalizes fully**: `email.trim().toLowerCase()`, filters out null/empty/missing-@ before counting or sending.

---

### File 1: `supabase/functions/send-notification-email/index.ts` (REWRITE)

**Input validation + de-dupe**
- Normalize: `email.trim().toLowerCase()`
- Filter out falsy values and strings without `@`
- De-dupe into `uniqueRecipients` array
- Hard cap: if `uniqueRecipients.length > 40`, return HTTP 400

**Correlation ID**
- `const sendId = crypto.randomUUID()` at start
- All console.log lines: `[${sendId}] ...`
- Included in response

**Sequential sending with 500ms delay**
- One email at a time, 500ms between each
- 40 max = ~28s baseline

**Single retry for 429/5xx**
- 429: read `Retry-After` (fallback 2s), wait, retry once
- 5xx: wait 1s, retry once
- Other 4xx: permanent fail
- Error codes: `rate_limited`, `server_error`, `rejected`, `client_error`, `unknown`

**Deadline guard (100s)**
- Check `Date.now() > deadline` before each send
- If hit: stop loop, add single summary error `{ index: currentIndex, code: "timeout_guard", message: "Stopped after 100s. Remaining: N" }`
- Response includes `skipped` count

**PII safety**
- Logs use `recipient ${index}` only
- Catch blocks sanitize thrown errors before logging

**Auth (unchanged pattern)**
- Validates JWT + admin role in code (same as current)
- `verify_jwt` stays `true` in config -- no config.toml change

**Response shape:**
```text
{
  send_id: "uuid",
  attempted: 38,
  sent: 36,
  failed: 1,
  skipped: 1,
  errors: [
    { index: 12, code: "rejected", message: "HTTP 422" },
    { index: 25, code: "timeout_guard", message: "Stopped after 100s. Remaining: 1" }
  ]
}
```

**Email template:** identical to current, stays in same file.

---

### File 2: `src/components/SendNotificationDialog.tsx` (MODIFY)

**Client-side de-dupe**
- Normalize emails with `trim().toLowerCase()`, filter out empty/null/no-@
- De-dupe before counting and before calling the function

**Auto-disable email above 40 unique recipients**
- Compute `uniqueEmailCount` from de-duped list
- When `sendEmail` is checked and count > 40:
  - Auto-uncheck `sendEmail`
  - Toast: "Email sending is limited to 40 recipients. In-app notification will still be sent."
- Show inline amber warning when email recipients > 40
- Send button stays enabled for in-app notification

**Surface delivery results**
- Capture response from `supabase.functions.invoke`
- All sent: toast "Email sent to X recipients"
- Some failed/skipped: warning toast "X of Y emails could not be delivered. Reference: {send_id}"
- Function error: warning toast "Emails could not be sent. In-app notification was delivered."

---

### No config.toml change

`verify_jwt` remains `true` (default). No entry needed.

---

### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/send-notification-email/index.ts` | REWRITE | De-dupe + cap 40, send_id, deadline guard with summary, sequential 500ms, retry once, PII-safe |
| `src/components/SendNotificationDialog.tsx` | MODIFY | Client-side de-dupe + normalize, auto-disable email > 40, surface results with send_id |

