

## Fix: Distinguish "Remaining" from "Failed" in AI Suggest Results

**Problem**: `failedCount` is computed as `filtered.length - suggestions.length`, which lumps together certificates not reached (due to batch limit) with actual processing errors. Both show as red "Failed".

**Root cause** (line 358): When the edge function processes 100 of 247, it returns ~100 suggestions. The remaining 147 are counted as "failed" even though they were never attempted.

### Changes — single file: `src/components/AISuggestDialog.tsx`

#### 1. Replace `failedCount` state with two separate counts

Replace the single `failedCount` state (line 134) with:
- `remainingCount` — certificates not reached due to batch limit (neutral)
- `actualFailedCount` — certificates attempted but errored (red)

#### 2. Compute the two counts correctly (line ~358)

When `result.partial` is true:
- `remaining = filtered.length - result.processed` (not attempted)
- `actualFailed = result.processed - suggestions.length` (attempted, no result)

When not partial:
- `remaining = 0`
- `actualFailed = filtered.length - suggestions.length`

#### 3. Update summary stat cards (lines 585–602)

Replace the single red "Failed" card with:
- **"X remaining"** — always show, neutral grey/blue styling (`bg-muted/50`), only if count > 0
- **"X failed"** — red styling (`bg-destructive/10`), only if count > 0

Keep 4-column grid but conditionally show cards.

#### 4. Update partial banner (lines 604–608)

Change from `"Processed X of Y — run again for remaining"` to:
`"Processed X of Y. Z remaining — run again to continue."`

Use neutral blue/muted styling instead of `bg-destructive/10`.

#### 5. Update bottom failed message (lines 906–914)

- If `remainingCount > 0`: Show `"X certificates not yet processed — run again to continue."` in neutral styling.
- If `actualFailedCount > 0`: Show `"X certificates failed"` in red, only when > 0.

#### 6. Update `resetState` to clear both new state vars.

