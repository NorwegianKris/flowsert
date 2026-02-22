

## Add Dashboard Background to Chat Picker View

**Risk: GREEN** -- purely UI styling change.

### What Changes

The picker area in the Flowsert Chat (behind the three option buttons) gets the "raining documents" background pattern. The header bar ("Flowsert Chat") and the three buttons (Personnel/Admin Chat, Project Chat, AI Assistant) stay white.

### Technical Detail

**File: `src/components/ChatBot.tsx`**

1. **Add import** (near existing imports):
```typescript
import dashboardBgPattern from '@/assets/dashboard-bg-pattern.png';
```

2. **Apply background to picker container** (the `flex-1` div inside `renderPicker`):
```tsx
// Before
<div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">

// After
<div
  className="flex-1 flex flex-col items-center justify-center gap-4 p-6"
  style={{
    backgroundImage: `url(${dashboardBgPattern})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }}
>
```

3. **Add `bg-card` to each of the three option buttons** so they remain white against the patterned background. Each button already has classes like `flex flex-col items-center gap-3 p-6 rounded-xl border ...` -- just append `bg-card` to each.

One import addition and four small className/style tweaks in a single file.

