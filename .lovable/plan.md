

# Fix: GDPR Dialog Appearing for Already-Acknowledged Users

## Problem
The GDPR confirmation dialog appears every login even though the user has already acknowledged it. The database confirms acknowledgement version 1.1 exists and matches the required version.

## Root Cause
A **race condition** between `useBusinessInfo` and `useDataAcknowledgement`:

1. On mount, `business` is `null`, so `externalVersion` is `undefined`
2. `useDataAcknowledgement` runs immediately with `undefined` version, fetches version "1.1" from the database itself
3. Then `business` loads and passes `required_ack_version = "1.1"` as `externalVersion`
4. This changes the `externalVersion` dependency in `useCallback`, triggering a **complete re-fetch** that resets `hasAcknowledged` back to `false`
5. During this re-fetch window, the dialog flashes open because `hasAcknowledged` is `false`

Additionally, `hasAcknowledged` defaults to `false` and `loading` defaults to `true` -- so any time the hook re-initializes, the dialog will briefly show.

## Fix

### File: `src/hooks/useDataAcknowledgement.ts`

**Change 1:** Don't reset state on re-fetch. Keep `hasAcknowledged` as `true` once set, and don't reset `loading` to `true` on subsequent fetches.

**Change 2:** Skip fetching entirely until dependencies are stable. If `externalVersion` is expected (i.e., we know the caller will provide it), wait for it before querying.

### File: `src/pages/WorkerDashboard.tsx`

**Change 3:** Don't render the `DataProcessingAcknowledgementDialog` until the business info has loaded. Guard the dialog with `business` being available, so we don't show it during the initial loading race.

## Technical Details

In `useDataAcknowledgement.ts`:
- Remove the re-setting of `loading = true` at the start of `fetchAcknowledgement` to avoid flickering
- Preserve `hasAcknowledged = true` once confirmed -- never reset it to `false` on re-fetch
- Only transition `loading` from `true` to `false`, never back

In `WorkerDashboard.tsx`:
- Add a guard: only show the GDPR dialog when `business` is loaded (not null), preventing the dialog from appearing during the loading race
- Change the dialog condition from `!hasAcknowledged` to `!hasAcknowledged && !ackLoading && !!business`

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useDataAcknowledgement.ts` | Prevent state reset on re-fetch; keep `hasAcknowledged` sticky once true |
| `src/pages/WorkerDashboard.tsx` | Guard dialog rendering on `business` being loaded and `ackLoading` being false |

