

## Two UI Text Changes

Item 3 (Employment Type dropdown) already exists in `AddPersonnelDialog.tsx` — no work needed there.

### Change 1: Conditional subtitle on invitation landing page

**File:** `src/pages/InviteAccept.tsx`, lines 158-160

Replace the static text `"Log in or create an account to accept this invitation."` with conditional text based on `hasExistingAccount`:

- `false` → `"Create your account to join {preview.business_name}."`
- `true` → `"Log in to accept your invitation to join {preview.business_name}."`
- `null` → Keep existing fallback text

### Change 2: Remove role from registration banner

**File:** `src/pages/Auth.tsx`, lines 951-955

Change:
```
You're joining <strong>{invitationDetails.businessName}</strong> as <span className="capitalize">{invitationDetails.role}</span>
```
To:
```
You're joining <strong>{invitationDetails.businessName}</strong>
```

### Risk assessment
- Both changes are purely UI text/layout — **🟢 no anchor required**.
- No SQL, no RLS, no auth changes.

