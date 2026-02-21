

## Fix: Overview Toggle Color to Match Main Toggle Bar

**Risk: 🟢 GREEN** — CSS-only change, no backend or data affected.

---

### Problem

The Overview toggle (All / Employees / Freelancers / Custom) in `ComplianceSnapshot.tsx` currently has a solid purple background with white text when active (`bg-primary text-primary-foreground`). The user wants it to match the main categories toggle bar style: **white background with purple text**.

### Solution

**File:** `src/components/ComplianceSnapshot.tsx`

Change the active state on all four `ToggleGroupItem` elements from:
```
data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm
```
to:
```
data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm
```

This applies to lines 159, 167, 174, and 181 (the All, Employees, Freelancers, and Custom toggle items).

---

### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/components/ComplianceSnapshot.tsx` | MODIFY | White background + purple text on active toggle items |

