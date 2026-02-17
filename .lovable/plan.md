

## Remove Phone Number from Add Personnel Dialog

A small UI cleanup to the "Add Personnel" form.

### What changes

Remove the phone number field from the Add Personnel dialog. Since workers complete their own profiles after accepting an invitation, collecting phone at this stage is unnecessary.

### Technical details

**File:** `src/components/AddPersonnelDialog.tsx`

1. Remove `phone` from the `formData` state initial value and reset
2. Remove the phone input field from the form JSX
3. Remove `formData.phone.trim()` from the validation check
4. Change the insert call to use an empty string for `phone` (since the DB column is NOT NULL with no default)

The database `personnel.phone` column is `text NOT NULL`, so we'll pass an empty string `''` as a placeholder. The worker will fill in their real phone number when completing their profile after signing up.

