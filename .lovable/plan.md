

## Redesign Personnel Stats Card to Match Reference Layout

**Risk: GREEN** -- purely UI layout change.

### What Changes

**File: `src/components/ProjectDetail.tsx`** (lines 250-266)

Redesign the personnel stats card so it displays three side-by-side number/label columns after the icon, matching the reference screenshot:

```
[icon]   3          7           146
       Personnel  Employees  Freelancers
```

Each column uses the same `text-2xl font-bold` for the number and `text-xs text-muted-foreground` for the label. "Assigned Personnel" is shortened to "Personnel".

### Technical Detail

Replace lines 250-266 with:

```tsx
<Card className="border-border/50">
  <CardContent className="p-4 flex items-center gap-6">
    <div className="p-2 rounded-lg bg-violet-500/10">
      <Users className="h-5 w-5 text-violet-500" />
    </div>
    <div className="text-center">
      <p className="text-2xl font-bold text-foreground">
        {assignedPersonnel.length}
      </p>
      <p className="text-xs text-muted-foreground">Personnel</p>
    </div>
    <div className="text-center">
      <p className="text-2xl font-bold text-foreground">
        {assignedPersonnel.filter(p => p.category !== 'freelancer').length}
      </p>
      <p className="text-xs text-muted-foreground">Employees</p>
    </div>
    <div className="text-center">
      <p className="text-2xl font-bold text-foreground">
        {assignedPersonnel.filter(p => p.category === 'freelancer').length}
      </p>
      <p className="text-xs text-muted-foreground">Freelancers</p>
    </div>
  </CardContent>
</Card>
```

Single file, single card redesign. The other two stats cards (Total Days, Project Status) remain unchanged.
