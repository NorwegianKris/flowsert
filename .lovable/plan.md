

## Swap Sides in "Workforce compliance is a universal need"

**Risk: GREEN** -- purely layout order change.

### File: `src/pages/Auth.tsx`

**Change the `order-` classes** on the two child divs (lines 572-596):

- **Text div** (line 573): Change `order-1` to `order-2 md:order-2`
- **Images div** (line 596): Change `order-2` to `order-1 md:order-1`

This puts images on the left and text on the right on desktop, matching the Techno Dive section layout. On mobile, images will appear first (order-1) with text below (order-2).

