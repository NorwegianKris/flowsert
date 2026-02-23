

# Fix: Polaroid Images Overflowing on Mobile

**Risk: GREEN** -- purely UI layout/sizing change.

## Problem
Both polaroid sections ("Workforce compliance" and "Techno Dive") use `w-72` (288px) cards with absolute positioning offsets (`-translate-x-[85%]` and `-translate-x-[30%]`). Two overlapping 288px cards exceed the ~360-390px mobile viewport, causing horizontal overflow.

## Solution
Shrink the polaroid cards on mobile and reduce their overlap spread:

**For both polaroid sections** (lines ~601-635 and ~722-750 in `src/pages/Auth.tsx`):

1. **Reduce card width on mobile**: Change `w-72` to `w-48` (192px), keeping `md:w-[21rem]` for desktop
2. **Adjust translate offsets for mobile**: Use smaller offsets so both cards fit within the viewport
   - Back polaroid: `w-48 md:w-72 lg:w-[21rem]` with `-translate-x-[75%] md:-translate-x-[85%]`
   - Front polaroid: `w-48 md:w-72 lg:w-[21rem]` with `-translate-x-[25%] md:-translate-x-[30%]`
3. **Reduce container height on mobile**: `h-[260px] md:h-[380px]`
4. **Scale down the front polaroid top offset**: `top-14 md:top-20`
5. **Adjust Before/After label widths** to match the new mobile card size

## Files modified
| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Update polaroid card widths, translate offsets, and container heights for mobile responsiveness in both sections |

