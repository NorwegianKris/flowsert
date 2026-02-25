

# Replace Dashboard Illustration Content with Screenshot Image

**Classification: GREEN** — Pure UI change, swapping hand-coded HTML with an image.

## Steps

### 1. Copy the uploaded image into the project
Copy `user-uploads://forside.jpg` to `src/assets/forside.jpg`.

### 2. Replace the dashboard card inner content with the image

In `src/components/HeroSection.tsx`, keep the outer dashboard card wrapper (the glassmorphic container with rounded corners, shadow, and backdrop blur — lines 293-301) and the titlebar with the three dots + "FlowSert Dashboard" label (lines 303-311). Replace everything below the titlebar (lines 313-400: tabs, stats, expiry label, expiry grid) with a single `<img>` tag showing the uploaded screenshot.

The image will be imported as an ES6 module and rendered with `width: 100%` to fill the card, matching the current card width (max 660px minus padding).

### Changes

**File: `src/components/HeroSection.tsx`**

- Add import: `import forsideImg from '@/assets/forside.jpg';`
- Lines 313-400 (everything between titlebar and closing `</div>` of the card): replace with:
```tsx
<img src={forsideImg} alt="FlowSert Dashboard Preview" className="w-full block" />
```

This keeps the same card size, glassmorphic styling, and titlebar — only the content inside changes to the real screenshot.

