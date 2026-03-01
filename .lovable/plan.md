

## Real-Time Progress During AI Suggest Analysis

### Problem

The current processing phase sends **all certificates in a single API call** to the edge function, which processes them internally in batches of 25. The client has no visibility into progress — it shows an indeterminate progress bar and static text until the entire response returns.

The user's assumption that processing is "sequential with 500ms delay" does not apply here — that pattern is used in the re-scan tool, not this dialog.

### Approach

Split the **client-side** call into multiple smaller API calls (batches of 25, matching the server's internal batch size). Each batch call completes and returns results, allowing the UI to update progress after each batch. The edge function itself is **not changed**.

### Changes — `src/components/AISuggestDialog.tsx`

#### 1. Add `processedCount` state

New state variable to track how many certificates have been processed so far, updated after each batch call resolves.

#### 2. Refactor `handleStart` to loop over client-side batches

Instead of sending all `certsPayload` in one call, chunk into groups of 25 and call the edge function once per chunk. After each call:
- Increment `processedCount` by the batch size
- Update `progressText` to `"Processing X of Y certificates..."`
- Update progress bar value to `(processedCount / totalCount) * 100`
- Check `abortRef.current` between batches for stop support
- Accumulate suggestions from all batch responses

#### 3. Update processing phase UI (lines 578–590)

- Progress bar: change `value={undefined}` to `value={(processedCount / certCount) * 100}` — deterministic fill
- Text above bar: `"Processing {processedCount} of {certCount} certificates..."`
- Text below bar: `"{certCount - processedCount} certificates remaining..."`

#### 4. Merge partial results

After all batches complete (or abort), merge accumulated suggestions and compute `remainingCount` / `actualFailedCount` the same way as today.

#### 5. Reset `processedCount` in `resetState`

### Files changed

| File | Action |
|---|---|
| `src/components/AISuggestDialog.tsx` | MODIFY |

