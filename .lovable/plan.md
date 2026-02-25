

# Fix Hero: Remove Badge + Make Documents More Visible

**Classification: GREEN** — Pure UI tweaks in one file.

## File: `src/components/HeroSection.tsx`

### Change 1 — Remove the "Smart Compliance Platform" badge (lines 148-160)

Delete the entire badge block:
```tsx
{/* Badge */}
<div
  className="inline-flex items-center gap-[7px] ..."
  ...
>
  <span className="w-[7px] h-[7px] ..." />
  Smart Compliance Platform
</div>
```

### Change 2 — Make falling documents more visible (line 32)

Increase the document opacity range from `0.06 + Math.random() * 0.09` (range 0.06–0.15) to `0.12 + Math.random() * 0.14` (range 0.12–0.26). This roughly doubles visibility so the raining effect is noticeable even through the vignette.

Also soften the vignette slightly (line 142) by reducing the solid center stop from 20% to 10% and the semi-opaque stop from 52% to 42%, letting more documents show through in the center area.

### Summary

| What | Before | After |
|------|--------|-------|
| Badge | Visible | Removed |
| Document opacity | 0.06–0.15 | 0.12–0.26 |
| Vignette center | 20% solid | 10% solid |

### Risk
- Single file, no backend/auth/RLS changes
- Fully reversible

