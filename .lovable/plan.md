

# Fix Hero Scaling and Document Distribution

**Classification: GREEN** — Pure UI/canvas changes, single file.

## File: `src/components/HeroSection.tsx`

### 1. Reduce content sizes (fluid typography + spacing)

| Element | Current | New |
|---------|---------|-----|
| H1 font-size (line 333) | `clamp(2rem, 4vw, 4.5rem)` | `clamp(1.8rem, 3.2vw, 3.6rem)` |
| Subhead font-size (line 360) | `clamp(0.95rem, 1.4vw, 1.15rem)` | `clamp(0.85rem, 1.1vw, 1.05rem)` |
| Hero top padding (line 314) | `clamp(60px, 10vh, 120px)` | `clamp(48px, 7vh, 96px)` |
| CTA→dashboard gap (line 373) | `clamp(32px, 5vh, 60px)` | `clamp(24px, 3.5vh, 48px)` |
| Dashboard max-width (line 407) | `min(660px, 88vw)` | `min(580px, 75vw)` |
| Industry strip font (lines 438–444) | `clamp(0.7rem, 1vw, 1rem)` | `clamp(0.6rem, 0.8vw, 0.85rem)` |

### 2. Full-width document spawning

Remove the `spawnMargin` logic from both `createDoc` (lines 27–29) and `init` (line 78, 81). Replace with:

**`createDoc`**: `x: Math.random() * canvasW`

**`init`**: `d.x = Math.random() * rect.width`

### 3. Minimum-distance spawn + wider speed range

Add a `spawnWithMinDistance` helper function before `createDoc`. Use it in `init` to scatter documents with a minimum distance of 120px between them (up to 30 attempts).

Update speed in `createDoc` from `0.3 + Math.random() * 0.9` (range 0.3–1.2) to `0.4 + Math.random() * 1.4` (range 0.4–1.8).

### 4. Smaller badge documents

In `createDoc`, when `docType === 'badge'`, cap the width: `w = 55 + Math.random() * 25` and recalculate `h` accordingly.

In the badge renderer (line 248), change circle radius from `d.w * 0.35` to `d.w * 0.28`.

### 5. Proportional document count on ultrawide

Change line 77 from:
```ts
const count = Math.floor((rect.width * rect.height) / 28000);
```
to:
```ts
const count = Math.max(60, Math.floor((rect.width * rect.height) / 22000));
```

### Summary

All changes in `src/components/HeroSection.tsx`. No backend impact.

- 6 fluid size reductions
- Full-width x spawning (no margin)
- Min-distance spawn helper for even distribution
- Wider speed variance (0.4–1.8)
- Badge cards smaller with 28% radius
- Higher doc count on ultrawide (divisor 22000, min 60)

