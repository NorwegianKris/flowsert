

## Fix Vertical Spacing on Polaroid Sections

**Risk: GREEN** -- purely CSS layout adjustment.

### Problem

Both sections use a fixed container height of `h-[570px]` for the polaroid images, but the actual images only occupy roughly 372px of vertical space (the front polaroid card ends at about top-20 + card height). This leaves ~200px of empty space below the images, making the bottom gap much larger than the top gap (`py-16` = 64px).

### Solution

Reduce the image container height from `h-[570px]` to `h-[380px]` in both sections. This trims the excess empty space below the polaroid stack so the section padding above and below appears symmetrical.

### File: `src/pages/Auth.tsx`

Two changes:

1. **Workforce Compliance section** (line 597): Change `h-[570px]` to `h-[380px]`
2. **Techno Dive section** (line 713): Change `h-[570px]` to `h-[380px]`

