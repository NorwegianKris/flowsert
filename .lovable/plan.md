

## Match Compliance Plan Bar Height to Toggle Above

Cosmetic fix. 🟢

### Analysis

The FreelancerFilters toggle row sits inside a `flex items-center` container alongside an Input (default h-10 / 40px). The toggle itself uses `bg-primary p-1 rounded-lg` with items at `py-1.5`.

The compliance plan bar uses `p-3` (12px padding top+bottom = 24px extra), making it noticeably taller.

### Fix — `src/components/CompliancePlanGenerator.tsx`

Line 210: Change the trigger bar padding from `p-3` to `px-3 py-1.5` to match the toggle's compact height.

```tsx
<div className="flex items-center justify-between px-3 py-1.5 border rounded-lg bg-primary text-primary-foreground">
```

### File
- `src/components/CompliancePlanGenerator.tsx`

