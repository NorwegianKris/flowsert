

## Move "How It Works" to About Page + New Landing Page Segment

**Risk: GREEN** -- purely UI text and layout changes, no backend/data/auth modifications.

---

### Overview

Two changes:
1. Move the "How It Works" 3-step section from the landing page (Auth.tsx) into the About page, placed between the "About FlowSert" hero and "Our Mission" sections.
2. Replace the now-empty space on the landing page with a new "Workforce Compliance is Universal" segment styled identically to the Techno Dive user story section but mirrored (images on the right).

---

### File 1: `src/pages/About.tsx`

**Insert the "How It Works" section** between the hero (line 35) and the Mission section (line 37):

- Copy the exact 3-step grid (Set Up Your Team, Upload Certificates, Stay Compliant) with the gradient icon boxes and numbered badges.
- Add the required icon imports (`Users`, `FileCheck`) -- `Shield` is already imported.
- Use `bg-primary/5` background to maintain the alternating pattern (hero has document pattern, then How It Works gets lavender, then Mission gets document pattern).
- Adjust the Mission section background from `bg-primary/5` to document pattern, and the Values section from document pattern to `bg-primary/5`, to keep the alternating rhythm correct with the new section inserted.

New section order on About page:
1. "About FlowSert" hero -- document pattern (unchanged)
2. **"How It Works" -- lavender (NEW)**
3. "Our Mission" -- document pattern (CHANGED from lavender)
4. "Our Values" -- lavender (CHANGED from document pattern)
5. "Ready to Get Started?" CTA -- document pattern (CHANGED from lavender)

---

### File 2: `src/pages/Auth.tsx`

**Replace the "How It Works" section** (lines 567-609) with a new "Workforce Compliance is Universal" segment:

- Uses the same layout structure as the Techno Dive section (lines 685-774) but **mirrored**: text on the LEFT, polaroid images on the RIGHT.
- Same `bg-primary/5` lavender background.
- Same polaroid image styling with the two Techno Dive photos, rotated and overlapping.
- No "Read more" expand/collapse -- all text visible by default since it is concise.
- Content:
  - **Title**: "Workforce Compliance is Universal"
  - **Body**: The user-provided text about sourcing the right people, structured compliance, and predictable mobilization.

---

### No files created or deleted. No backend changes.

