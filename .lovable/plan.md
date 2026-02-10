

# GDPR Data Processing Acknowledgement

## Overview
Implement a GDPR-compliant acknowledgement system that documents personnel have been informed about data processing. This is an **acknowledgement** (not consent) -- recording that the user read and understood the data handling information.

## What Changes

### 1. Database: New `data_processing_acknowledgements` table

Create an immutable audit table:

```text
data_processing_acknowledgements
  id                      uuid (PK, default gen_random_uuid())
  personnel_id            uuid (FK -> personnel.id, NOT NULL)
  business_id             uuid (FK -> businesses.id, NOT NULL)
  acknowledged_at         timestamptz (NOT NULL)
  acknowledgement_version text (NOT NULL, e.g. "1.0")
  acknowledgement_type    text (NOT NULL, e.g. "registration", "policy_update")
  created_at              timestamptz (default now())
```

**RLS policies:**
- Workers can SELECT their own acknowledgements (via personnel.user_id)
- Workers can INSERT their own acknowledgements
- Admins/managers can SELECT acknowledgements for their business
- No UPDATE or DELETE policies for any role

### 2. Acknowledgement Modal (Worker Flow)

**New component: `DataProcessingAcknowledgementDialog.tsx`**

Shown on the Worker Dashboard **before** the user can interact with the system. It checks the database for an existing acknowledgement record for the current personnel + business combination.

**Modal content (exact wording from requirements):**
- Title: "Handling of personal data and documentation"
- Body text explaining controller/processor roles, with company name dynamically inserted
- Required checkbox: "I confirm that I have read and understood this information"
- "Continue" button (disabled until checkbox is checked)

**Flow:**
1. On WorkerDashboard load, query `data_processing_acknowledgements` for the personnel's latest record
2. If no record exists, show the blocking modal
3. On acknowledgement, INSERT a row and dismiss the modal
4. The Welcome Dialog continues to work independently (shown after acknowledgement if applicable)

### 3. Personnel Profile: Read-only "Data handling / Privacy" Section

Add a new Card in `PersonnelDetail.tsx` (visible to admins viewing any profile, and workers viewing their own) below the "Next of Kin" section:

```text
Data handling / Privacy
  Acknowledged:    Yes / No
  Acknowledged at: 27 Jan 2026 · 08:31 (or "---")
  Version:         1.0
```

Read-only, no actions.

### 4. Admin Settings: Privacy & Data Acknowledgements List

Add a new section in the Settings panel (`AdminDashboard.tsx`), rendered as a new component `DataAcknowledgementsManager.tsx`.

**Location:** Below the existing "Categories" section in Settings, as a new Card titled "Privacy & Data".

**Coverage indicator at top:**
"Acknowledgement coverage: 46 of 50 personnel acknowledged"

**Table columns:**
- Person (name)
- Personnel type (Employee / Freelancer)
- Acknowledged (Yes / No)
- Acknowledged at
- Version
- Source (Self-registered / Invited)

**Filters:**
- Missing acknowledgement only (toggle)
- Employees / Freelancers (dropdown)

**Interaction:** Clicking a row closes settings and opens the personnel profile.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| Migration SQL | Create | New `data_processing_acknowledgements` table + RLS |
| `src/components/DataProcessingAcknowledgementDialog.tsx` | Create | Blocking modal for workers on first use |
| `src/components/DataAcknowledgementsManager.tsx` | Create | Admin list view for Settings panel |
| `src/pages/WorkerDashboard.tsx` | Modify | Add acknowledgement check before rendering content |
| `src/components/PersonnelDetail.tsx` | Modify | Add read-only "Data handling / Privacy" card |
| `src/pages/AdminDashboard.tsx` | Modify | Add Privacy & Data section in Settings panel |
| `src/hooks/useDataAcknowledgement.ts` | Create | Hook to query/insert acknowledgement records |

---

## Technical Details

### RLS Policy Design

```sql
-- Workers view own acknowledgements
CREATE POLICY "Workers can view own acknowledgements"
ON data_processing_acknowledgements FOR SELECT
TO authenticated
USING (
  personnel_id IN (
    SELECT id FROM personnel WHERE user_id = auth.uid()
  )
);

-- Admins view business acknowledgements
CREATE POLICY "Admins can view business acknowledgements"
ON data_processing_acknowledgements FOR SELECT
TO authenticated
USING (
  business_id = get_user_business_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- Workers can insert own acknowledgements
CREATE POLICY "Workers can insert own acknowledgements"
ON data_processing_acknowledgements FOR INSERT
TO authenticated
WITH CHECK (
  personnel_id IN (
    SELECT id FROM personnel WHERE user_id = auth.uid()
  )
);
```

No UPDATE or DELETE policies -- records are immutable.

### Acknowledgement Version Strategy

Version `"1.0"` is hardcoded for v1. If the legal text changes in the future, bumping the version string will trigger re-acknowledgement (query checks for the current version).

### Worker Dashboard Blocking Logic

The acknowledgement dialog renders as a blocking overlay. The existing `WelcomeDialog` remains separate and shows after the acknowledgement is complete (it uses localStorage, acknowledgement uses the database).

