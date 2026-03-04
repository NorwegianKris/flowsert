

## White Backgrounds + Lavender Hover — Remaining Settings Surfaces

Cosmetic only. No schema changes. 🟢

I've done an exhaustive audit of every component rendered inside the Settings panel. Below are the **remaining** places where interactive surfaces (inputs, list rows, callout boxes) still use `bg-muted/50`, `bg-muted/30`, `bg-muted/20`, or no explicit white background, and therefore blend into the grey Settings background.

### Changes by File

| # | File | Line(s) | Current | Change to |
|---|---|---|---|---|
| 1 | `CategoriesSection.tsx` | 289 | `<Input>` (cert categories add) — no bg class | Add `className="bg-white dark:bg-card"` |
| 2 | `CategoriesSection.tsx` | 311 | Cert category list rows `hover:bg-muted/50` | `bg-white dark:bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all rounded-lg` |
| 3 | `CategoriesSection.tsx` | 452 | `<Input>` (doc categories add) — no bg class | Add `bg-white dark:bg-card` |
| 4 | `CategoriesSection.tsx` | 474 | Doc category list rows `hover:bg-muted/50` | Same lavender hover pattern |
| 5 | `CategoriesSection.tsx` | 564 | Issuers list items `hover:bg-muted/50` | Same lavender hover pattern |
| 6 | `CertificateTypesManager.tsx` | 294 | Category group header `bg-muted/50` | `bg-white dark:bg-card` |
| 7 | `CertificateAliasesManager.tsx` | 121 | Search `<Input>` — no bg class | Add `bg-white dark:bg-card` |
| 8 | `CertificateAliasesManager.tsx` | 148 | Alias list rows `hover:bg-muted/50` | Lavender hover pattern |
| 9 | `CertificateCategoriesManager.tsx` | 243 | Inline add-type `<Input>` — no bg class | Add `bg-white dark:bg-card` |
| 10 | `IssuerTypesManager.tsx` | 596 | Merge dialog radio labels `hover:bg-muted/50` | `bg-white dark:bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all` |
| 11 | `LocationStandardizationTool.tsx` | 170 | Panel header `bg-muted/50` | `bg-white dark:bg-card` |
| 12 | `LocationStandardizationTool.tsx` | 212 | Selected footer `bg-muted/50` | `bg-white dark:bg-card` |
| 13 | `LocationStandardizationTool.tsx` | 223 | Tabs header `bg-muted/50` | `bg-white dark:bg-card` |
| 14 | `LocationStandardizationTool.tsx` | 246 | Preview callout `bg-muted/30` | `bg-white dark:bg-card` |
| 15 | `CertificateLocationNormalizationTool.tsx` | 441 | Outer content wrapper `bg-muted/20` | `bg-white dark:bg-card` |
| 16 | `TaxonomySeedingTool.tsx` | 262 | Content wrapper `bg-muted/20` | `bg-white dark:bg-card` |
| 17 | `CertificateBackfillTool.tsx` | 327 | Progress panel `bg-muted/30` | `bg-white dark:bg-card` |
| 18 | `BillingSection.tsx` | 255 | Canceled callout `bg-muted/50` | `bg-white dark:bg-card` |
| 19 | `BillingSection.tsx` | 267 | Enterprise callout `bg-muted/30` | `bg-white dark:bg-card` |
| 20 | `BillingSection.tsx` | 332 | Portal-managed callout `bg-muted/30` | `bg-white dark:bg-card` |
| 21 | `WorkerGroupsManageList.tsx` | 116-122 | Add-group `<Input>` — no bg class | Add `bg-white dark:bg-card` |
| 22 | `WorkerGroupsManageList.tsx` | 184 | Expanded members wrapper `bg-muted/30` | `bg-white dark:bg-card` |
| 23 | `WorkerCategoriesManager.tsx` | 134 | Add `<Input>` — no bg class | Add `bg-white dark:bg-card` |
| 24 | `DepartmentsManager.tsx` | 133 | Add `<Input>` — no bg class | Add `bg-white dark:bg-card` |
| 25 | `AIPersonnelSuggestions.tsx` | 141 | AI panel wrapper `bg-muted/30` | `bg-white dark:bg-card` |

### Summary

25 touch-points across 14 files. Every `bg-muted/*` surface inside a Settings section gets replaced with `bg-white dark:bg-card`. Every list row without the lavender hover pattern gets it added. Every `<Input>` without an explicit white background gets one.

