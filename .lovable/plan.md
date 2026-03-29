

## Plan: Restyle shift selector tab bar to match main navigation toggle

### File: `src/components/ProjectDetail.tsx` (lines 333-366)

### Change

Replace the current teal-themed Card wrapper and outlined button styling with the same dark purple pill bar used by the main TabsList component (`bg-primary` background, white active pills).

**Before:** Card with `bg-teal-500/5` wrapper, teal-highlighted buttons
**After:** No Card wrapper — just a `div` with `bg-primary rounded-md p-1.5` containing pill buttons styled identically to `TabsTrigger`:

```tsx
{siblings.length > 1 && (
  <div className="flex items-center gap-1.5 bg-primary rounded-md p-1.5 flex-wrap">
    {siblings.map(s => {
      const isSelected = s.id === selectedShiftId;
      return (
        <button
          key={s.id}
          onClick={() => setSelectedShiftId(s.id)}
          className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-all ${
            isSelected
              ? 'bg-primary-foreground text-primary shadow-sm'
              : 'text-primary-foreground/80 hover:bg-primary-foreground/20 hover:text-primary-foreground'
          }`}
        >
          Shift {s.shiftNumber}
          <span className="ml-1.5 opacity-70 text-xs">{dateLabel}</span>
        </button>
      );
    })}
  </div>
)}
```

- Remove the `<Card>` and `<CardContent>` wrapper
- Remove the "Shift:" label with Layers icon
- Use `bg-primary` / `bg-primary-foreground` matching the TabsList/TabsTrigger exactly
- Same `rounded-sm`, `shadow-sm`, hover transitions as main nav pills

### No logic changes
Only className and wrapper element changes. No functional behaviour affected.

### Risk
Q5 — purely styling change.

