

# Two Targeted Fixes — Status Redundancy + Enterprise-Aware Billing

All line numbers verified against current codebase. Four edits across two files, purely UI.

---

## Fix 1: Hide Status column when Manual

**File:** `src/components/ActivationOverview.tsx`

### Edit A — Add `isManual` flag + conditional grid (lines 194–217)

After `ctaVariant` (line 194), insert `isManual` flag. Then replace the fixed `grid-cols-3` block with a conditional layout.

**Line 194** — append after:
```ts
const isManual = effectiveEntitlement?.is_unlimited && subscriptionStatus === null;
```

**Lines 203–217** — replace with:
```tsx
<div className={`grid ${isManual ? 'grid-cols-2 gap-4' : 'grid-cols-3 gap-3'}`}>
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
  {!isManual && (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</p>
      <Badge variant={statusBadge.variant} className="mt-1 text-xs">{statusBadge.label}</Badge>
    </div>
  )}
</div>
```

Uses `isManual` (the condition that produced "Manual") instead of checking the label string — robust against future label renames. Uses `gap-4` for the 2-col layout so it doesn't feel tighter than the 3-col version.

---

## Fix 2: Enterprise-Aware Billing

**File:** `src/components/BillingSection.tsx`

### Edit B — Status label + title-case tier (lines 152–154, 183)

**Lines 152–154** — replace status label with enterprise-aware version:
```ts
const status = effectiveSubscription?.status?.trim();
const statusLabel = status
  ? status.charAt(0).toUpperCase() + status.slice(1)
  : effectiveEntitlement?.is_unlimited
    ? 'Manual billing'
    : 'No subscription';
```

**Line 183** — replace tier display (remove `capitalize` class, use explicit logic):
```tsx
<p className="text-lg font-semibold">
  {effectiveEntitlement?.is_unlimited
    ? 'Enterprise'
    : (effectiveEntitlement?.tier
        ? effectiveEntitlement.tier.charAt(0).toUpperCase() + effectiveEntitlement.tier.slice(1)
        : 'Starter')}
</p>
```

### Edit C — Enterprise callout + hide plan cards (lines 238–280)

Replace the `{!hasActiveSub && (` block with:
```tsx
{/* Enterprise callout */}
{effectiveEntitlement?.is_unlimited && (
  <div className="rounded-md border border-border/50 bg-muted/30 p-4 space-y-2">
    <p className="text-sm font-medium">Enterprise Plan — Manual Billing</p>
    <p className="text-xs text-muted-foreground">
      You're on an Enterprise plan with manual billing. Contact us to change your agreement.
    </p>
  </div>
)}

{/* Subscribe buttons (only for non-enterprise without active/trialing subscription) */}
{!hasActiveSub && !effectiveEntitlement?.is_unlimited && (
  <div className="space-y-4">
    {/* existing Choose a Plan header + toggle + plan card grid — unchanged */}
  </div>
)}
```

Enterprise accounts see a clean callout. Self-serve accounts without an active subscription still see "Choose a Plan" as before.

---

## What changes after implementation

| Surface | Before | After |
|---------|--------|-------|
| Current Plan card (Enterprise) | 3-col with redundant "Status: Manual" | 2-col: Plan + Usage only |
| Current Plan card (self-serve) | 3-col with Status | Unchanged |
| BillingSection tier | `enterprise` (lowercase) | `Enterprise` (title-case) |
| BillingSection status (Enterprise, no sub) | `No subscription` | `Manual billing` |
| BillingSection plan cards (Enterprise) | "Choose a Plan" + 3 tier cards | Enterprise callout |

## Risk
UI layout and copy only. No database, RLS, auth, edge function, or migration changes.

