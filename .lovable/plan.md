

## Center Norwegian Text in Header

Move the Norwegian text out of the right-side button group and make it an absolutely-centered element in the header. This way it stays visually centered regardless of the left (logo+nav) and right (buttons) widths.

### Change — `src/components/PublicHeader.tsx`

- Make the outer flex container `relative`
- Move the `<p>` with the Norwegian text out of the right-side `div` and place it as its own element with `absolute left-1/2 -translate-x-1/2` to center it horizontally in the header
- Keep it `hidden lg:flex` so it only shows on large screens

