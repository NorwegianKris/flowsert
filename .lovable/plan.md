
# Widen Certificates Filter Popover

## Problem
The Certificates filter popover is set to `w-[280px]`, which is too narrow for the three-item toggle bar (Types, Categories, Issuers) with icons. The toggle extends beyond the frame.

## Fix
**File: `src/components/PersonnelFilters.tsx`** (single change)

- Line 349: Change the `PopoverContent` width from `w-[280px]` to `w-[320px]`

This gives the three toggle items enough room to display their icons and labels without overflow, while keeping the popover compact.
