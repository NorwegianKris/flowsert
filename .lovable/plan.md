

# Replace Passport with License Document Type

**Classification: GREEN** — Pure canvas rendering, single file.

## File: `src/components/HeroSection.tsx`

### 1. Update type system (lines 10–11)

Replace `'passport'` with `'license'`:
```ts
type DocType = 'cert' | 'id' | 'checklist' | 'form' | 'badge' | 'license';
const DOC_TYPES: DocType[] = ['cert', 'id', 'checklist', 'form', 'badge', 'license'];
```

### 2. Update `createDoc` (lines 38–55)

Add a `license` branch for landscape dimensions:
```ts
if (docType === 'badge') {
  w = 55 + Math.random() * 25;
} else if (docType === 'license') {
  w = 80 + Math.random() * 30;
}
const h = (docType === 'license') ? w * 0.62 : w * (1.3 + Math.random() * 0.4);
```

### 3. Replace passport renderer with license renderer (lines 283–311)

Replace the `else` block (currently passport) with a license drawing routine:

**Layout** (landscape card, wider than tall):

- **Header strip**: Fill top 18% of card with `hsla(243, 60%, 88%, 0.5)`, draw a thin horizontal line at 18% from top

- **Left section (38% of card width)**: Photo placeholder rectangle from top 20% to bottom 80% of card height, stroked with rounded corners (radius 2). Inside: circle head at 35% from top of box (radius = 18% of box width), shoulder arc below

- **Right section (remaining width)**: 4 horizontal lines evenly spaced (widths 85%, 60%, 75%, 50% of right section width). First line at lineWidth 2 (name). Below lines: a small rounded rectangle (45% of right section width, 18% of card height) with 6 tiny evenly-spaced vertical lines inside (barcode)

All strokes use the same `detailColor` as other types.

### Summary

Single file change. Replace `'passport'` → `'license'` in type + array, add landscape sizing in `createDoc`, replace passport renderer with license renderer. All other document types remain untouched.

