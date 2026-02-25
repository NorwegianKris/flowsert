

# Replace Auth Hero with Animated Canvas Hero

**Classification: GREEN** — Pure UI/layout change, no database/auth/RLS involved.

## Summary

Replace the current hero section (lines 504–586 in `src/pages/Auth.tsx`) with the new animated hero from the provided HTML. This includes:

1. A falling-documents canvas animation behind the hero
2. A radial vignette overlay for text legibility
3. A badge pill ("Smart Compliance Platform")
4. Headline with animated gradient shimmer on "flow"
5. A mock dashboard card (HTML/CSS, not a screenshot image) with stats, tabs, and expiry grid
6. Industry strip at bottom (Offshore · Maritime · Industry · Construction)
7. Staggered fadeUp entrance animations on all elements

## Approach

Create a dedicated `HeroSection` component to keep `Auth.tsx` manageable. The canvas animation logic (falling translucent document rectangles) will live inside a `useEffect` with a ref to the canvas element.

## Files Changed

### 1. NEW — `src/components/HeroSection.tsx`

Contains the entire hero block as a self-contained component. Key sections:

- **Canvas animation** (`useEffect` + `useRef<HTMLCanvasElement>`) — spawns translucent rounded-rectangle "documents" that drift downward and rotate gently, matching the HTML's `#doc-canvas` logic
- **Vignette overlay** — radial gradient div identical to `.hero-vignette`
- **Badge** — "Smart Compliance Platform" pill with pulsing dot
- **Headline** — Rajdhani `h1` with the `flowShimmer` CSS animation on "flow"
- **Subhead** — muted paragraph
- **CTA row** — "Get in Touch →" (primary) + "Book a Demo" (outline), wired to existing `navigate('/contact')` and `setDemoDialogOpen(true)` callbacks passed as props
- **Dashboard card** — fully built in JSX/Tailwind (titlebar dots, tabs, stats bar, expiry grid with 4 colored cells) — replaces the old `<img>` screenshot
- **Industry strip** — Offshore · Maritime · Industry · Construction with separators
- **CSS keyframes** defined inline via a `<style>` tag or Tailwind `@keyframes` in `index.css`

Props:
```ts
interface HeroSectionProps {
  onGetInTouch: () => void;
  onBookDemo: () => void;
}
```

### 2. EDIT — `src/index.css`

Add two keyframe definitions used by the hero:

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes flowShimmer {
  0%   { background-position: 100% center; }
  50%  { background-position: 0% center; }
  100% { background-position: 100% center; }
}
```

### 3. EDIT — `src/pages/Auth.tsx` (lines 504–586)

Replace the entire `{/* Hero + Product Preview with Background */}` block with:

```tsx
<HeroSection
  onGetInTouch={() => navigate('/contact')}
  onBookDemo={() => setDemoDialogOpen(true)}
/>
```

Remove now-unused imports: `heroBgPattern`, `dashboardPreview`, `ArrowRight`.

## Proportions & Layout Fidelity

- The hero occupies `min-height: 100vh` (minus header) — same as current `min-h-[calc(100vh-73px)]`
- Dashboard card maxes at `max-w-[660px]` centered, matching the HTML
- Headline uses `clamp(2.5rem, 5.8vw, 4rem)` as specified
- All spacing values (padding, margins, gaps) are taken verbatim from the HTML
- Mobile: industry strip wraps naturally with `flex-wrap: wrap`

## Canvas Animation Detail

The falling documents effect renders ~18 translucent rounded rectangles drifting down at randomised speeds (0.15–0.45 px/frame), with slight rotation oscillation. Each "document" is a stroked + filled rounded rect with 2–3 horizontal "text lines" inside. Colors use the design system's indigo/border palette at low opacity. The canvas resizes on window resize via a `ResizeObserver`.

## Risk

- No backend, database, RLS, auth, or edge function changes
- Fully reversible — if it doesn't look right, we revert `Auth.tsx` and delete `HeroSection.tsx`
- The old `dashboardPreview` image asset remains in the repo (unused) — can be cleaned up later

