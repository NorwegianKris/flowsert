

## Fix Notifications Log Scrollability

**Risk: GREEN** -- purely UI layout fix, no backend changes.

### Root Cause

The Radix `DialogContent` base styles use `grid` layout. Adding `flex flex-col` and `max-h-[80vh]` on top of that creates a conflict where the dialog grows with its content instead of constraining it. The `ScrollArea` component never gets a bounded parent height, so it never shows a scrollbar.

### Fix in `src/components/NotificationsLog.tsx`

1. Wrap the entire content below `DialogHeader` in a `div` with `overflow-y-auto` and `flex-1 min-h-0` so it becomes the single scrollable container
2. Remove the `ScrollArea` component from the list view entirely and replace it with a plain `div` -- the parent `overflow-y-auto` div handles scrolling
3. Keep `max-h-[80vh]` on `DialogContent` but also add explicit `h-[80vh]` so the dialog always has a fixed height that constrains children, rather than growing unbounded
4. Keep `overflow-hidden` on `DialogContent` so only the inner div scrolls

The key insight: instead of relying on `ScrollArea` (which needs precise height constraints from every ancestor), use a simple `overflow-y-auto` div as the scrollable container with `flex-1 min-h-0` to fill available space within the fixed-height dialog.

### One file changed

- `src/components/NotificationsLog.tsx`
