

## Add "Expiring Soon" Stat Card to ComplianceSnapshot

Cosmetic only. No schema changes. 🟢

### Changes in `src/components/ComplianceSnapshot.tsx`

**1. Import**: Add `AlertTriangle` from lucide-react.

**2. Metrics** (lines 13-31): Track `expiring` count alongside existing ones:
```tsx
let expiring = 0;
// in the loop:
} else if (status === 'expiring') {
  expiring++;
}
return { total, valid, expiring, expired };
```

**3. Stats array** (lines 34-57): Insert "Expiring Soon" card between Valid and Expired:
```tsx
{
  label: 'Expiring Soon',
  value: metrics.expiring,
  icon: AlertTriangle,
  iconBg: 'bg-amber-500/10',
  iconColor: 'text-amber-500',
},
```

**4. Grid** (line 60): Change `sm:grid-cols-3` to `sm:grid-cols-4` for 4 cards.

Single file, four small edits.

