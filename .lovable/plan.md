

## Change Compliance Lane to Violet for Better Contrast

**Risk: GREEN** -- purely CSS color changes.

### Problem

Availability (sky-blue) and Compliance (emerald-green) look too similar at low opacity, making it hard to distinguish the two sections.

### Fix

Change the Compliance lane background from emerald-green to violet/purple, which provides strong contrast against the sky-blue Availability lane and aligns with the project's indigo brand palette.

**File: `src/components/project-timeline/ComplianceLane.tsx`**

- Line 34 (label div): Change `bg-emerald-500/10` to `bg-violet-500/10`
- Line 40 (lane div): Change `bg-emerald-500/10` to `bg-violet-500/10`

### Result

| Lane | Color |
|---|---|
| Milestones | Amber tint |
| Events | Primary/indigo tint |
| Availability | Sky-blue tint |
| Compliance | Violet/purple tint (changed) |

All four sections now use distinctly different color families for clear visual separation.

### Files Changed (1)

1. `src/components/project-timeline/ComplianceLane.tsx`

