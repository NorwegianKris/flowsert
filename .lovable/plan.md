
## Make the Hero Section Fill the Full Viewport

The goal is to make the hero section (header + headline + CTA buttons + dashboard preview) occupy the full browser viewport height at 100% zoom, so the "How It Works" section only appears when scrolling.

### Current State
The hero area (lines 478-542) uses fixed padding values (`pt-8 pb-4` / `pt-12 pb-6` for the hero, `pb-8` / `pb-12` for the preview), which leaves it shorter than the full viewport.

### Changes

**File: `src/pages/Auth.tsx`**

1. Make the hero + preview wrapper div fill the remaining viewport height below the header using `min-h-[calc(100vh-73px)]` (header is ~73px tall) and center its content vertically with flexbox.

2. Increase vertical padding on the hero text section to spread the content across the available space (e.g., `pt-12 pb-6 md:pt-16 md:pb-8`).

3. Increase bottom padding on the product preview section (e.g., `pb-12 md:pb-16`) so the dashboard image sits comfortably above the fold.

### Technical Details

- The outer `<div className="relative overflow-hidden">` (line 478) will get additional classes: `min-h-[calc(100vh-73px)] flex flex-col justify-center`
- The hero section padding increases slightly to give more breathing room
- The product preview section padding increases to push the "How It Works" section below the fold
- No structural changes -- just CSS adjustments to spacing and layout
