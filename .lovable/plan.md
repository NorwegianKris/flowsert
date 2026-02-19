

## Fix: Project page scrolls to bottom on entry

### Root Cause

The `ProjectChat` component (line 88) calls `messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })` whenever messages load. This fires right after navigating to a project, and because `scrollIntoView` operates on the entire page (not just the chat container), it scrolls the whole page down to the chat section at the bottom.

The existing `window.scrollTo({ top: 0 })` in `AdminDashboard.tsx` (line 79) fires first, but then the chat's `scrollIntoView` fires slightly later (after messages load), overriding it.

### Fix

Change the `scrollIntoView` in `ProjectChat.tsx` to only scroll within its own container, not the whole page. This is done by using `block: 'nearest'` combined with ensuring the chat messages area has its own scroll container (overflow-y), or by directly setting `scrollTop` on the chat container element instead of using `scrollIntoView`.

**File: `src/components/ProjectChat.tsx` (line 88)**

Replace:
```typescript
messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
```

With:
```typescript
const container = messagesEndRef.current?.parentElement;
if (container) {
  container.scrollTop = container.scrollHeight;
}
```

This scrolls the chat's own scroll container to the bottom without affecting the page scroll position. The chat area already has a fixed-height scroll container, so this will work correctly.

### No other changes needed

The `window.scrollTo` in `AdminDashboard.tsx` (line 79) will now work as intended since nothing will override it.
