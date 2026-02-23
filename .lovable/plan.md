

## Update Profile Activation and Billing Overview

**Risk: GREEN** -- UI-only changes. No schema, RLS, auth, or billing logic modifications.

---

### Overview

Three changes to the existing Activation Overview section:

1. Rename to "Profile Activation and Billing Overview"
2. Replace placeholder tiers with real pricing table (4 tiers with NOK pricing)
3. Add collapsible Terms and Conditions section with embedded PDF viewer

---

### 1. Copy PDF to Project

Copy the uploaded T&C PDF to `public/documents/FlowSert_Terms_and_Conditions.pdf` so it can be fetched at runtime by the PdfViewer component.

### 2. Rename Section

**File: `src/pages/AdminDashboard.tsx`** (line 685)
- Change `"Profile Activation Overview"` to `"Profile Activation and Billing Overview"`
- Update the tier label text on lines 690-694 to use new tier names (Starter/Growth/Professional/Enterprise)

**File: `src/components/ActivationOverview.tsx`** (line 124)
- Change `"Profile Activation Overview"` to `"Profile Activation and Billing Overview"`

### 3. Replace Tier Display

**File: `src/components/ActivationOverview.tsx`** (lines 241-279)

Replace the current 3-tier card grid and explanation text with:

- A new 4-tier pricing table using the existing card styling:

| Tier | Active Profiles | Monthly (NOK) | Annual (NOK) |
|---|---|---|---|
| Starter | 1-25 | 1,990 | 19,900 |
| Growth | 26-75 | 4,490 | 44,900 |
| Professional | 76-200 | 8,990 | 89,900 |
| Enterprise | 201+ | Custom | Custom |

- Current tier is highlighted with `border-primary bg-primary/5`
- Tier boundaries: activeCount >= 201 = Enterprise, >= 76 = Professional, >= 26 = Growth, else Starter
- Update the subtitle note: "Annual plan = 2 months free (16.7% discount)"
- Add explanatory paragraph: "Billing is based on the highest number of active profiles reached during the billing month (High-Water Mark Billing). Deactivating profiles before month-end does not reduce the invoice for that month."

### 4. Add Terms and Conditions Dropdown

**File: `src/components/ActivationOverview.tsx`**

Below the billing explanation text, add a new `Collapsible` section:

- Trigger label: "Terms & Conditions (View)" with a chevron icon
- Closed by default
- Content: The existing `PdfViewer` component, loading the PDF from `public/documents/FlowSert_Terms_and_Conditions.pdf` via fetch as ArrayBuffer
- Include an "Open in new tab" button that opens the PDF URL directly
- PdfViewer container max-height ~450px with scroll

New imports needed in ActivationOverview:
- `Collapsible, CollapsibleTrigger, CollapsibleContent` from ui/collapsible
- `PdfViewer` from components/PdfViewer
- `ChevronDown, FileText, ExternalLink` from lucide-react
- `useEffect, useState` for loading the PDF data

### 5. Update Collapsed Header Tier Labels

**File: `src/pages/AdminDashboard.tsx`** (lines 688-694)

Update the tier name logic in the collapsed header summary to match new tier names and boundaries:
- >= 201: "Enterprise"
- >= 76: "Professional"  
- >= 26: "Growth"
- else: "Starter"

---

### Files Changed (3)

1. `public/documents/FlowSert_Terms_and_Conditions.pdf` -- new file (copy from upload)
2. `src/components/ActivationOverview.tsx` -- rename title, new pricing tiers, T&C dropdown
3. `src/pages/AdminDashboard.tsx` -- rename collapsible header, update tier labels

