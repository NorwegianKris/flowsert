

# Elite SaaS Polish — Ready to Ship

All line numbers verified. Five edits, two files, UI-only.

## Edit A — Enterprise status + tier-aware CTA
**File:** `src/components/ActivationOverview.tsx` **Lines 184–185**

Replace:
```ts
const statusBadge = getStatusBadgeProps(subscriptionStatus);
const hasKnownSubscription = typeof subscriptionStatus === 'string';
```
With:
```ts
const statusBadge = effectiveEntitlement?.is_unlimited && subscriptionStatus === null
  ? { label: 'Manual', variant: 'secondary' as const }
  : getStatusBadgeProps(subscriptionStatus);
const hasKnownSubscription = typeof subscriptionStatus === 'string';

const ctaLabel = effectiveEntitlement?.is_unlimited
  ? 'Manage billing'
  : hasKnownSubscription
    ? 'Manage plan'
    : 'Choose plan';
const ctaVariant = effectiveEntitlement?.is_unlimited || hasKnownSubscription ? 'outline' : 'default';
```

## Edit B — Current Plan to top, delete redundant summary
**File:** `src/components/ActivationOverview.tsx` **Lines 191–206**

Replace the entire old summary block (Active/billable/progress) through `{isOverCap && (` with the new Current Plan card that ends with `{isOverCap && (`:

```tsx
          {/* Current Plan Summary */}
          <div className="rounded-lg border border-border/50 p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Current Plan</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Plan</p>
                <Badge variant="secondary" className="mt-1 text-xs">{planLabel}</Badge>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Usage</p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {effectiveActiveCount ?? '—'} / {capDisplay}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</p>
                <Badge variant={statusBadge.variant} className="mt-1 text-xs">{statusBadge.label}</Badge>
              </div>
            </div>
            {!effectiveEntitlement?.is_unlimited && (
              <Progress value={progressPercent} className="h-2" />
            )}
            <Button
              variant={ctaVariant as 'outline' | 'default'}
              size="sm"
              className="w-full text-xs"
              onClick={() => onChoosePlan?.()}
            >
              {ctaLabel}
            </Button>
            <p className="text-xs text-muted-foreground">
              Only active profiles count toward your limit.
            </p>
          </div>

          {isOverCap && (
```

The `{isOverCap && (` line continues into the existing warning block — braces match exactly as before.

## Edit C — Delete old bottom Current Plan block
**File:** `src/components/ActivationOverview.tsx` **Lines 329–361**

Delete everything from `{/* Current Plan Summary */}` through the empty line before `{/* Terms & Conditions */}`, leaving only:
```tsx
          {/* Terms & Conditions */}
```

## Edit D — Enterprise "Manual" in trigger row
**File:** `src/pages/AdminDashboard.tsx` **Line 173**

Replace:
```ts
if (!liftedSubscription) return <Badge variant="outline">No plan</Badge>;
```
With:
```ts
if (!liftedSubscription) {
  if (liftedEntitlement?.is_unlimited) return <Badge variant="secondary">Manual</Badge>;
  return <Badge variant="outline">No plan</Badge>;
}
```

## Edit E — Header pill past-due consistency
**File:** `src/pages/AdminDashboard.tsx` **Line 757**

Replace:
```ts
{['past_due', 'unpaid'].includes(liftedSubscription?.status ?? '') && (
```
With:
```ts
{['past_due', 'unpaid', 'incomplete', 'incomplete_expired'].includes(liftedSubscription?.status ?? '') && (
```

## Risk
UI layout and copy only. No database, RLS, auth, edge function, or migration changes.

