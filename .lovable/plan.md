

## Fix: Issuer Authority Input Getting Compressed

**Problem**: In `IssuerTypeSelector.tsx` lines 168-183, the `allowFreeText` layout uses a horizontal `flex-row` on `sm:` screens. When the dropdown shows a long issuer name (e.g. "Norwegian Maritime Authority") plus the auto-matched badge, it takes most of the row width, squeezing the custom input to near-zero width.

**Fix** in `src/components/IssuerTypeSelector.tsx` (the `allowFreeText` return block, ~line 170):

Change the layout from side-by-side to **always stacked vertically**. Remove the `sm:flex-row` / `sm:items-start` responsive classes so the dropdown and custom input always stack. This is cleaner and avoids the compression issue entirely.

```tsx
// Before (line 171):
<div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2">

// After:
<div className="flex flex-col items-stretch gap-2">
```

Also update the "or type if not found" separator (line 175) to remove the `sm:pt-2` padding that was for the horizontal layout:

```tsx
// Before:
<div className="flex items-center justify-center sm:pt-2">

// After:
<div className="flex items-center justify-center">
```

Two lines changed, no logic changes.

