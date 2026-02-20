
# Apply Landing Page Design to About, FAQ, and Contact Pages

## What Changes
Apply the same alternating visual design from the front page (Auth) to the About, FAQ, and Contact pages:

1. **Raining document background pattern** (`hero-bg-pattern.png` at 40% opacity) on alternating sections
2. **Lavender sections** (`bg-primary/5`) on the other alternating sections
3. Consistent section structure with `relative overflow-hidden` and `z-10` for content layering

## Design Pattern (from the landing page)

The landing page alternates like this:
- Hero section: document background pattern
- "How It Works": `bg-primary/5` (lavender)
- "Features": document background pattern
- "User Story": `bg-primary/5` (lavender)
- "Why It Matters": document background pattern
- CTA: `bg-primary/5` (lavender)

## Changes Per Page

### About Page (`src/pages/About.tsx`)
- Import `heroBgPattern` asset
- **Hero section** (About FlowSert): Add raining document background
- **Mission section**: Change from `bg-muted/30` to `bg-primary/5` (lavender)
- **Values section**: Add raining document background
- **CTA section**: Keep `bg-primary/5` (already correct)

### FAQ Page (`src/pages/FAQ.tsx`)
- Import `heroBgPattern` asset
- **Hero section**: Add raining document background
- **FAQ accordion section**: Apply `bg-primary/5` (lavender)
- **CTA section**: Add raining document background (to alternate)

### Contact Page (`src/pages/Contact.tsx`)
- Import `heroBgPattern` asset
- **Hero section**: Add raining document background
- **Contact form section**: Apply `bg-primary/5` (lavender)

## Technical Details

Each document-background section gets this pattern wrapper:
```tsx
<section className="py-16 relative overflow-hidden">
  <div 
    className="absolute inset-0 opacity-40"
    style={{
      backgroundImage: `url(${heroBgPattern})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}
  />
  <div className="container mx-auto px-4 relative z-10">
    {/* content */}
  </div>
</section>
```

Each lavender section uses:
```tsx
<section className="py-16 bg-primary/5">
```

No new dependencies or database changes required.
