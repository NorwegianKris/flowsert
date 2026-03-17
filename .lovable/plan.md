

## Fix Teach the System Upload Flow — 3 Issues

### 1. "Upload More Samples" should append, not reset

**Current:** Line 449 calls `reset()` which clears all files and suggestions.

**Fix:** Replace `reset` call with a new function that:
- Sets `processed = false` to re-show the upload zone
- Keeps existing `files` and `suggestions` intact
- The `addFiles` callback (line 54) already appends via `setFiles(prev => [...prev, ...toAdd])`, but it also clears suggestions on line 69 — need to remove that `setSuggestions([])` call
- The `processFiles` function (line 86) already skips non-pending files (`if (item.status !== 'pending') continue`), so re-analyzing works correctly
- Change `setSuggestions` on line 189 from replacing to appending: `setSuggestions(prev => [...prev, ...newSuggestions])`

### 2. Make suggested type name editable

**Current:** Line 397 renders `s.extractedName` as plain `<span>`.

**Fix:** For pending suggestions, replace the `<span>` with an `<Input>` component (from `@/components/ui/input`). On change, update the suggestion's `extractedName` in state via `setSuggestions`. The `approveSuggestion` function already uses `suggestion.extractedName` for creating the type, so edits flow through automatically.

### 3. Add AI-suggested helper text

**Fix:** Below the editable input, add: `<p className="text-xs text-muted-foreground">AI-suggested name — click to edit</p>`

### Files modified
- `src/components/TaxonomySeedingTool.tsx` — all 3 changes in this single file

