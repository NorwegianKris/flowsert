

## Plan: Add sending progress indicator to notification dialog

### Overview
Add time-estimated progress tracking during send, and a success completion state before the admin manually closes.

### Changes in `src/components/SendNotificationDialog.tsx`

**1. New state variables**
- `sendProgress: number` (0-100) — animated progress percentage
- `sendComplete: boolean` — true after send finishes successfully
- `completedCount: number` — total recipients sent to (for success message)

**2. Progress simulation via `useEffect`**
- When `sending` becomes true, start an interval that increments `sendProgress` based on elapsed time vs expected duration (`recipientCount * 200ms` for email sends, or a fast 1s animation for in-app only).
- Cap simulated progress at 95% until the actual send completes, then jump to 100%.
- Track a simulated counter: `Math.floor((progress / 100) * totalRecipients)` for the "Sending... X of Y" display.

**3. Modify `handleSend`**
- On success: set `sendComplete = true` and `completedCount = recipients.length`. Do NOT reset form or close dialog — admin closes manually.
- Remove the `onOpenChange(false)` call from the success path.
- Remove toast notifications on success (the in-dialog success state replaces them). Keep error toasts.

**4. Modify footer UI**
- When `sendComplete`: show a green success bar with "✓ Successfully sent to N recipients" above the footer, and change the Send button to "Close" (which resets state and closes dialog).
- When `sending`: show progress bar (using existing `Progress` component) + "Sending... X of Y" counter below it. Both Cancel and Send buttons disabled.
- Default state: unchanged.

**5. Add `handleCloseAfterSuccess` function**
- Resets all form state (subject, message, groups, individuals, sendEmail, progress, complete) and calls `onOpenChange(false)`.

**6. New import**
- `import { Progress } from '@/components/ui/progress'`
- `import { useEffect, useRef }` added to existing React import
- `import { CheckCircle2 }` from lucide-react

### No other files changed. No backend changes.

