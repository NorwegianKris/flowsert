

# Make Falling Document Cards More Visible

**Classification: GREEN** — Pure canvas rendering tweak.

## Changes in `src/components/HeroSection.tsx`

### 1. Increase document opacity range (line 32)

Change from `0.12 + Math.random() * 0.14` (range 0.12–0.26) to `0.35 + Math.random() * 0.20` (range 0.35–0.55).

### 2. Change document fill colour (line 100)

Change from `hsl(243, 30%, 96%)` to use the requested `hsla(215, 38%, 75%, <opacity>)` where opacity matches the document's opacity value. Since `globalAlpha` is already set per-document, we set the fill to `hsla(215, 38%, 75%, 1)` and let `globalAlpha` handle the per-card opacity — this gives the exact visual result requested.

### 3. Increase stroke visibility (line 102)

Change from `hsl(243, 40%, 82%)` to a stronger `hsla(215, 38%, 60%, 1)` so the border is more visible at the new opacity levels.

### 4. Increase text-line visibility (line 110)

Change from `hsl(243, 40%, 78%)` to `hsla(215, 38%, 55%, 1)` so the detail lines inside each card match the increased visibility.

| Element | Before | After |
|---------|--------|-------|
| globalAlpha range | 0.12–0.26 | 0.35–0.55 |
| Fill colour | `hsl(243, 30%, 96%)` | `hsla(215, 38%, 75%, 1)` |
| Stroke colour | `hsl(243, 40%, 82%)` | `hsla(215, 38%, 60%, 1)` |
| Line colour | `hsl(243, 40%, 78%)` | `hsla(215, 38%, 55%, 1)` |

Four single-line edits in one file. No other changes.

