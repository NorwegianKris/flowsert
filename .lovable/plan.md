

## Plan: Restyle stat clusters with card boxes

### Changes in `src/pages/AdminDashboard.tsx` (lines 784-826)

**1. Update container (line 784)**
- Change `gap-4` to `gap-2`, add `py-2`: `h-full overflow-hidden flex items-center gap-2 py-2`

**2. Wrap each stat cluster in a card box**
- Each of the 3 stat groups gets: `bg-white border border-[#E5E7EB] rounded-lg px-3 py-1` (px-3 = 12px, py-1 = 4px)

**3. Update font sizes**
- Number spans: change `text-lg` to `text-[13px]`
- Label spans: change `text-[9px]` to `text-[8px]`

**4. Remove vertical dividers**
- Delete the two `<div className="w-px self-stretch my-[20%] bg-border" />` elements (lines 789 and 821)

### No other files changed.

