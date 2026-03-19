

## Plan: Equal-Height Personnel Cards

### Changes

**1. `src/pages/AdminDashboard.tsx` (line 744)**
- Add `items-stretch` to the grid: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4 items-stretch`

**2. `src/components/PersonnelCard.tsx`**
- Add `h-full flex flex-col` to the `Card` component (line 131) so it stretches to fill grid row height
- Add `flex-1 flex flex-col` to `CardContent` (line 154) so content fills the card
- Add `mt-auto` to the certificates container `div` (line 247) so it's pushed to the bottom

### Files Changed
1. `src/pages/AdminDashboard.tsx`
2. `src/components/PersonnelCard.tsx`

