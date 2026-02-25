

# Enterprise Callout — Add "Contact support" with SPA Navigation

One edit, one file, UI-only.

## Edit A — Add actionable button with same-tab navigation

**File:** `src/components/BillingSection.tsx` **Lines 248–255**

Replace the static Enterprise callout with an actionable version using React Router's `useNavigate` for clean SPA navigation:

```tsx
{effectiveEntitlement?.is_unlimited && (
  <div className="rounded-md border border-border/50 bg-muted/30 p-4 space-y-3">
    <div className="space-y-1">
      <p className="text-sm font-medium">Enterprise Plan — Manual Billing</p>
      <p className="text-xs text-muted-foreground">
        You're on an Enterprise plan with manual billing. Contact us to change your agreement.
      </p>
    </div>
    <Button
      variant="outline"
      size="sm"
      className="text-xs"
      onClick={() => navigate('/contact')}
    >
      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
      Contact support
    </Button>
  </div>
)}
```

Also requires adding `useNavigate` import and hook call:

- **Line 1 area** — add `import { useNavigate } from 'react-router-dom';`
- **Inside the component body** (before the existing `fetchData` callback) — add `const navigate = useNavigate();`

Same-tab navigation keeps the user inside the app shell. `ExternalLink` icon is already imported. No new dependencies.

## Risk
UI copy only. No database, RLS, auth, edge function, or migration changes.

