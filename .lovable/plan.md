

## Fix: Remove sticky category headers in right pane

**File:** `src/components/TypeMergingPane.tsx`, line 637

Remove `sticky top-0` from the category header class so it scrolls normally with the rest of the list.

**Change:** `sticky top-0` → removed from the className string.

