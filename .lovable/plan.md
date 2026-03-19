

## Plan: Remove 40-recipient email cap from notification dialog

### Changes in `src/components/SendNotificationDialog.tsx`

**1. Delete the `MAX_EMAIL_RECIPIENTS` constant (line 24)**

**2. Remove the `uniqueEmailCount` memo (lines 96-100)** — no longer needed

**3. Remove the auto-disable useEffect (lines 102-111)** — the effect that force-unchecks the email checkbox when over 40

**4. Remove `showEmailCapWarning` variable (line 270)**

**5. Delete the email cap warning block (lines 456-464)** — the AlertTriangle warning UI

**6. Remove `disabled={showEmailCapWarning}` from the Checkbox (line 472)** — email checkbox is always enabled

**7. Remove the "(exceeds N limit)" span from the Label (lines 476-478)**

**8. Remove unused imports** — `AlertTriangle` if no longer used elsewhere in the file

### No other files changed.

