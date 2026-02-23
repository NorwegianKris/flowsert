

# Fix: Center Chat Window on Mobile

**Risk: GREEN** -- purely UI layout/positioning change.

## Problem
The chat window has `fixed bottom-24 right-6 w-96` classes, making it 384px wide and pinned to the right. On mobile screens (< 400px wide), this causes it to extend beyond the left edge of the screen.

## Solution
In `src/components/ChatBot.tsx` (line 903), update the Card classes to:
- On mobile: use `left-3 right-3` (no fixed width) so it stretches edge-to-edge with small margins, keeping it centered
- On desktop: keep the current `w-96 right-6` positioning

Replace:
```
fixed bottom-24 right-6 w-96 h-[500px]
```
With:
```
fixed bottom-24 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 h-[500px]
```

This removes the fixed width on mobile and lets the card fill the available space with equal margins, then restores the original desktop behavior at the `sm` breakpoint.

## Files modified
| File | Change |
|------|--------|
| `src/components/ChatBot.tsx` | Update Card className on line 903 |

