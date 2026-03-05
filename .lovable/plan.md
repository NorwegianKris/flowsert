

## UX Fixes — 4 Changes

All purely UI/cosmetic. 🟢

### 1. Revert "Profiles Expiring" and "Profiles Expired" cards to white

**File:** `src/components/DashboardStats.tsx`

Remove `tinted: true` from the "Expiring Soon" and "Expired" stat objects (lines 40, 48), and remove the conditional tinted class from the Card render (line 78). Both cards will use the same white background as "All Valid Profiles".

### 2. Subtle hover effect on all purple-background buttons

The primary button variant currently uses `hover:bg-primary/90` which is barely perceptible. Change to a more noticeable effect: slight scale + shadow lift.

**File:** `src/components/ui/button.tsx` (line 12)
- Change default variant from `hover:bg-primary/90` to `hover:bg-primary/90 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`

This applies system-wide to all `variant="default"` buttons (tabs, toggles with primary bg, Add Personnel, New Project, etc.).

**File:** `src/components/ui/toggle.tsx` (line 10)
- Add matching hover effect to the `data-[state=on]` styles: `data-[state=on]:hover:shadow-md data-[state=on]:hover:-translate-y-0.5 transition-all duration-200`

**File:** `src/components/ui/tabs.tsx` (line 15, TabsList)
- Add `transition-all duration-200` and hover lift to the TabsList container or individual triggers won't need it since they inherit from the primary bg parent. Actually, the TabsTrigger inactive state needs the hover effect too. Add to TabsTrigger (line 30): `hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`

**File:** `src/components/CompliancePlanGenerator.tsx` (line 226, ToggleGroupItem)
- Add hover effect classes to the inline className: `hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`

### 3. Equal width for compliance plan period buttons

**File:** `src/components/CompliancePlanGenerator.tsx` (line 226)
- Change `min-w-[70px]` to `w-[80px]` so all four buttons ("30 days", "90 days", "6 months", "1 year") are exactly the same width.

### 4. White "Generate" button

**File:** `src/components/CompliancePlanGenerator.tsx` (line 235)
- Change `bg-muted text-foreground hover:bg-muted/80` to `bg-white text-foreground hover:bg-gray-50 border-border`

### Files to edit
- `src/components/DashboardStats.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/toggle.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/CompliancePlanGenerator.tsx`

