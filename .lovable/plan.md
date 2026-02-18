

## Remove Conflicting `relative` from Floating Button Wrapper

### Change

In `src/components/ChatBot.tsx`, line 253, remove `relative` from the wrapper div's className:

```text
// FROM:
<div className="fixed bottom-6 right-6 z-50 relative">

// TO:
<div className="fixed bottom-6 right-6 z-50">
```

### Why

- `fixed` and `relative` both set `position`. Tailwind's class ordering causes `relative` to win, breaking the fixed anchoring.
- `position: fixed` already creates a containing block for the absolutely-positioned unread badge, so `relative` is unnecessary.

### Result

- Button stays anchored bottom-right
- Follows viewport on scroll
- Unread badge remains correctly positioned

