

## Fix Floating Chat Button Positioning

Two changes in `src/components/ChatBot.tsx`:

### 1. Floating button (lines 252-265)

Wrap the Button + badge in a `<div>` that owns both `fixed` (viewport anchoring) and `relative` (badge anchoring). Remove positioning classes from the Button itself.

**Replace:**
```text
return (
  <Button
    onClick={() => setIsOpen(true)}
    className="fixed bottom-6 left-6 h-16 px-6 rounded-full shadow-xl z-50 gap-3 text-lg font-bold animate-pulse hover:animate-none relative"
  >
    <MessageCircle className="h-6 w-6" />
    <span>Chat</span>
    {badgeCount > 0 && (
      <span className="absolute -top-1.5 -right-1.5 ...">
        ...
      </span>
    )}
  </Button>
);
```

**With:**
```text
return (
  <div className="fixed bottom-6 right-6 z-50 relative">
    <Button
      onClick={() => setIsOpen(true)}
      className="h-16 px-6 rounded-full shadow-xl gap-3 text-lg font-bold animate-pulse hover:animate-none"
    >
      <MessageCircle className="h-6 w-6" />
      <span>Chat</span>
    </Button>
    {badgeCount > 0 && (
      <span className="absolute -top-1.5 -right-1.5 ...">
        ...
      </span>
    )}
  </div>
);
```

- `fixed bottom-6 right-6` on the wrapper anchors it to the viewport bottom-right
- `relative` on the wrapper lets the badge use `absolute` positioning against it
- Button no longer carries any positioning classes

### 2. Chat card (line 603)

Change `left-6` to `right-6` and `bottom-6` to `bottom-24`:

```text
<Card className="fixed bottom-24 right-6 w-96 h-[500px] shadow-xl z-50 flex flex-col border-border">
```

This places the popup above the button with no overlap.

### Result

- Button anchored bottom-right, follows scroll
- Popup opens upward from the button
- Unread badge stays pinned to the button's top-right corner
- No `left-*` remains on any floating element

