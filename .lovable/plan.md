
## Increase Spacing Between Columns in Both Sections

**Risk: GREEN** -- purely CSS layout adjustment.

### Problem

Both the "Workforce compliance" and "Techno Dive" sections use `max-w-5xl` (64rem) containers with `gap-12` (3rem) between the two columns. The middle gap feels tight relative to the outer padding.

### Solution

In both sections, increase the container width from `max-w-5xl` to `max-w-6xl` and increase the column gap from `gap-12` to `gap-16`. This gives more breathing room between the image and text columns while also widening the layout so the side margins remain proportional to the center gap.

### File: `src/pages/Auth.tsx`

Two changes:

1. **Workforce Compliance section** (line 572-573): Change `max-w-5xl` to `max-w-6xl` and `gap-12` to `gap-16`
2. **Techno Dive section** (line 719-720): Change `max-w-5xl` to `max-w-6xl` and `gap-12` to `gap-16`
