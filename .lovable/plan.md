

## Polish Stat Cards: Short Labels, Centered Content

### Changes in `src/components/DashboardStats.tsx`

**1. Shorten labels**
- "All Valid Profiles" → "All Valid"
- "Profiles Expiring Soon" → "Expiring Soon"
- "Profiles Expired" → "Expired"
- "Certificates to Review" → "To Review"

**2. Center content in each card**
- Change `CardContent` layout from `flex items-center gap-3` to `flex flex-col items-center justify-center text-center gap-2`
- Remove `flex-1` from the text container; center number and label
- Position icon above the number/label block
- Move `ChevronRight` to a subtle absolute position (top-right corner) so it doesn't break centering

**3. Employees/Freelancers card** — same centering treatment: icon on top, two count columns below, centered

**4. Grid** — already `lg:grid-cols-5` with equal implicit columns, no change needed

### One file changed
`src/components/DashboardStats.tsx`

