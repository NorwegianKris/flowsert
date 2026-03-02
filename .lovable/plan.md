

## Match Info Banner Style to Reference

Update the info banner in `IssuerTypesManager.tsx` (line ~238) to match the exact styling from `CategoriesSection.tsx`.

### Changes

| Current | Reference |
|---------|-----------|
| `bg-yellow-50 border border-yellow-200 rounded-lg p-3` | `bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-1.5` |
| `Lightbulb` icon component | `💡` emoji |
| `text-sm text-yellow-800` | `text-xs text-muted-foreground` |
| `flex items-start gap-2` | `flex items-center gap-2` |

**File**: `src/components/IssuerTypesManager.tsx` — replace the banner div with the reference style, remove the `Lightbulb` import if no longer used.

