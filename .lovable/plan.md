

# Separate Canceled from Delinquent — Dedicated Callout

**Classification: GREEN** — Pure UI conditional changes in one file.

## File: `src/components/BillingSection.tsx`

### Change 1 — Add `isCanceled` and update `isPortalManaged` (lines 94-95)

Replace:
```tsx
const isDelinquent = ['past_due', 'unpaid', 'incomplete', 'incomplete_expired'].includes(effectiveSubscription?.status ?? '');
const isPortalManaged = hasSubscriptionRow && !isEnterprise && !isDelinquent;
```

With:
```tsx
const isDelinquent = ['past_due', 'unpaid', 'incomplete', 'incomplete_expired'].includes(effectiveSubscription?.status ?? '');
const isCanceled = effectiveSubscription?.status === 'canceled';
const isPortalManaged = hasSubscriptionRow && !isEnterprise && !isDelinquent && !isCanceled;
```

### Change 2 — Fix billing CTA uses `isDelinquent` directly; add canceled callout (lines 240-251)

Replace the entire "Fix billing CTA" block:
```tsx
{effectiveSubscription && !effectiveSubscription.cancel_at_period_end &&
 ['past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'canceled'].includes(effectiveSubscription.status ?? '') && (
  <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3">
    <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
    <span className="text-sm text-destructive">Your subscription needs attention.</span>
    <Button size="sm" variant="destructive" onClick={handleManageBilling}
      disabled={portalLoading} className="ml-auto">
      {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fix billing'}
    </Button>
  </div>
)}
```

With:
```tsx
{/* Fix billing CTA for delinquent statuses */}
{effectiveSubscription && !effectiveSubscription.cancel_at_period_end && isDelinquent && (
  <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3">
    <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
    <span className="text-sm text-destructive">Your subscription needs attention.</span>
    <Button size="sm" variant="destructive" onClick={handleManageBilling}
      disabled={portalLoading} className="ml-auto">
      {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fix billing'}
    </Button>
  </div>
)}

{/* Canceled subscription callout */}
{isCanceled && !isEnterprise && (
  <div className="flex items-center gap-2 rounded-md bg-muted/50 border border-border/50 p-3">
    <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" />
    <span className="text-sm text-muted-foreground">Your subscription has been canceled. Restart it in the billing portal.</span>
    <Button size="sm" variant="outline" onClick={handleManageBilling}
      disabled={portalLoading} className="ml-auto">
      {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Manage Billing'}
    </Button>
  </div>
)}
```

### Updated acceptance matrix

| State | Plan cards | Portal callout | Canceled callout | Fix billing | Manage Billing | Enterprise callout |
|-------|-----------|---------------|-----------------|------------|---------------|-------------------|
| No subscription | Visible | Hidden | Hidden | Hidden | Hidden | Hidden |
| Active/trialing | Hidden | Visible | Hidden | Hidden | Visible | Hidden |
| Canceled | Hidden | Hidden | **Visible** | Hidden | Visible | Hidden |
| Delinquent | Hidden | Hidden | Hidden | **Visible** | Visible | Hidden |
| Enterprise | Hidden | Hidden | Hidden | Hidden | Hidden | Visible |

### Risk
- No database, RLS, auth, or edge function changes
- Two edits in one file, all conditional rendering
- Fully reversible

