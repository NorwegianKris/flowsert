

# Fix Content Scaling on Ultra-Wide Screens

## What This Does
Adds 3 CSS media queries to automatically scale up the entire UI on ultra-wide monitors (like your 49" Samsung), so everything looks proportional without needing manual browser zoom.

## Why It's Safe
- Only 1 file changed, only CSS, no logic
- Normal screens (under 2000px) are completely unaffected
- Instantly reversible by removing 3 lines

## Change

### `src/index.css`
Add at the end of the file:

```css
@media (min-width: 2000px) {
  html { font-size: 120%; }
}
@media (min-width: 2800px) {
  html { font-size: 140%; }
}
@media (min-width: 3800px) {
  html { font-size: 160%; }
}
```

This progressively scales the base font size on wider screens. Since all Tailwind spacing and typography uses `rem` units, the entire UI scales proportionally.

| Screen width | Scale | Example |
|---|---|---|
| Under 2000px | 100% (no change) | 14" laptop |
| 2000-2800px | 120% | 27" 1440p |
| 2800-3800px | 140% | 32" 4K |
| 3800px+ | 160% | 49" ultrawide |

