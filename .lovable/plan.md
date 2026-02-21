

## Text Updates + Image Size Increase

**Risk: GREEN** -- purely UI text/layout changes.

---

### Changes in `src/pages/Auth.tsx`

**1. Rename the title** (line 575):
- From: `"Workforce Compliance is Universal"`
- To: `"Workforce compliance is a universal need"`

**2. Remove the closing line** (lines 592-594):
- Delete the paragraph: `"Just structured compliance and predictable mobilization."`

**3. Increase polaroid image sizes in BOTH sections by 1.5x:**

Currently both sections use `w-48 md:w-56` for polaroid cards and `h-[380px]` for the container.

- `w-48` (12rem / 192px) x 1.5 = `w-72` (18rem / 288px)
- `md:w-56` (14rem / 224px) x 1.5 = `md:w-[21rem]` (336px)
- Container height `h-[380px]` x 1.5 = `h-[570px]`

Apply to all four polaroid cards across both sections:
- **Workforce Compliance section** (lines 600, 603, 617): Update container to `h-[570px]`, both cards to `w-72 md:w-[21rem]`
- **Techno Dive section** (lines 716, 719, 733): Same size updates

