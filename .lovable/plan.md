

# Option A: Stripe Portal as Single Source of Plan Changes

**Classification: GREEN** — Three small edits in one file, pure UI conditional rendering.

## File: `src/components/BillingSection.tsx`

### Change 1 — Add derived helpers (after line 91, below `hasActiveSub`)

Insert four new lines:

```tsx
const hasSubscriptionRow = !!effectiveSubscription;
const isEnterprise = !!effectiveEntitlement?.is_unlimited;
const isDelinquent = ['past_due', 'unpaid', 'incomplete', 'incomplete_expired'].includes(effectiveSubscription?.status ?? '');
const isPortalManaged = hasSubscriptionRow && !isEnterprise && !isDelinquent;
```

### Change 2 — Update plan cards guard (line ~240)

Replace:
```tsx
{!hasActiveSub && !effectiveEntitlement?.is_unlimited && (
```
With:
```tsx
{!hasSubscriptionRow && !isEnterprise && (
```

### Change 3 — Insert helper callout (before the Manage Billing button block at line ~273)

```tsx
{isPortalManaged && (
  <div className="rounded-md border border-border/50 bg-muted/30 p-4 space-y-1">
    <p className="text-sm font-medium">Plan changes happen in billing</p>
    <p className="text-xs text-muted-foreground">
      Upgrades, downgrades, and cancellations are managed in the billing portal.
    </p>
  </div>
)}
```

### Acceptance matrix

| State | Plan cards | Helper callout | Manage Billing | Fix billing | Enterprise callout |
|-------|-----------|---------------|---------------|------------|-------------------|
| No subscription row | Visible | Hidden | Hidden | Hidden | Hidden |
| Active / trialing | Hidden | Visible | Visible | Hidden | Hidden |
| canceled (row exists) | Hidden | Visible | Visible | Hidden | Hidden |
| past_due / unpaid / incomplete | Hidden | Hidden | Visible | Visible | Hidden |
| Enterprise (is_unlimited) | Hidden | Hidden | Hidden | Hidden | Visible |

Note: `canceled` is treated as portal-managed (not delinquent), so the helper callout appears — the user can resubscribe via Stripe portal.

### Risk

- No database, RLS, auth, or edge function changes
- Three edits in one file, all conditional rendering
- Fully reversible

