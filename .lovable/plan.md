

## Visual Consistency Fixes for AI-Suggested Content

### Summary
Replace the helper text in TaxonomySeedingTool with a sparkle Badge tag, rename "AI-suggested name" to "AI-suggested type", and standardize all AI sparkle badges to use green (emerald) colors system-wide.

### Changes

**1. TaxonomySeedingTool.tsx** (line 406)
- Replace `<p className="text-xs text-muted-foreground mt-1">AI-suggested name — click to edit</p>` with a sparkle Badge:
```tsx
<Badge className="mt-1 flex items-center gap-1 w-fit bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
  <Sparkles className="h-3 w-3" />
  AI-suggested type
</Badge>
```

**2. CertificateTypeSelector.tsx** — two locations to update colors to emerald green:
- Line 351-354: Change teal colors on the `ocrAutoSelected` badge to emerald, and rename "AI suggested" to "AI-suggested type":
```tsx
ocrAutoSelected && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
```
- Line 418: Change the "Suggested" free-text badge from teal to emerald:
```tsx
className="... bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
```

**3. IssuerTypeSelector.tsx** (line 110-113) — add emerald green styling to the Auto/Auto-matched badge:
```tsx
<Badge variant="secondary" className="ml-1 text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
```

**4. AddCertificateDialog.tsx** — two `(Auto-matched)` text spans (lines 738, 801) — update from `text-primary` to emerald green and add sparkle icon for consistency:
```tsx
<span className="text-xs text-emerald-700 dark:text-emerald-400 ml-1 inline-flex items-center gap-0.5">
  <Sparkles className="h-3 w-3" /> Auto-matched
</span>
```

### Files modified
- `src/components/TaxonomySeedingTool.tsx`
- `src/components/CertificateTypeSelector.tsx`
- `src/components/IssuerTypeSelector.tsx`
- `src/components/AddCertificateDialog.tsx`

