

# Overhaul Canvas Falling Documents

**Classification: GREEN** — Pure canvas rendering changes in one file.

## File: `src/components/HeroSection.tsx`

### Overview

Replace the current simple falling-rectangle animation with a richer system: 4 document types (cert, id, checklist, form), each drawing distinct internal details via canvas strokes. Increase count to 65, widen size range to 55–95px, and use the specified opacity/colour values.

### Data Model Change

Add a `docType` field to `FallingDoc`:

```ts
interface FallingDoc {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  docType: 'cert' | 'id' | 'checklist' | 'form';
}
```

Remove the old `lines` field — each type draws its own internal detail.

### `createDoc` Changes

- **Width**: `55 + Math.random() * 40` (range 55–95px)
- **Height**: `w * (1.3 + Math.random() * 0.4)` (unchanged ratio)
- **x**: `Math.random() * canvasW` (full width, unchanged)
- **y**: `-h - Math.random() * canvasH * 0.6` (for respawns; initial scatter handled separately)
- **opacity**: removed from doc — will be set as a constant `0.5` via `globalAlpha` (per spec: fill `hsla(215,38%,75%,0.5)`)
- **docType**: randomly pick one of `['cert','id','checklist','form']`

### Init Change (line 74)

- Count: `65` instead of `18`
- Initial y: `Math.random() * rect.height` (already does this, just confirming)

### Draw Loop Changes

For each document:

1. **Body**: `drawRoundRect` with fill `hsla(215, 38%, 75%, 0.5)` and stroke `hsla(215, 42%, 55%, 0.45)`, `lineWidth: 1.8`, `lineCap: 'round'`
2. **`globalAlpha`**: set to `1` (opacity is baked into the hsla colours directly)
3. **Internal detail** based on `docType`:

**cert**:
- Small circle (radius 5px) at top-left area (~`-w/2 + 12`, `-h/2 + 14`)
- 4 horizontal lines below it at varying widths

**id**:
- Small filled rectangle (portrait placeholder) on left third (~`-w/2 + 5`, `-h/2 + 8`, width `w*0.28`, height `w*0.35`)
- 3 short lines to its right
- 2 full-width lines below

**checklist**:
- 4 rows, each with a 7×7 square checkbox at left
- Checkmark stroke inside top 2 checkboxes
- Horizontal line extending right from each checkbox

**form**:
- 5 horizontal lines of slightly varying widths

All internal strokes use `hsla(215, 42%, 55%, 0.45)`, `lineWidth: 1.8`, `lineCap: 'round'`.

### Respawn

When a doc falls off screen (`d.y > rect.height + d.h`), call `createDoc(rect.width, rect.height)` which already uses `x: Math.random() * canvasW` — full width distribution confirmed.

### Summary of Values

| Property | Before | After |
|----------|--------|-------|
| DOC_COUNT | 18 | 65 |
| Width range | 38–66px | 55–95px |
| Fill | `hsla(215,38%,75%,1)` + globalAlpha 0.35–0.55 | `hsla(215,38%,75%,0.5)` globalAlpha 1 |
| Stroke | `hsla(215,38%,60%,1)` | `hsla(215,42%,55%,0.45)` |
| lineWidth | 0.7 | 1.8 |
| lineCap | default (butt) | round |
| Internal detail | generic fillRect lines | 4 distinct doc types with stroked details |
| x distribution | `Math.random() * canvasW` | same (confirmed full width) |
| Initial y | `Math.random() * rect.height` | same (confirmed full scatter) |

Single file change, no backend impact.

