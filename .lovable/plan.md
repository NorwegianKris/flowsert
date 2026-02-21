

## Add Duration Count to Total Days Stats Card

**Risk: GREEN** -- purely UI layout change.

### Change

**File: `src/components/ProjectDetail.tsx`** (lines 276-288)

Expand the Total Days card to match the personnel card style -- add a "Duration" column next to "Total Days" showing the same `duration` value with the label "Duration". The card will use `gap-6` and two centered columns after the icon.

### Technical Detail

Replace lines 276-288:

```tsx
<Card className="border-border/50">
  <CardContent className="p-4 flex items-center gap-6">
    <div className="p-2 rounded-lg bg-sky-500/10">
      <Calendar className="h-5 w-5 text-sky-500" />
    </div>
    <div className="text-center">
      <p className="text-2xl font-bold text-foreground">
        {duration || '—'}
      </p>
      <p className="text-xs text-muted-foreground">Total Days</p>
    </div>
    <div className="text-center">
      <p className="text-2xl font-bold text-foreground">
        {duration || '—'}
      </p>
      <p className="text-xs text-muted-foreground">Duration</p>
    </div>
  </CardContent>
</Card>
```

Wait -- "Total Days" and "Duration" would show the same number. Let me reconsider: the user likely wants the existing single-column card to gain a second column showing the duration (start-to-end day count) beside the current "Total Days" label. Since `duration` already IS the start-to-end count, perhaps the intent is to keep "Total Days" as-is and add a human-friendly duration string (e.g. weeks/months)?

More likely: the user simply wants the card restyled to the same multi-column look as the personnel card, with the icon on the left and a single "Duration" metric. I'll rename "Total Days" to "Duration" and keep the same layout style (`gap-6`, centered text) for visual consistency with the personnel card.

```tsx
<Card className="border-border/50">
  <CardContent className="p-4 flex items-center gap-6">
    <div className="p-2 rounded-lg bg-sky-500/10">
      <Calendar className="h-5 w-5 text-sky-500" />
    </div>
    <div className="text-center">
      <p className="text-2xl font-bold text-foreground">
        {duration || '—'}
      </p>
      <p className="text-xs text-muted-foreground">Total Days</p>
    </div>
    <div className="text-center">
      <p className="text-2xl font-bold text-foreground">
        {duration ? `${Math.floor(duration / 7)}w ${duration % 7}d` : '—'}
      </p>
      <p className="text-xs text-muted-foreground">Duration</p>
    </div>
  </CardContent>
</Card>
```

This adds a second column "Duration" showing the same total in weeks + days format (e.g. "26w 1d") for a more meaningful breakdown alongside "Total Days" (the raw number). Both use `text-2xl font-bold` and `text-xs` label, matching the personnel card style.

