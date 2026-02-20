

# Match Filter Toggle Bars to Settings Category Tab Styling

## What Changes
The toggle bars inside the Workers and Certificates filter popovers currently use the default muted/grey ToggleGroup styling. They will be updated to match the indigo/purple color scheme used by the TabsList in the Settings Categories section -- a purple background bar with white text, where the active item gets a white background with purple text.

## Technical Details

**File: `src/components/PersonnelFilters.tsx`** (only file changed)

Apply custom classes to both ToggleGroup bars to replicate the TabsList color scheme:

1. **Workers filter ToggleGroup** (around line 200): Add `bg-primary p-1 rounded-md` to the `ToggleGroup` className, and add `data-[state=on]:bg-primary-foreground data-[state=on]:text-primary text-primary-foreground` to each `ToggleGroupItem` className (replacing the default toggle active state).

2. **Certificates filter ToggleGroup** (around line 372): Apply the same classes.

This means:
- The toggle bar background becomes indigo (`bg-primary`)
- Inactive items show white text on indigo (`text-primary-foreground`)
- The active/selected item shows indigo text on white background (`data-[state=on]:bg-primary-foreground data-[state=on]:text-primary`)
- Matches the exact same visual pattern as the Categories section's `TabsList` / `TabsTrigger` in Settings

No changes to props, logic, or other files.

