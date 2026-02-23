

## Add Background Color Tints to Availability and Compliance Lanes

**Risk: GREEN** -- purely CSS styling changes.

---

### What Changes

Apply subtle background tints to both the label column and the lane area for Availability and Compliance, matching the pattern used by Milestones (`bg-amber-500/5`) and Events (`bg-primary/5`).

### Files Changed (2)

**1. `src/components/project-timeline/AvailabilityLane.tsx`**

- Line 59 (label div): Add `bg-sky-500/5` so the entire label area has a soft sky-blue tint
- Line 65 (lane div): Change `bg-sky-500/[0.03]` to `bg-sky-500/5` so the lane area matches the label intensity

**2. `src/components/project-timeline/ComplianceLane.tsx`**

- Line 34 (label div): Add `bg-emerald-500/5` so the entire label area has a soft green tint
- Line 40 (lane div): Change `bg-emerald-500/[0.03]` to `bg-emerald-500/5` so the lane area matches the label intensity

### Result

| Lane | Label background | Lane background |
|---|---|---|
| Milestones | `bg-amber-500/5` | `bg-amber-500/5` |
| Events | `bg-primary/5` | `bg-primary/5` |
| Availability | `bg-sky-500/5` (new) | `bg-sky-500/5` (updated) |
| Compliance | `bg-emerald-500/5` (new) | `bg-emerald-500/5` (updated) |

All four lane sections will have distinct, consistent color separation across their full width (label + content area).

