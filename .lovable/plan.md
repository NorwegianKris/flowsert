

## Add "Before" and "After" Labels Above Polaroid Images

**Risk: GREEN** -- purely UI text addition.

### File: `src/pages/Auth.tsx`

Add text labels above each polaroid card in the "Workforce compliance is a universal need" section (lines 598-624):

1. **"Before" label** above the left/back polaroid (before line 599): Add a `<span>` positioned with `absolute` matching the polaroid's position (`left-1/2 -translate-x-[85%]`) but offset above it (e.g. `-top-6`), aligned to the left edge of the card. Text styled in `text-sm font-semibold text-muted-foreground`.

2. **"After" label** above the right/front polaroid (before line 613): Add a `<span>` positioned with `absolute` matching the polaroid's position (`left-1/2 -translate-x-[30%]`) offset above its top (`top-14` to sit above the `top-20` card), with `text-right w-72 md:w-[21rem]` so the text aligns to the right edge of the card. Same text styling.

### Technical Detail

```tsx
{/* Before label */}
<span className="absolute left-1/2 -translate-x-[85%] -top-6 text-sm font-semibold text-muted-foreground">
  Before
</span>

{/* After label */}
<span className="absolute left-1/2 -translate-x-[30%] top-14 text-right w-72 md:w-[21rem] text-sm font-semibold text-muted-foreground">
  After
</span>
```

