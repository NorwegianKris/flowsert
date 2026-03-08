

## Tighten Invitation Card Bottom Row

**File:** `src/components/WorkerInvitations.tsx`

**Changes:**

1. **Line 104**: Add `whitespace-nowrap` to the date container div so the date text stays on one line:
   ```tsx
   <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
   ```

2. **Buttons**: Both Decline (line 110) and Accept (line 119) already have `size="sm"` — confirmed, no change needed.

Single-line class addition. No logic, handler, or color changes.

