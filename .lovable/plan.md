

# Fix: Polaroid Images Overflowing on Tablet View

**Risk: GREEN** -- purely UI layout/sizing change.

## Problem
At the `md` breakpoint (768px), the layout switches to a 2-column grid (`md:grid-cols-2`), giving each column roughly 320-400px of space. However, the polaroid cards jump to `md:w-72` (288px) with large translate offsets (`-translate-x-[85%]` / `-translate-x-[30%]`), causing two overlapping 288px cards to exceed the available column width on tablets.

## Solution
Add an intermediate size at the `md` breakpoint so the cards scale more gradually: mobile (w-48, 192px) -> tablet (md:w-56, 224px) -> desktop (lg:w-72, 288px) -> wide (xl:w-[21rem], 336px).

For both polaroid sections in `src/pages/Auth.tsx`:

1. Change card widths from `w-48 md:w-72 lg:w-[21rem]` to `w-48 md:w-56 lg:w-72 xl:w-[21rem]`
2. Adjust container height: `h-[260px] md:h-[320px] lg:h-[380px]`
3. Adjust translate offsets at md: use smaller values (`md:-translate-x-[80%]` / `md:-translate-x-[28%]`) so they fit within the narrower tablet column
4. Scale top offset for front card: `top-14 md:top-16 lg:top-20`
5. Apply matching width changes to Before/After labels

## Files modified
| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Update polaroid card widths, translate offsets, container heights, and label widths to add a tablet-friendly intermediate size |

