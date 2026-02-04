

# Certificate Standardization & Canonical Mapping System (Final)

## Overview

This plan implements a safe, additive certificate standardization system that maps messy, user-entered certificate names to canonical certificate types. The system preserves raw user input, enables deterministic normalization, and ensures compliance timelines remain clean and stable.

This final revision incorporates additional refinements:
- **Worker selections remain reviewable**: `needs_review = true` unless alias match exists
- **Alias creation is explicitly admin-confirmed**: Only on checkbox + type confirmation, with ambiguity warnings
- **Tightened ambiguity detection**: Generic-term patterns only, known acronyms always bypass
- **Backfill order**: Alias match first, then ambiguity detection only if no match
- **Soft deletion for types**: `is_active` flag instead of hard delete
- **Performance indexes**: Added for review queue queries

---

## Phase 1: Database Schema (Additive Only)

### 1.1 Create `certificate_types` Table

```text
certificate_types
-------------------------------------------------
id                UUID PRIMARY KEY
business_id       UUID NULLABLE (null = global template)
category_id       UUID NULLABLE FK -> certificate_categories
name              TEXT NOT NULL (e.g., "CSWIP 3.2U Inspector")
description       TEXT NULLABLE
is_active         BOOLEAN DEFAULT true (soft delete)
created_at        TIMESTAMPTZ DEFAULT now()
updated_at        TIMESTAMPTZ DEFAULT now()
UNIQUE (business_id, name)
```

**Soft deletion**: Types with `is_active = false` are hidden from dropdowns but preserved for historical data integrity.

### 1.2 Create `certificate_aliases` Table

```text
certificate_aliases
-------------------------------------------------
id                    UUID PRIMARY KEY
business_id           UUID NOT NULL
alias_normalized      TEXT NOT NULL
alias_raw_example     TEXT NULLABLE
certificate_type_id   UUID NOT NULL FK -> certificate_types
confidence            INT DEFAULT 100
created_by            TEXT CHECK IN ('system', 'admin')
last_seen_at          TIMESTAMPTZ DEFAULT now()
created_at            TIMESTAMPTZ DEFAULT now()
UNIQUE (business_id, alias_normalized)
INDEX (business_id, alias_normalized)
```

### 1.3 Extend Existing `certificates` Table

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `title_raw` | TEXT NULLABLE | NULL | Original user input |
| `title_normalized` | TEXT NULLABLE | NULL | Normalized for lookups |
| `certificate_type_id` | UUID NULLABLE | NULL | Links to canonical type |
| `needs_review` | BOOLEAN | FALSE | Flags for admin review |
| `unmapped_reason` | TEXT NULLABLE | NULL | Reason for intentional non-mapping |
| `unmapped_by` | UUID NULLABLE | NULL | Admin who marked unmapped |
| `unmapped_at` | TIMESTAMPTZ NULLABLE | NULL | When marked unmapped |

### 1.4 Performance Indexes

```sql
-- Primary review queue index
CREATE INDEX idx_certificates_review_queue 
ON certificates (business_id, needs_review) 
WHERE needs_review = true;

-- Optional: normalized title lookup for grouping
CREATE INDEX idx_certificates_title_normalized 
ON certificates (business_id, title_normalized);

-- Alias lookup (already defined in table)
CREATE INDEX idx_aliases_lookup 
ON certificate_aliases (business_id, alias_normalized);
```

### 1.5 RLS Policies

Standard patterns scoped by `business_id`:
- **SELECT**: Users in same business can view
- **INSERT/UPDATE/DELETE**: Admin/manager role required for `certificate_types` and `certificate_aliases`
- Workers can modify only their own certificates

---

## Phase 2: Normalization Function

### 2.1 Shared Normalization Logic

File: `src/lib/certificateNormalization.ts`

```text
Steps:
  1. Lowercase
  2. Trim
  3. Collapse whitespace
  4. Replace punctuation with space
  5. Keep alphanumeric + spaces only
  6. Unicode normalize (NFD)

Examples:
  "3.2U Inspection" -> "3 2u inspection"
  "BOSIET (With CA-EBS)" -> "bosiet with ca ebs"
  "HUET" -> "huet"
```

### 2.2 Ambiguity Detection (Pattern-Based Only)

```text
KNOWN ACRONYMS (always bypass ambiguity):
  HUET, BOSIET, GWO, STCW, CSWIP, DMT, EBS, CA-EBS,
  IMCA, OPITO, NOGEPA, OGUK, T-HUET, FOET, MIST

GENERIC PATTERNS (flag as ambiguous):
  Exact matches only:
    "diving", "medical", "certificate", "cert",
    "inspection", "training", "course", "safety",
    "offshore", "marine", "subsea"
  
  Generic phrases:
    "diving cert", "medical certificate", 
    "diving certificate", "safety training"

Detection Logic:
  1. Normalize title
  2. If normalized matches known acronym -> NOT ambiguous
  3. If normalized exactly matches generic term -> AMBIGUOUS
  4. If normalized matches generic phrase pattern -> AMBIGUOUS
  5. Otherwise -> NOT ambiguous

Token count is NEVER used for ambiguity detection.
```

---

## Phase 3: Upload Flow (Role-Based)

### 3.1 Worker Upload Flow

```text
1. Upload certificate file
2. OCR suggests title_raw (no auto-mapping)
3. Compute title_normalized
4. Query alias table for exact match

IF ALIAS EXISTS:
  - Auto-select certificate_type_id
  - Set needs_review = false
  - Show "Auto-matched" badge
  - Update alias last_seen_at

IF NO ALIAS:
  - Type selection is OPTIONAL
  - If worker selects a type manually:
      - Set certificate_type_id to selected
      - Set needs_review = true (worker selection = suggestion)
  - If worker does not select type:
      - Set certificate_type_id = null
      - Set needs_review = true
  - Certificate saves successfully either way
  - "Remember this name" checkbox NOT shown
```

**Key point**: Worker-selected types are treated as suggestions and remain reviewable.

### 3.2 Admin/Manager Upload Flow

```text
1. Upload certificate file
2. OCR suggests title_raw (no auto-mapping)
3. Compute title_normalized
4. Query alias table for exact match

IF ALIAS EXISTS:
  - Auto-select certificate_type_id
  - Set needs_review = false
  - Show "Auto-matched" badge

IF NO ALIAS:
  - Type selection is REQUIRED
  - Show "Remember this name for next time" checkbox
  - If checkbox checked AND title appears generic:
      - Show warning: "This name appears generic. Are you sure?"
      - Require confirmation before alias creation
  - On save with checkbox:
      - Create alias (created_by = 'admin')
      - Set needs_review = false
  - On save without checkbox:
      - No alias created
      - Set needs_review = false (admin confirmed)
```

### 3.3 OCR Behavior

The Edge Function `extract-certificate-data`:
- Returns suggested `certificateName` as `title_raw`
- Returns `matchedCategory` for existing category matching
- **NEVER** auto-creates types or aliases
- All mapping requires explicit user action

---

## Phase 4: Admin Cleanup Tools

### 4.1 Certificate Types Manager

Location: Settings section

Features:
- List all types for business (filter by `is_active`)
- Each type shows linked category from `certificate_categories`
- Create new type: name, description, linked category
- Edit existing types
- Archive type (set `is_active = false`):
  - Type hidden from dropdowns
  - Historical certificates retain reference
  - Show warning with count of linked certificates
- Restore archived types

### 4.2 Alias Manager

Features:
- View aliases grouped by certificate type
- Show raw examples and last-seen timestamps
- Delete individual aliases
- Reassign alias to different type

### 4.3 Review Queue

Table showing certificates where `needs_review = true` AND `unmapped_by IS NULL`:

| Grouped By | Count | Source | Actions |
|------------|-------|--------|---------|
| `title_normalized` | N | Worker-selected / Unmatched | Map / Create / Unmapped |

Columns:
- **Normalized Title**: Grouped key
- **Count**: Number of certificates
- **Sample Raw Titles**: Examples of original input
- **Type Selected**: If worker selected a type (shown for review)
- **Personnel Names**: Who uploaded these

Actions:
1. **Map to Existing Type**: 
   - Select type from dropdown
   - Optional: Create alias for this normalized title
   - Updates all certificates in group
   
2. **Create New Type & Map**:
   - Create new type inline
   - Automatically creates alias
   - Updates all certificates in group

3. **Mark Intentionally Unmapped** (admin-only):
   - Opens dialog requiring `unmapped_reason`
   - Sets `unmapped_by`, `unmapped_at`
   - Sets `needs_review = false`
   - `certificate_type_id` remains null

### 4.4 Safe Backfill Tool

Button: "Standardize Existing Certificates (Safe)"

**Order of Operations** (per batch of 100-300 rows):

```text
FOR EACH certificate WHERE title_raw IS NULL OR title_normalized IS NULL:
  
  1. SET title_raw = existing name (if null)
  2. COMPUTE title_normalized = normalize(title_raw)
  
  3. QUERY alias table for exact match:
     SELECT * FROM certificate_aliases 
     WHERE business_id = ? AND alias_normalized = title_normalized
  
  4. IF ALIAS FOUND:
     - SET certificate_type_id = alias.certificate_type_id
     - SET needs_review = false
     - UPDATE alias.last_seen_at
     - SKIP ambiguity detection (already mapped)
  
  5. IF NO ALIAS FOUND:
     - SET needs_review = true
     - certificate_type_id remains null
     - Ambiguity detection runs for UI hints only
       (does not affect needs_review logic)
```

**Key point**: Alias matching takes priority. Ambiguity detection only informs the admin review UI, not the backfill logic.

---

## Phase 5: Compliance Integration (Feature-Flagged)

### 5.1 Feature Flag

Add to `businesses` table:
```sql
use_canonical_certificates BOOLEAN DEFAULT false
```

### 5.2 Behavior When Enabled

- Timeline grouping uses `certificate_type_id` instead of raw name
- Only certificates with `certificate_type_id` appear in canonical views
- Certificates with `needs_review = true` shown in "Pending Classification" section
- Status calculations unchanged (based on expiry date)

### 5.3 Activation Prerequisites

1. All needs_review certificates addressed
2. Alias coverage reviewed
3. Pilot tenant confirms correctness

---

## Technical Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/lib/certificateNormalization.ts` | Normalize function + ambiguity detection |
| `src/components/CertificateTypeSelector.tsx` | Searchable dropdown with role awareness |
| `src/components/CertificateTypesManager.tsx` | Admin CRUD with archive support |
| `src/components/CertificateAliasesManager.tsx` | Alias management |
| `src/components/CertificateReviewQueue.tsx` | Needs-review cleanup UI |
| `src/components/CertificateBackfillTool.tsx` | Batched backfill with progress |
| `src/components/MarkUnmappedDialog.tsx` | Unmapped reason dialog |
| `src/components/AmbiguityWarningDialog.tsx` | Warning when creating generic alias |
| `src/hooks/useCertificateTypes.ts` | Type management hook |
| `src/hooks/useCertificateAliases.ts` | Alias lookup/creation hook |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/AddCertificateDialog.tsx` | Type selector, role-based logic, alias checkbox |
| `src/components/EditCertificateDialog.tsx` | Type selector, role-based requirements |
| `src/components/CategoriesSection.tsx` | Add standardization management tab |
| `src/types/index.ts` | Extend Certificate interface |

### Database Migrations

1. Create `certificate_types` with `is_active` flag and RLS
2. Create `certificate_aliases` with indexes and RLS
3. Extend `certificates` with new columns
4. Add performance indexes for review queue
5. Add `use_canonical_certificates` flag to businesses

---

## Safety Constraints Summary

| Constraint | Implementation |
|------------|----------------|
| Worker selections are reviewable | `needs_review = true` unless alias match |
| Alias creation is admin-confirmed | Checkbox + confirmation, warning for generic |
| No token-count ambiguity | Pattern matching only, acronyms bypass |
| Backfill prioritizes alias match | Alias lookup before ambiguity detection |
| No hard delete of types | `is_active` flag for soft delete |
| Review queue is performant | Indexes on `needs_review` and `title_normalized` |
| No auto-creation from OCR | OCR suggests only, explicit mapping required |
| All changes additive | New columns nullable, feature-flagged |

---

## Acceptance Criteria

| Scenario | Expected Result |
|----------|-----------------|
| Worker uploads with no alias match, selects type | `needs_review = true`, type saved |
| Worker uploads with alias match | `needs_review = false`, auto-matched |
| Worker uploads with no selection | `needs_review = true`, no type |
| Admin uploads with no alias, checks "Remember" | Alias created, `needs_review = false` |
| Admin creates alias for "diving" | Warning dialog shown, requires confirmation |
| "HUET" processed | NOT flagged as ambiguous |
| "Diving" processed | Flagged as ambiguous |
| Backfill finds existing alias | Sets type, skips ambiguity check |
| Admin archives certificate type | Type hidden, historical data preserved |
| Review queue with 10k certificates | Fast loading via indexes |

