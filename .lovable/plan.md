

## Widen Document Column in Certificate Status Table

Cosmetic only. 🟢

### Problem
The "Document" column header text is still clipped — 7% is too narrow.

### Solution
Reduce Personnel from 18% to 16% and bump Document from 7% to 9%. Total remains 100%.

### Change — `src/components/ProjectCertificateStatus.tsx` (lines 224, 232)

```tsx
// Personnel: 18% → 16%
<TableHead className="w-[16%] ...">Personnel</TableHead>

// Document: 7% → 9%
<TableHead className="w-[9%] ...">Document</TableHead>
```

