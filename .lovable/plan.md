

## Add Calendly Inline Embed to Contact Page

### Layout Change

Current layout: 3-column grid — 1 col (contact info) + 2 col (form).

New layout: Keep the same 3-column grid but reorganize:
- **Left column (1 col)**: Email contact info, then below it "Or book a meeting directly" heading + Calendly inline widget
- **Right column (2 col)**: Contact form (unchanged)

### Implementation — `src/pages/Contact.tsx`

1. Add a `useEffect` to load the Calendly widget script (`https://assets.calendly.com/assets/external/widget.js`) on mount
2. Below the email contact info in the left column, add:
   - A heading: "Or book a meeting directly"
   - A `<div className="calendly-inline-widget">` with `data-url="https://calendly.com/kmu-7-vf/30min"` and `style={{ minWidth: '320px', height: '700px' }}`
3. Adjust grid from `md:grid-cols-3` to a 2-column layout (`md:grid-cols-2`) so both sides get equal space, making the Calendly embed wide enough to render properly
4. Match the Calendly embed background by appending `?background_color=faf5ff` (or similar matching the `bg-primary/5` tone) to the data-url
5. Add the Calendly CSS link in the head via the same useEffect

### File
- `src/pages/Contact.tsx` — single file edit

