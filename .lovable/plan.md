

# Responsive Hero Section Scaling

**Classification: GREEN** — Pure UI/canvas styling, single file.

## File: `src/components/HeroSection.tsx`

### 1. Wrap content in a max-width container (lines 325–442)

Replace the separate content div, dashboard div, and industry strip with a single `.hero-inner` wrapper inside the outer container. This wrapper gets:
- `max-width: 900px`, `width: 100%`, `margin: 0 auto`
- `padding: 0 clamp(24px, 5vw, 80px)`
- Flex column, centered items

The outer div keeps `overflow-hidden`, `relative`, canvas, and vignette. The inner wrapper contains: text content, buttons, dashboard card, and industry strip.

### 2. Fluid typography (multiple lines)

| Element | Before | After |
|---------|--------|-------|
| H1 (line 331) | `clamp(2.5rem, 5.8vw, 4rem)` | `clamp(2rem, 4vw, 4.5rem)` |
| Subhead (line 357) | `1.05rem` | `clamp(0.95rem, 1.4vw, 1.15rem)` |
| Buttons (lines 375, 388) | `0.92rem` | `clamp(0.85rem, 1.1vw, 1rem)` |
| Industry strip (line 435+) | `0.975rem` | `clamp(0.7rem, 1vw, 1rem)` |

### 3. Dashboard card fluid width (line 402–403)

Change `max-w-[660px]` to inline style `maxWidth: 'min(660px, 88vw)'`. Remove `px-6` since the parent wrapper handles padding.

### 4. Dynamic canvas DOC_COUNT (line 76)

Replace `const count = 78` with:
```ts
const count = Math.floor((rect.width * rect.height) / 28000);
```

### 5. Fluid vertical spacing (lines 312, 329, 355, 368, 402, 432)

| Gap | Before | After |
|-----|--------|-------|
| Hero top padding (line 312) | `paddingTop: '96px'` | `paddingTop: 'clamp(60px, 10vh, 120px)'` |
| H1 margin-bottom (line 329) | `mb-5` | style `marginBottom: 'clamp(12px, 2vh, 24px)'` |
| Subhead margin-bottom (line 355) | `mb-[34px]` | style `marginBottom: 'clamp(20px, 3vh, 40px)'` |
| CTA row margin-bottom (line 368) | `mb-[52px]` | style `marginBottom: 'clamp(32px, 5vh, 60px)'` |

### 6. Ultrawide canvas spawn capping (lines 28, 79)

In both `createDoc` and init scatter, cap x spawn to center 85%:
```ts
const spawnMargin = canvasW * 0.075;
x: spawnMargin + Math.random() * (canvasW - spawnMargin * 2)
```

### Summary of all changes

Single file (`HeroSection.tsx`), no backend impact. Changes:
- Add inner wrapper div with max-width 900px
- 4 fluid font-size replacements
- 4 fluid spacing replacements  
- Dynamic document count based on canvas area
- Ultrawide spawn margin (center 85%)
- Dashboard card uses `min(660px, 88vw)`

