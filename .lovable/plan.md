

## Plan: Handle Unlimited Caps in AI Usage Card

In the AI Usage card implementation (already planned for `src/pages/AdminDashboard.tsx`), add an unlimited check:

```typescript
const isUnlimited = cap >= 999999;
const displayCap = isUnlimited ? 'Unlimited' : cap.toString();
const remainingPct = isUnlimited ? 100 : (cap > 0 ? Math.round((Math.max(0, cap - used) / cap) * 100) : 0);
const barColor = isUnlimited ? 'bg-green-500' : (remainingPct > 50 ? 'bg-green-500' : remainingPct > 20 ? 'bg-amber-500' : 'bg-red-500');
const remainingLabel = isUnlimited ? `${used} used — Unlimited` : `${Math.max(0, cap - used)} remaining of ${cap}`;
```

- When `cap >= 999999`: label shows "{used} used — Unlimited", bar is 100% green
- Otherwise: existing depleting bar logic with color coding

This is a small addition to the already-approved AI Usage card plan. Single file change in `AdminDashboard.tsx`.

