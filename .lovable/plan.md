

# Notification-Triggered Data Handling Re-Acknowledgement

## Overview
Allow admins to send a notification that requires personnel to re-acknowledge data handling terms. When a worker receives this type of notification, they will see a blocking acknowledgement modal on their next login (or immediately if already logged in).

## How It Works

### Admin Side
1. In the **Privacy & Data** section under Settings, add a "Request Re-acknowledgement" button
2. Clicking it opens a dialog where the admin can:
   - Select recipients (all personnel, or filtered by employees/freelancers/individuals)
   - Optionally include a reason or note (e.g., "Updated privacy policy")
   - Specify a new acknowledgement version (auto-incremented, e.g., `1.1`)
3. On confirmation:
   - A system notification is sent to selected recipients informing them about updated data handling terms
   - The acknowledgement version is bumped for those recipients, triggering the blocking modal on their next visit

### Worker Side
1. Worker receives a notification: "Data handling terms have been updated. Please review and acknowledge."
2. On next page load (or immediately if online), the blocking `DataProcessingAcknowledgementDialog` appears because no acknowledgement record exists for the new version
3. Worker must acknowledge before continuing
4. A new row is inserted into `data_processing_acknowledgements` with the updated version

## Technical Details

### Database Changes
None required -- the existing `data_processing_acknowledgements` table already supports versioning. A new version string simply means existing acknowledgements no longer satisfy the check.

### Version Management
- Add a `business_acknowledgement_settings` column or small config table to store the **current required version** per business (instead of hardcoding `1.0` in the hook)
- Alternatively, store it in the `businesses` table as a new column: `required_ack_version TEXT DEFAULT '1.0'`

**New column on `businesses` table:**
```text
required_ack_version TEXT NOT NULL DEFAULT '1.0'
```

### Hook Changes (`useDataAcknowledgement.ts`)
- Instead of checking against a hardcoded `CURRENT_VERSION = '1.0'`, fetch the business's `required_ack_version` and compare against that
- This makes version bumps dynamic and per-business

### New Component: `RequestReAcknowledgementDialog.tsx`
- Version input (auto-suggested as current + 0.1)
- Recipient selection (reuse pattern from `SendNotificationDialog`)
- On submit:
  1. Update `businesses.required_ack_version` to the new version
  2. Send a notification to selected recipients via the existing notification system

### File Changes

| File | Action | Description |
|------|--------|-------------|
| Migration SQL | Create | Add `required_ack_version` column to `businesses` |
| `src/components/RequestReAcknowledgementDialog.tsx` | Create | Admin dialog to trigger re-acknowledgement |
| `src/components/DataAcknowledgementsManager.tsx` | Modify | Add "Request Re-acknowledgement" button |
| `src/hooks/useDataAcknowledgement.ts` | Modify | Fetch version from business record instead of hardcoded constant |
| `src/hooks/useBusinessInfo.ts` | Modify | Include `required_ack_version` in business data fetch |

### Flow Summary

```text
Admin clicks "Request Re-acknowledgement"
  -> Sets new version on business record (e.g., 1.0 -> 1.1)
  -> Sends notification to selected personnel
  -> Workers see notification in their bell icon

Worker opens dashboard
  -> Hook checks: does an acknowledgement exist for version 1.1?
  -> No -> Blocking modal appears
  -> Worker acknowledges -> New row inserted with version 1.1
  -> Modal dismissed, worker continues
```

