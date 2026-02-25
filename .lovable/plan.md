

# Redesign Falling Document Cards in Hero Canvas

**Classification: GREEN** — Pure canvas rendering changes in one file.

## File: `src/components/HeroSection.tsx`

### 1. Update `createDoc` (lines 24–37)

- **Width**: change from `55 + Math.random() * 40` to `60 + Math.random() * 40` (range 60–100px)
- **Rotation**: change from `(Math.random() - 0.5) * 0.3` to `(Math.random() - 0.5) * (50 * Math.PI / 180)` which gives ±25 degrees

### 2. Replace the entire draw body/detail section (lines 98–179)

Replace the current card drawing and internal details with the new redesigned rendering:

**Card rendering (all types):**
1. Draw a **drop shadow** — a second `drawRoundRect` offset by (+2, +2) filled with `hsla(220, 40%, 70%, 0.15)`, no stroke
2. Draw the **card body** — `drawRoundRect` filled with `hsla(220, 40%, 97%, 0.75)`, stroked with `hsla(220, 50%, 75%, 0.6)` at `lineWidth: 1`
3. Set detail stroke to `hsla(220, 30%, 65%, 0.7)` and `lineWidth: 1.8`, `lineCap: 'round'`

**cert type — award certificate:**
- Colored header bar at top: filled rect `hsla(243, 60%, 88%, 0.8)`, height = 28% of card height
- Circle centered in header, radius 8px, stroked `hsla(243, 70%, 55%, 0.9)`
- 4 lines below header at widths 85%, 70%, 80%, 55% of card width, evenly spaced, color `hsla(220, 30%, 65%, 0.7)`

**id type — personnel card:**
- Portrait rect on left (30% card width × 45% card height)
- Inside portrait: circle for head + arc for shoulders, stroked `hsla(220, 30%, 65%, 0.7)`
- 3 short lines to the right of portrait
- Thin full-width divider line
- 2 more full-width lines below divider

**checklist type — compliance checklist:**
- Header line at 65% width at top
- 4 rows: 8×8px rounded checkbox, checkmark in first 3, line extending right
- Alternate line widths 75% and 90%

**form type — filled form:**
- Thick top line (lineWidth ~2.5) at 60% width (title)
- Thin horizontal divider full width
- 5 rows in two columns: left at 40% width, right at 40% width offset to right half

### Summary of visual changes

| Element | Before | After |
|---------|--------|-------|
| Card fill | `hsla(215, 38%, 75%, 0.5)` | `hsla(220, 40%, 97%, 0.75)` (white) |
| Card stroke | `hsla(215, 42%, 55%, 0.45)`, lw 1.8 | `hsla(220, 50%, 75%, 0.6)`, lw 1 |
| Drop shadow | none | offset rect `hsla(220, 40%, 70%, 0.15)` |
| Detail color | `hsla(215, 42%, 55%, 0.45)` | `hsla(220, 30%, 65%, 0.7)` |
| Width range | 55–95px | 60–100px |
| Rotation | ±~8.6° | ±25° |
| cert details | simple circle + lines | header bar + centered circle + 4 sized lines |
| id details | rect + lines | portrait with silhouette + divider + lines |
| checklist | 7×7 boxes, 2 checked | 8×8 rounded boxes, 3 checked, header line |
| form | 5 random lines | title line + divider + 2-column layout |

Single file, no backend changes.

