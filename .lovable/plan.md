

# Replace FlowSert Dashboard Mock with Actual Screenshot

## Overview
Replace the current hand-coded mock dashboard preview in the Auth page's Product Preview section with the uploaded dashboard screenshot. The screenshot will be styled with rounded corners and sized to fit within the browser frame without requiring scrolling.

## Current State
The Product Preview section (lines 521-563 in Auth.tsx) contains:
- A browser-style window frame with traffic light dots
- "FlowSert Dashboard" label
- Three hardcoded cards (Personnel, Certificates, Expiring Soon) with static values

## Changes

### 1. Copy Image to Assets
Copy the uploaded image to the project assets folder:
- Source: `user-uploads://image-4.png`
- Destination: `src/assets/dashboard-preview.png`

### 2. Update Auth.tsx

**Import the new image:**
```typescript
import dashboardPreview from '@/assets/dashboard-preview.png';
```

**Replace the mock cards (lines 532-558) with the screenshot:**

Current structure:
```text
<div className="p-6 md:p-8 bg-gradient-to-br from-muted/20 to-muted/40">
  <div className="grid md:grid-cols-3 gap-4">
    <!-- 3 hardcoded cards -->
  </div>
</div>
```

New structure:
```text
<div className="bg-gradient-to-br from-muted/20 to-muted/40 p-2 md:p-3">
  <img 
    src={dashboardPreview} 
    alt="FlowSert Dashboard Preview" 
    className="w-full h-auto rounded-lg"
  />
</div>
```

### 3. Styling Improvements

| Property | Value | Purpose |
|----------|-------|---------|
| `rounded-lg` | On the image | Rounded corners for polished look |
| `w-full h-auto` | On the image | Scale proportionally to fit container |
| Reduced padding | `p-2 md:p-3` | Tighter frame around screenshot |
| `object-contain` | Optional | Ensure image doesn't crop |

### 4. Size Optimization
The outer container (`max-w-5xl`) already constrains the width. The image will scale responsively to fill the available space while maintaining aspect ratio. No scrolling will be needed since:
- The image is naturally sized to fit within the viewport
- Using `h-auto` maintains aspect ratio without overflow

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/assets/dashboard-preview.png` | Create | Copy uploaded image |
| `src/pages/Auth.tsx` | Modify | Import image and replace mock cards with `<img>` |

## Visual Result
The browser frame mock will now show an actual screenshot of the FlowSert dashboard with:
- Traffic light dots and "FlowSert Dashboard" label (kept)
- The real Overview tab showing compliance stats and expiry timeline
- Rounded corners on the screenshot image
- No scrolling required - fits within the visible frame

