

## Plan: Restyle Advanced section to match standard Settings sections

### Problem
The "Advanced — data standardisation tools" collapsible uses a different visual style (dashed border, muted background, smaller font, `Settings2` icon) compared to all other Settings sections which use: `border border-border/50 bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20`, `h-5 w-5 text-primary` icon, `font-semibold text-lg` title. There's also an orphaned description paragraph outside the card.

### Change

**File:** `src/pages/AdminDashboard.tsx` (lines 952-998)

Replace the outer Advanced collapsible trigger and content wrapper to match the standard pattern:

1. **Trigger styling** — change from `border-dashed border-border/50 bg-muted/30 hover:bg-muted/50` to the standard `border border-border/50 bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20`
2. **Icon** — change `Settings2 h-4 w-4 text-muted-foreground` to `Settings2 h-5 w-5 text-primary`
3. **Title** — change `text-sm font-medium text-muted-foreground` to `font-semibold text-lg` (no muted color)
4. **Remove** the `<p>` description line on line 961
5. **Keep** `defaultOpen` unset (collapsed by default) — already correct

No other files affected. The inner Issuing Authorities and Locations collapsibles already use the correct styling.

