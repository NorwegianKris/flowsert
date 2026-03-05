

## Fix: Chat Bot Pulse Animation Too Fast

Cosmetic fix. 🟢

### Root Cause

The `transition-all duration-200` added to the default button variant in `button.tsx` line 12 is overriding the `animate-pulse` animation duration (normally 2s) on the ChatBot button. Tailwind's `duration-200` applies to all transitions/animations, making the pulse cycle at 200ms instead of 2s.

### Fix — `src/components/ui/button.tsx`

Line 8: Remove `transition-colors` from the base cva string (it's redundant now that the default variant has `transition-all`).

Line 12: Move `transition-all duration-200` to use `transition-[background-color,box-shadow,transform]` instead of `transition-all`, so it doesn't interfere with `animate-pulse` or other keyframe animations.

```tsx
default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md hover:-translate-y-0.5 transition-[background-color,box-shadow,transform] duration-200",
```

### File
- `src/components/ui/button.tsx`

