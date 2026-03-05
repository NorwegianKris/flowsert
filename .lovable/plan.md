

## Plan: Revert Info Bars to Yellow + Layout Items (skip 3 & 5)

Skipping item 3 (Projects tab Card wrapping) and item 5 (Personnel search purple border) per request.

### 1. Revert all 💡 info bars from purple to amber (6 files)

Replace `bg-primary` with `bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800` and `text-primary-foreground` with `text-muted-foreground`:

- **`src/components/CategoriesSection.tsx`** — lines 54 and 97
- **`src/components/IssuerTypesManager.tsx`** — line 313
- **`src/components/AddCertificateDialog.tsx`** — line 599
- **`src/components/certificate-upload/UploadZone.tsx`** — line 121
- **`src/components/AddProjectDialog.tsx`** — line 887
- **`src/components/AvailabilityCalendar.tsx`** — line 449

### 2. Settings sections — add specific description text
**File: `src/pages/AdminDashboard.tsx`**

Add `<p className="text-sm text-muted-foreground mb-2">` as the first child inside each `CollapsibleContent`, with wrapping `<div className="p-4 space-y-4">` where missing:

- **Team & Admins** (line 915): "Manage team members, roles, and admin access."
- **Company** (line 928): "Update your company details, logo, and contact information."
- **Locations** (line 977): "Normalize and manage certificate location data."
- **Privacy & Data** (line 994): "Configure data processing acknowledgements and privacy settings."
- **Freelancer Registration** (line 1015): "Manage registration links for freelancer onboarding."
- **Feedback** (line 1031): "View feedback and improvement suggestions from your team."

Categories and Issuing Authorities already have descriptions — skip.

### 3. Compliance Overview — restyle from input to label
**File: `src/pages/AdminDashboard.tsx`** (lines 748-753)

Replace the read-only `<Input>` with:
```tsx
<div className="flex items-center gap-2 h-10 px-3">
  <LayoutDashboard className="h-4 w-4 text-primary" />
  <span className="text-sm font-medium text-muted-foreground">Compliance Overview</span>
</div>
```

### 4. Project detail — match recurring card colour
**File: `src/components/ProjectDetail.tsx`** (line 209)

Add recurring styling: `${project.isRecurring ? 'bg-teal-500/10 border-teal-500/50' : ''}`

### Files changed
- `src/components/CategoriesSection.tsx`
- `src/components/IssuerTypesManager.tsx`
- `src/components/AddCertificateDialog.tsx`
- `src/components/certificate-upload/UploadZone.tsx`
- `src/components/AddProjectDialog.tsx`
- `src/components/AvailabilityCalendar.tsx`
- `src/components/ProjectDetail.tsx`
- `src/pages/AdminDashboard.tsx`

