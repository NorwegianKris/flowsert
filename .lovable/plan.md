

## Fix Sort Button Wrapping

**File: `src/components/PersonnelFilters.tsx`**

Two changes:

1. **Line ~101**: Add `flex-nowrap` to the outer filter bar div:
   `className="flex flex-nowrap items-center gap-3 mb-4"`

2. **Line ~265**: Update sort button `min-w` from `min-w-[140px]` to `min-w-[180px]` so it accommodates "Recently Added" without shifting.

