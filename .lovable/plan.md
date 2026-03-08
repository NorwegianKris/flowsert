

## Button Function Consistency Audit

### Audit Findings

After reading all button instances across the application, here are the inconsistencies found, grouped by functional category:

---

### 1. Confirm / Accept / Approve — Reference: `className="bg-emerald-600 text-white hover:bg-emerald-700"`

**Consistent (no changes needed):**
- `PersonnelInvitations.tsx` — inline Accept (line 108) and dialog Accept (line 275)
- `PersonnelProjectsTabs.tsx` — inline Accept (line 248) and dialog Accept (line 335)
- `ProjectApplicationsList.tsx` — dialog Accept (line 173)

**Inconsistent:**
- `AISuggestDialog.tsx` lines 828-836 and 1024-1032 — Approve buttons use `variant="outline" className="h-7 text-xs"` instead of emerald green
- `AIIssuerSuggestDialog.tsx` lines 729-737 and 909-917 — same issue

**Decision:** These are *not* the same function as Accept in invitations. They are granular approve actions inside an AI review queue with a tight inline layout. The `outline` variant is appropriate here — they are small inline actions, not primary confirmation buttons. **No change needed.**

---

### 2. Decline / Reject — Reference: `variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700"`

**Consistent:**
- `PersonnelInvitations.tsx` inline (line 99): `text-red-600 hover:bg-red-50 hover:text-red-700` ✓
- `PersonnelProjectsTabs.tsx` inline (line 244): `text-red-600 hover:bg-red-50 hover:text-red-700` ✓

**Inconsistent — missing `hover:bg-red-50`:**
- `PersonnelInvitations.tsx` dialog (line 267): `className="text-red-600 hover:text-red-700"` — missing `hover:bg-red-50`
- `PersonnelProjectsTabs.tsx` dialog (line 332): `className="text-red-600 hover:text-red-700"` — missing `hover:bg-red-50`
- `ProjectApplicationsList.tsx` dialog Reject (line 165): `className="text-red-600 hover:text-red-700"` — missing `hover:bg-red-50`

**Fix:** Add `hover:bg-red-50` to these 3 buttons.

---

### 3. Destructive / Delete — Reference: `variant="destructive"` or `className="bg-destructive text-destructive-foreground hover:bg-destructive/90"`

**All consistent.** Every Delete button across the app uses destructive styling:
- `RemoveCertificateDialog.tsx` — `variant="destructive"` ✓
- `AdminOverview.tsx` — AlertDialogAction with destructive class ✓
- `CategoriesSection.tsx` — AlertDialogAction with destructive class ✓
- `WorkerGroupsManageList.tsx` — AlertDialogAction with destructive class ✓
- `PersonnelDocuments.tsx` / `ProjectDocuments.tsx` — AlertDialogAction with destructive class ✓
- All category managers — AlertDialogAction with destructive class ✓
- `ActivateProfileDialog.tsx` Deactivate — destructive class ✓
- `PostedProjects.tsx` Cancel Application — `variant="destructive"` ✓
- Stop buttons (RescanCertificatesTool, CertificateLocationNormalizationTool) — `variant="destructive"` ✓

**No changes needed.**

---

### 4. Primary Action / Submit / Save — Reference: default `<Button>` (primary purple)

All primary action buttons (Add Phase, Save, Activate Profile, Create, Send, Invite, etc.) use the default Button variant. **No changes needed.**

---

### 5. Secondary / Cancel / Back — Reference: `variant="outline"` or `AlertDialogCancel`

All Cancel buttons use either `variant="outline"` or `AlertDialogCancel`. **No changes needed.**

---

### 6. Icon-only action buttons

Not checking in detail per the prompt ("already standardised in the previous pass, verify no regression"). The inline icon buttons in `ProjectApplicationsList.tsx` (lines 96-115) use consistent ghost variant with semantic colors. **No regression observed.**

---

### Summary of Changes

Only **3 lines** need fixing — all are Decline/Reject buttons in dialog footers missing `hover:bg-red-50`:

| File | Line | Current | Fix |
|------|------|---------|-----|
| `PersonnelInvitations.tsx` | 267 | `"text-red-600 hover:text-red-700"` | `"text-red-600 hover:bg-red-50 hover:text-red-700"` |
| `PersonnelProjectsTabs.tsx` | 332 | `"text-red-600 hover:text-red-700"` | `"text-red-600 hover:bg-red-50 hover:text-red-700"` |
| `ProjectApplicationsList.tsx` | 165 | `"text-red-600 hover:text-red-700"` | `"text-red-600 hover:bg-red-50 hover:text-red-700"` |

### Risk
CSS-only. No logic changes.

