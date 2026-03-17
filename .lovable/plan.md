

## Plan: Add Existing Business Confirmation State to InviteAccept

The `existing_business` confirmation state was **not** added. Currently, `evaluateSession` goes directly to `'ready'` when the email matches, without checking if the user already belongs to another business. This means accepting silently overwrites their `business_id`.

### Fix: `src/pages/InviteAccept.tsx`

1. Add `'existing_business'` to the `PageState` union type
2. Add state variable `currentBusinessName` to store the user's current business name
3. In `evaluateSession`, after confirming email match, query `profiles` for the user's current `business_id`. If it exists and differs from `invite.business_id`, fetch the business name from `businesses` table and set state to `'existing_business'`
4. Add a new render block for `state === 'existing_business'` showing:
   - "You are currently a member of **[Current Business]**"
   - "Accepting this invitation will switch you to **[New Business]** as **[role]**"
   - An "Accept and Switch" button that calls `handleAccept`
   - A "Cancel" button/link

| File | Change |
|------|--------|
| `src/pages/InviteAccept.tsx` | Add `existing_business` state, profile/business lookup in `evaluateSession`, confirmation UI |

