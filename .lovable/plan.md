

## Style AI Personnel Search Bar with Purple Background and White Text

**Risk: GREEN** -- purely UI color change on a single element.

### Change

**File: `src/components/AIPersonnelSuggestions.tsx`**

Only the slim header bar (line 108) is affected. The expanded content area with the textarea stays as-is.

- **Line 108**: Change `bg-muted/30` to `bg-primary` (deep indigo #4338CA) and add `text-white`
- **Line 110**: Update Button to remove ghost styling interference -- add `text-white hover:text-white`
- **Line 111**: Change Sparkles icon from `text-primary` to `text-white`
- **Lines 119-120**: Change chevron icons from `text-muted-foreground` to `text-white/70`
- **Line 127**: Update Clear Search button to `text-white/70 hover:text-white`

The textarea and results area below remain unchanged with their current light grey styling.

