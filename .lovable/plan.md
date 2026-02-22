

## Fix Personnel View Toggles Overflow in New Project Dialog

**Risk: GREEN** -- purely UI layout change.

### Problem

The "Personnel view" section inside the New Project dialog places the label and all three toggles (Include Employees, Include Freelancers, Show Freelancers only) in a single horizontal row. Inside the narrower dialog width, this overflows to the right.

### Solution

Restructure `FreelancerFilters` so the "Personnel view:" label with icon sits on top, and the three toggles sit below it in a horizontal row with tighter spacing.

### Technical Detail

**File: `src/components/FreelancerFilters.tsx`**

Change the outer container from a single-row flex to a stacked layout:

```tsx
// Before (single row)
<div className="flex items-center gap-6 py-3 px-4 ...">
  <div>  {/* icon + label */} </div>
  <div>  {/* toggle 1 */} </div>
  <div>  {/* toggle 2 */} </div>
  <div>  {/* toggle 3 */} </div>
</div>

// After (label on top, toggles below)
<div className="py-3 px-4 ...">
  <div className="flex items-center gap-2 text-muted-foreground mb-2">
    <Users icon />
    <span>Personnel view:</span>
  </div>
  <div className="flex items-center gap-4 flex-wrap">
    {/* toggle 1 */}
    {/* toggle 2 */}
    {/* toggle 3 */}
  </div>
</div>
```

One file changed, layout only.

