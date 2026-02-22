

## Show Category, Type, and Issuer in Compliance Timeline Bars

**Risk: GREEN** -- purely UI text change, no backend or data modifications.

### What Changes

The compliance timeline bar text currently shows only the certificate name (type). It will be updated to display: **category -- type -- issuer** inside each bar, with dashes separating the parts. Missing values will be gracefully omitted (no leading/trailing dashes).

### Technical Detail

**File: `src/components/project-timeline/ComplianceLane.tsx`**

Update line 74 where the bar label is rendered:

```tsx
// Before
<span className="text-[9px] text-white px-1 truncate block leading-[16px]">
  {bar.certificate.name}
</span>

// After
<span className="text-[9px] text-white px-1 truncate block leading-[16px]">
  {[bar.certificate.category, bar.certificate.name, bar.certificate.issuingAuthority]
    .filter(Boolean)
    .join(' – ')}
</span>
```

This uses the data already available on each `Certificate` object:
- `category` -- the category name (from certificate_categories)
- `name` -- the certificate type name (from certificate_types or raw)
- `issuingAuthority` -- the issuer name

The tooltip (lines 78-86) will also be updated to show the same formatted label for consistency.

One file, two line changes.

