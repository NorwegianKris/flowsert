

## Remove Fixed min-h from Project Cards

Cosmetic only. 🟢

### Changes — `src/components/ProjectsTab.tsx`

1. **Card root** (line 212): Remove `min-h-[240px]` from the Card className. CSS grid's default `align-items: stretch` will make cards in the same row match the tallest card's height automatically.

2. Grids are already `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4` (lines 127, 155) — no changes needed there.

### File
- `src/components/ProjectsTab.tsx`

