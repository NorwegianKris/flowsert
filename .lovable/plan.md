

## Consistent Purple Hover on Tabs, Toggles, and Sub-Toggles

Cosmetic change. 🟢

### Problem

Purple-background tabs and toggles currently show either no hover change or a grey hover (`hover:bg-muted hover:text-muted-foreground`). The user wants all purple interactive elements to show a subtle lighter-purple hover (matching the "Add Personnel" button's `hover:bg-primary/90` pattern) with white text preserved.

### Changes

**1. `src/components/ui/tabs.tsx` — TabsTrigger (line 30)**

Inactive tabs sit on the purple `TabsList`. Add a subtle white-overlay hover so they lighten on hover while keeping white text:

```
hover:bg-primary-foreground/20 hover:text-primary-foreground
```

**2. `src/components/ui/toggle.tsx` — Base classes (line 8)**

Replace the grey hover (`hover:bg-muted hover:text-muted-foreground`) with a matching lighter-purple hover:

```
hover:bg-primary/80 hover:text-primary-foreground
```

Also update the active (`data-[state=on]`) hover to stay purple instead of reverting to grey:

```
data-[state=on]:hover:bg-primary/80 data-[state=on]:hover:text-primary-foreground
```

**3. `src/components/ui/toggle.tsx` — Outline variant (line 13)**

The outline variant should keep its own hover behavior (it's not on a purple background), so override back to accent colors:

```
hover:bg-accent hover:text-accent-foreground
```

### Files
- `src/components/ui/tabs.tsx`
- `src/components/ui/toggle.tsx`

