

## Style Consistency: Purple Backgrounds and Hover Effects

### Already done (skip)
- **Find Personnel button**: Already uses `variant="default"` (bg-primary)
- **Get Suggestions button**: Already uses `variant="default"` (bg-primary)
- **Generate button**: Already `bg-background text-foreground` (white on purple bar)
- **Toggle button widths**: Already `w-[80px]`

### Remaining changes

#### 1. Convert info/description bars from amber to purple with white text (6 files)

Replace the amber pattern (`bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800` with `text-muted-foreground`) with `bg-primary text-white` across all instances:

- **`src/components/CategoriesSection.tsx`** — 2 info bars (roles/worker groups hint, categories/types hint)
- **`src/components/IssuerTypesManager.tsx`** — 1 info bar (issuer merge hint)
- **`src/components/AddCertificateDialog.tsx`** — 1 info bar (verification note)
- **`src/components/certificate-upload/UploadZone.tsx`** — 1 info bar (upload tip)
- **`src/components/AddProjectDialog.tsx`** — 1 info bar
- **`src/components/AvailabilityCalendar.tsx`** — 1 info bar (date selection tip)

Pattern change: `bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800` → `bg-primary`. Inner text class: `text-muted-foreground` → `text-white`. Lightbulb emoji stays.

#### 2. Enterprise billing callout → purple

**`src/components/BillingSection.tsx`** line ~267: Change `bg-muted/30 border border-border/50` to `bg-primary text-white` and update inner text classes accordingly.

#### 3. Purple button hover audit

The default button variant already has `hover:bg-primary/90`. The toggle component uses `hover:bg-primary/80`. These are consistent enough. No changes needed for standard buttons.

For the compliance plan toggle items (line 226) and AI search bar, the custom hover `hover:bg-primary-foreground/20` is correct for items sitting on a purple background. No change needed.

### Files changed
- `src/components/CategoriesSection.tsx`
- `src/components/IssuerTypesManager.tsx`
- `src/components/AddCertificateDialog.tsx`
- `src/components/certificate-upload/UploadZone.tsx`
- `src/components/AddProjectDialog.tsx`
- `src/components/AvailabilityCalendar.tsx`
- `src/components/BillingSection.tsx`

