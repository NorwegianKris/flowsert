

# Add Diploma Document Type

**Classification: GREEN** — Pure canvas rendering, single file.

Note: The user references "passport" but in the current code, passport was already replaced with "license". I'll add `diploma` as a new type, with 1/3 of `license` selections becoming `diploma` instead (matching the user's intent of splitting an existing type).

## File: `src/components/HeroSection.tsx`

### 1. Update type system (lines 10–11)

Add `'diploma'` to the union and array:
```ts
type DocType = 'cert' | 'id' | 'checklist' | 'form' | 'badge' | 'license' | 'diploma';
const DOC_TYPES: DocType[] = ['cert', 'id', 'checklist', 'form', 'badge', 'license'];
```
Array stays the same — the split happens in `createDoc`.

### 2. Update `createDoc` (lines 38–55)

After selecting `docType` from the array, add the 1/3 split:
```ts
let finalType = docType;
if (finalType === 'license') {
  finalType = Math.random() < 0.33 ? 'diploma' : 'license';
}
```

Add diploma dimensions:
```ts
} else if (finalType === 'diploma') {
  w = 65 + Math.random() * 25;
}
```

Update height calculation to include diploma:
```ts
const h = (finalType === 'license') ? w * 0.62
        : (finalType === 'diploma') ? w * 1.45
        : w * (1.3 + Math.random() * 0.4);
```

Use `finalType` as the returned `docType`.

### 3. Add diploma renderer (in the drawing switch, after badge/before license)

The diploma is portrait-oriented and drawn with:

- **Decorative border**: Inner rounded rect 5px inset from card edge, stroked `hsla(243, 50%, 70%, 0.6)` at lineWidth 1
- **Top laurel ornament**: Two mirrored arcs at top center curving outward, stroked `hsla(243, 50%, 65%, 0.7)`
- **Title block**: Thick short line (50% card width, lineWidth 2.5) centered at 30% from top
- **Subtitle**: Thinner line (35% card width, lineWidth 1.2) just below
- **Center seal**: Double concentric circles at 55% from top (outer radius 18% of card width, inner 11%)
- **Body lines**: 3 lines at 80%, 70%, 75% card width, evenly spaced below seal
- **Signature field**: Full-width line at 80% from top with perpendicular tick marks at each end
- **Bottom ornament**: Mirrored laurel arcs at bottom center

All strokes use `detailColor` consistent with other document types.

### Summary

Single file change. Add `'diploma'` to DocType union, split 1/3 from license selections, add portrait sizing (w × 1.45), and implement the full diploma renderer with decorative border, laurels, seal, and signature field.

