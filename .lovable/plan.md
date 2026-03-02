

## Two UI Fixes for Manage Issuers Tab

### 1. Scrollable issuer list with fixed height
Wrap the issuer list (`div.border.rounded-lg.divide-y` at line 347) in a `ScrollArea` component with `max-h-[65vh]` and `overflow-y-auto`. The toolbar (search, filters, buttons) and footer count stay outside the scroll container.

### 2. Info banner + always-visible merge button

**Banner**: Add an amber info banner above the toolbar, matching the existing category/type banner style: `bg-yellow-50 border border-yellow-200 rounded-lg p-3` with a `Lightbulb` icon. Text: "Manage your canonical issuing authorities here. Select two or more duplicate issuers and merge them into one to keep your data clean."

**Merge button**: Remove the `selectedForMerge.size >= 2` conditional (line 317). Always render the button. When `< 2` selected, show it as `disabled` with label "Merge Issuers". When `>= 2` selected, enable it with label "Merge Selected (N)".

### File changed
| File | Change |
|------|--------|
| `src/components/IssuerTypesManager.tsx` | Add `Lightbulb` import, amber banner, `ScrollArea` wrapper on list, always-visible merge button |

