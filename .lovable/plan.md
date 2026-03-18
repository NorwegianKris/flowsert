

## Two Items

### 1. Fix AccordionTrigger Button Alignment

**Problem**: The `AccordionPrimitive.Header` rendered by `AccordionTrigger` is a `<h3 class="flex">` element that does **not** have `flex-1`. Inside the outer wrapper `div.flex.items-center` (line 424), the Header only takes its content width, so the buttons div sits immediately after the type name instead of at the far right.

**Fix in `src/components/CertificateTypesManager.tsx`** (line 424):

Add a Tailwind arbitrary variant to make the Header element (rendered as `h3`) stretch to fill available space:

```tsx
// Before:
<div className="flex items-center bg-card hover:bg-accent/40 transition-colors">

// After:
<div className="flex items-center bg-card hover:bg-accent/40 transition-colors [&>h3]:flex-1 [&>h3]:min-w-0">
```

This targets the `<h3>` that Radix's `AccordionPrimitive.Header` renders, giving it `flex-1` so the trigger fills available space and pushes the buttons div to the far right.

### 2. Teach the System — Confirmed: No Certificate Records Created

The `TaxonomySeedingTool` does **not** insert into the `certificates` table. It only:
- Calls the `extract-certificate-data` edge function to read type/category info from uploaded files
- Reads from `certificate_aliases` to check for existing matches
- Creates `certificate_types` and `certificate_aliases` entries when a suggestion is approved

Training uploads are used purely for taxonomy extraction. No certificate records are created, and no personnel association occurs. The uploaded files are processed in-memory (converted to base64 for the AI extraction call) and never stored.

