

## Minor UI Fixes — Overview Tab Styling

Three small CSS-only changes, no schema or logic changes. Risk level: 🟢 green.

### Change 1: Lavender background on ComplianceSnapshot card
**File:** `src/components/ComplianceSnapshot.tsx` (line 125)

Change the Card from `border-border/50` to use lavender background (`bg-[#C4B5FD]/20 border-[#C4B5FD]/40`) so the certificate overview section sits on a soft lavender tone matching the brand palette.

### Change 2: Consistent toggle widths in CompliancePlanGenerator
**File:** `src/components/CompliancePlanGenerator.tsx` (line 226)

Add `min-w-[70px] justify-center` to each `ToggleGroupItem` so "30 days", "90 days", "6 months", and "1 year" all render at the same width.

### Change 3: Match compliance plan bar height to AI search bar + grey Generate button
**File:** `src/components/CompliancePlanGenerator.tsx`

- Line 210: Both bars already use `p-3 border rounded-lg bg-primary` — they should match. Will verify the height is consistent (both use `p-3`).
- Lines 232–238: Change the Generate button from `variant="secondary"` to `variant="outline"` with explicit `bg-muted text-foreground hover:bg-muted/80` to render as light grey with black text, matching the "Actions" button style.

