

## Fix: Switch Toggle in Activation List Opens Sidebar Instead of Toggling

**Risk: GREEN** -- purely UI event handling fix, no DB/auth/RLS changes.

### Single file: `src/components/ActivationOverview.tsx`

### Root Cause

The personnel row `div` (line 208-211) has an `onClick` that opens the profile preview sidebar. The `Switch` component (lines 272-275) does not stop event propagation, so clicking the toggle bubbles up to the row and opens the sidebar instead of (or in addition to) toggling activation.

### Fix

Wrap the Switch and its "Active/Inactive" label in a container `div` with `onClick={(e) => e.stopPropagation()}` so that any click in the toggle area is isolated from the row's click handler.

**Lines 269-275** -- wrap the status label and Switch:

```tsx
// Before
<span className={`text-xs font-medium w-12 text-right ${person.activated ? 'text-primary' : 'text-muted-foreground'}`}>
  {person.activated ? 'Active' : 'Inactive'}
</span>
<Switch
  checked={person.activated}
  onCheckedChange={() => handleToggle(person)}
/>

// After
<div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
  <span className={`text-xs font-medium w-12 text-right ${person.activated ? 'text-primary' : 'text-muted-foreground'}`}>
    {person.activated ? 'Active' : 'Inactive'}
  </span>
  <Switch
    checked={person.activated}
    onCheckedChange={() => handleToggle(person)}
  />
</div>
```

This ensures clicks on the toggle and the area directly around it only trigger the activation dialog, not the profile sidebar.
