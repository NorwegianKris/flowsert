

## Two Fixes for Teach the System Upload Flow

### Fix 1: Cancel button when upload zone reappears

**Problem**: Line 510 sets `processed = false` to show the upload zone again, but there's no way to dismiss it without clearing state.

**Change** (line 316): The upload zone currently shows when `!processing && !processed`. After clicking "Upload More Samples", `processed` becomes `false`, showing the zone. Add a state `showUploadZone` and a "Done" button to hide it.

Simpler approach: track whether we're in "add more" mode. When "Upload More Samples" is clicked, set a flag. Show a "Cancel" button next to the upload zone that sets `processed = true` again (reverting to the results view).

**Implementation in `src/components/TaxonomySeedingTool.tsx`**:

1. Line 510 — change the "Upload More Samples" button to set a new `addingMore` state instead of toggling `processed`:
   - Add state: `const [addingMore, setAddingMore] = useState(false);`
   - Upload zone condition (line 316): show when `(!processing && !processed) || addingMore`
   - "Upload More Samples" button: `onClick={() => setAddingMore(true)}`
   - Add a "Cancel" button below the upload zone when `addingMore` is true: `onClick={() => setAddingMore(false)}`
   - Reset `addingMore` in `reset()` and after `processFiles()`

2. When in `addingMore` mode, show a "Cancel" button next to the upload zone that returns to the suggestions view.

### Fix 2: "Already known" files should not block approval

**Problem**: Currently there's no actual blocking — the approval buttons work on `pendingSuggestions` which only includes `status === 'pending'` suggestions. Files with `status === 'matched'` (already known) don't create suggestions at all (lines 128-134). So this should already work.

However, if ALL files are "already known" (no new suggestions), the `pendingSuggestions.length > 0` check (line 423) hides the approval section entirely, and there's no feedback. The summary text on line 418-421 shows the counts but could be clearer.

**Change**: When `processed` is true and there are zero pending suggestions (all matched/errors), show a clear message like "All certificates are already recognized in your system" with a reset button, rather than just the bare summary.

### Files modified
- `src/components/TaxonomySeedingTool.tsx`

