

# Fix Hero Canvas: Distribution + 6 Document Types

**Classification: GREEN** — Pure canvas rendering, single file.

## File: `src/components/HeroSection.tsx`

### 1. Update type system (lines 10–11)

Change from 4 types to 6:
```ts
type DocType = 'cert' | 'id' | 'checklist' | 'form' | 'badge' | 'passport';
const DOC_TYPES: DocType[] = ['cert', 'id', 'checklist', 'form', 'badge', 'passport'];
```

### 2. Update `createDoc` (lines 24–37)

- **Speed range**: change from `0.15 + Math.random() * 0.3` (0.15–0.45) to `0.3 + Math.random() * 0.9` (0.3–1.2)
- **Respawn y**: change to `y: -h - Math.random() * 200`
- **Type selection**: `DOC_TYPES[Math.floor(Math.random() * DOC_TYPES.length)]`

### 3. Replace `init` function (lines 73–85)

Remove grid-based distribution entirely. Use fully random positions with staggered y:

```ts
const init = () => {
  resize();
  const rect = canvas.getBoundingClientRect();
  const count = 78;
  docs = Array.from({ length: count }, () => {
    const d = createDoc(rect.width, rect.height);
    d.x = Math.random() * rect.width;
    d.y = Math.random() * rect.height * 1.5 - rect.height * 0.5;
    return d;
  });
};
```

### 4. Add two new document type renderers (after line 267, inside draw loop)

**badge type** — small square-ish card:
- Large circle centered, radius = 35% of card width, stroked in detail color
- 2 short centered lines below the circle

**passport type** — wide landscape card:
- Thick line at top (title), lineWidth ~2.5, at 60% width
- Thin full-width divider
- Grid of 6 small rectangles (2 rows x 3 cols) representing data fields

### Summary

| Change | Before | After |
|--------|--------|-------|
| Types | 4 (cert, id, checklist, form) | 6 (+badge, +passport) |
| Speed range | 0.15–0.45 | 0.3–1.2 |
| Init distribution | Grid-based (8 cols) | Fully random with staggered y |
| Respawn y | `-h - random * canvasH * 0.6` | `-h - random * 200` |

Single file, no backend changes.

