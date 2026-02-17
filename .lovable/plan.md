
# Widen Dashboard Layout Across All Screen Sizes

## What This Does
Increases the maximum content width of all dashboard pages so the content fills more of the screen, matching the proportions in your screenshot. Currently the `container` class caps content at 1400px -- this change raises it to 1800px for all screens.

## What Changes

### 1. Tailwind Config (`tailwind.config.ts`)
Update the container `2xl` screen from `1400px` to `1800px`. This single change affects every page using `container mx-auto`, giving more breathing room on wider screens while still keeping content from stretching edge-to-edge.

### 2. Header (`src/components/DashboardHeader.tsx`)
The header also uses `container mx-auto` so it will automatically widen to match.

### 3. Worker Dashboard (`src/pages/WorkerDashboard.tsx`)
Uses the same `container mx-auto` class -- will automatically pick up the wider max-width.

## Why This Is Safe
- One config value change affects all dashboard pages uniformly
- On smaller screens (under 1800px), content still fills the available width as before
- The ultrawide scaling media queries we just added will continue to work on top of this
- No layout or component changes needed

## Technical Detail

In `tailwind.config.ts`, change:
```
container: {
  center: true,
  padding: '2rem',
  screens: {
    '2xl': '1800px'   // was 1400px
  }
}
```
