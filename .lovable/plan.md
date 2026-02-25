

# Fix Falling Document Distribution and Density

**Classification: GREEN** — Pure canvas logic, single file.

## File: `src/components/HeroSection.tsx`

### 1. Increase count (line 76)
Current DOC_COUNT is 65. Multiply by 1.5 → **98**.

Change `{ length: 65 }` to `{ length: 98 }`.

### 2. Grid-based initial distribution (lines 73–81)
Replace the random x/y scatter with a grid layout:

```ts
const init = () => {
  resize();
  const rect = canvas.getBoundingClientRect();
  const count = 98;
  const cols = 8;
  const rows = Math.ceil(count / cols);
  docs = Array.from({ length: count }, (_, i) => {
    const d = createDoc(rect.width, rect.height);
    d.x = (i % cols) * (rect.width / cols) + Math.random() * (rect.width / cols);
    d.y = Math.floor(i / cols) * (rect.height / rows) + Math.random() * (rect.height / rows);
    return d;
  });
};
```

This divides the canvas into an 8-column grid and distributes documents evenly across all cells with a small random offset within each cell.

### 3. Respawn x position (already correct)
The `createDoc` function at line 28 already uses `x: Math.random() * canvasW` — fully random across the full width. The respawn logic in the draw loop calls `createDoc(rect.width, rect.height)`, so this is already correct. No change needed here.

### Summary

| Property | Before | After |
|----------|--------|-------|
| Count | 65 | 98 |
| Initial distribution | Random x/y | Grid-based (8 cols) with random offset per cell |
| Respawn x | `Math.random() * canvasW` | Same (no change) |

Single file change, no backend impact.

