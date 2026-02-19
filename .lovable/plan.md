

## Make Industry Tags 1.5x Larger

A simple styling update to the "Offshore | Subsea | Industry | Construction" text on the front page.

### Change

In `src/pages/Auth.tsx`, increase the font size from `text-lg` (18px) to `text-[1.7rem]` (~27px, which is 1.5x larger) in both the mobile grid and desktop row variants:

- **Line 547** (mobile 2x2 grid): Change `text-lg` to `text-[1.7rem]`
- **Line 554** (desktop horizontal row): Change `text-lg` to `text-[1.7rem]`

No other files or logic changes needed.

