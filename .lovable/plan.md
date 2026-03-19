

## Plan: Increase notification email throughput

### Changes in `supabase/functions/send-notification-email/index.ts`

**1. Remove the 40-recipient hard cap (lines ~208-215)**
- Delete the `if (uniqueRecipients.length > 40)` block entirely

**2. Reduce inter-send delay from 500ms to 200ms (line ~244)**
- Change `setTimeout(r, 500)` to `setTimeout(r, 200)`

### No other files changed.

