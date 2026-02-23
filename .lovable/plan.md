

## Fix Clickable Names in Profile Activation List

**Risk: GREEN** -- UI-only styling fix.

---

### Problem

The `<button>` element wrapping the person's name has the `truncate` CSS class but lacks `display: block` and `w-full`. Inside a flex container with `min-w-0`, this can cause the button to have zero or minimal clickable width, making it appear unclickable.

### Fix

**File: `src/components/ActivationOverview.tsx`** (line 228)

Add `block w-full` to the button's className so it fills the available width and becomes reliably clickable:

Change:
```
className="font-medium text-sm truncate text-left cursor-pointer hover:underline text-foreground"
```

To:
```
className="block w-full font-medium text-sm truncate text-left cursor-pointer hover:underline text-foreground"
```

### Files Changed (1)

1. `src/components/ActivationOverview.tsx` -- add `block w-full` to the name button

