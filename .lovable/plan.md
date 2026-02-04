

# Plan: Streamlined Certificate Type Flow with Proper title_raw Semantics

## Summary

This plan addresses three key improvements:

1. **Remove the "Organize" tab** (redundant with two-pane merging UI)
2. **Fix `title_raw` semantics** so it stores the certificate TYPE, not the certificate name/filename
3. **Add alias auto-matching with clear UX feedback** when users type in the free text field

---

## Critical Fix: title_raw Semantics

### Current Problem

The current code on line 244 of `AddCertificateDialog.tsx`:
```typescript
const titleRaw = cert.titleRaw || cert.name;
```

This means `title_raw` falls back to `cert.name` (the filename, e.g., "TAM Medic duedate 19.05.2023"). Since `cert.titleRaw` is never explicitly populated, the "Inputted types" list shows messy filenames instead of actual certificate types.

### Solution

`title_raw` should ONLY store the certificate type value:
- If user selected from dropdown: store the type name (from `certificate_types.name`)
- If user typed free text: store exactly what they typed in the free text field
- If neither: store `null` (no type specified)

This keeps `title_raw` semantically correct as "the certificate type as entered by the user."

---

## Detailed Changes

### File 1: `src/components/CategoriesSection.tsx`

**Change**: Remove the "Organize" tab

- Remove `<TabsTrigger value="organize">Organize</TabsTrigger>` from the TabsList
- Remove the corresponding `<TabsContent value="organize">...</TabsContent>` block
- Remove the `CertificateReviewQueue` import (now unused)
- Change TabsList from 3 columns to 2 columns

### File 2: `src/components/CertificateTypeSelector.tsx`

**Change**: Add callback to return type name when selected

- Modify `handleSelect` to also call back with the type name
- Add a new prop `onTypeNameChange?: (name: string) => void` or use the existing `onChange(typeId, typeName)` signature

The existing signature already supports this: `onChange: (typeId: string | null, typeName?: string) => void`

### File 3: `src/components/AddCertificateDialog.tsx`

**Changes**:

#### A. Track Free Text for Alias Auto-Matching

Add state to compute normalized free text value:
```typescript
// Compute normalized free text for alias lookup
const freeTextNormalized = useMemo(() => {
  const currentCert = certificates.find(c => c.id === expandedCertId);
  return currentCert?.certificateTypeFreeText 
    ? normalizeCertificateTitle(currentCert.certificateTypeFreeText)
    : null;
}, [certificates, expandedCertId]);
```

Use the existing `useLookupAlias` hook with this value:
```typescript
const { data: aliasMatch } = useLookupAlias(freeTextNormalized);
```

#### B. Show Alias Match Feedback

When `aliasMatch` returns a result:
- Display a small badge below the free text field: "Matched to: [Type Name] (click to undo)"
- Auto-set the `certificateTypeId` and clear free text only if user confirms
- Keep `aliasAutoMatched = true` flag

#### C. Fix title_raw Assignment in Submit Handler

Change from:
```typescript
const titleRaw = cert.titleRaw || cert.name; // BAD: falls back to filename
```

To:
```typescript
// Determine title_raw based on how type was specified
let titleRaw: string | null = null;
if (cert.certificateTypeFreeText?.trim()) {
  // User typed free text - store exactly what they typed
  titleRaw = cert.certificateTypeFreeText.trim();
} else if (cert.certificateTypeId && selectedTypeName) {
  // User selected from dropdown - store the type name
  // (We need to track the selected type name when onChange fires)
  titleRaw = selectedTypeName;
}
// If neither, title_raw stays null - no type was specified
```

Also need to track the selected type name in the certificate entry:
```typescript
// In CertificateEntry interface, add:
certificateTypeName?: string; // The name of the selected type from dropdown
```

And update the `onChange` handler:
```typescript
<CertificateTypeSelector
  value={cert.certificateTypeId || null}
  onChange={(typeId, typeName) => {
    handleFieldChange(cert.id, 'certificateTypeId', typeId);
    handleFieldChange(cert.id, 'certificateTypeName', typeName || null);
    if (typeId) {
      handleFieldChange(cert.id, 'certificateTypeFreeText', '');
    }
  }}
  ...
/>
```

#### D. Handle Alias Auto-Match UX

When user types in free text and an alias is found:
1. Show inline feedback: "Matched: CSWIP 3.2U Inspector" with a small badge
2. Add a button/link to "Use this type" which will:
   - Set `certificateTypeId` to the matched alias's `certificate_type_id`
   - Set `certificateTypeName` to the matched type name
   - Clear `certificateTypeFreeText`
   - Set `aliasAutoMatched = true`
3. If user continues typing after match, clear any auto-match suggestion
4. Never forcibly override - user must click to accept

---

## Data Flow After Changes

```text
UPLOAD SCENARIO A: User selects from dropdown
  → certificateTypeId = selected type ID
  → certificateTypeName = selected type name (e.g., "CSWIP 3.2U Inspector")
  → certificateTypeFreeText = "" (cleared)
  → On save: title_raw = certificateTypeName
  → On save: certificate_type_id = certificateTypeId
  
UPLOAD SCENARIO B: User types free text, no alias match
  → certificateTypeId = null
  → certificateTypeFreeText = "Medic cert" 
  → On save: title_raw = "Medic cert"
  → On save: title_normalized = "medic cert"
  → On save: certificate_type_id = null
  → Appears in "Inputted types" list for admin to merge

UPLOAD SCENARIO C: User types free text, alias matches
  → User types "cswip" in free text
  → System shows: "Matched: CSWIP 3.2U Inspector [Use this type]"
  → If user clicks "Use this type":
    → certificateTypeId = alias.certificate_type_id
    → certificateTypeName = alias.certificate_type_name  
    → certificateTypeFreeText = "" (cleared)
    → aliasAutoMatched = true
    → On save: same as Scenario A
  → If user ignores and continues typing:
    → Same as Scenario B (free text without match)

ADMIN MERGE (existing flow, unchanged):
  → Admin selects inputted types → groups into merged type
  → Creates aliases for each title_normalized
  → Updates certificates with that title_normalized to have certificate_type_id
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/CategoriesSection.tsx` | Remove "Organize" tab and CertificateReviewQueue import |
| `src/components/AddCertificateDialog.tsx` | Fix title_raw semantics, add alias auto-match UX with feedback badge, track type name on selection |
| `src/components/CertificateTypeSelector.tsx` | Minor: ensure typeName is passed in onChange callback (already supported) |

---

## UI Preview: Alias Match Feedback

When user types in free text field and an alias is found:

```text
┌──────────────────────────────┬─────────────────────────────────────┐
│ Select certificate type... ▼ │  [cswip                          ]  │
└──────────────────────────────┴─────────────────────────────────────┘
                                 ↳ Matched: CSWIP 3.2U Inspector [Use this type]
```

The "Matched" indicator:
- Appears as small text below the free text input
- Uses muted styling so it doesn't feel like an error
- The "[Use this type]" is a clickable link/button
- Disappears if user clears or modifies the text to something that doesn't match

---

## Testing Checklist

1. **Organize tab removed**: Settings → Certificates should only show "Categories" and "Types" sub-tabs
2. **Dropdown selection**: Selecting a type from dropdown should set `title_raw` to the type name
3. **Free text entry**: Typing custom text should set `title_raw` to exactly what was typed
4. **Alias auto-match**: Typing text that matches an existing alias should show feedback badge
5. **Accept alias match**: Clicking "Use this type" should set the certificate type and clear free text
6. **Ignore alias match**: Continuing to type should not forcibly change the selection
7. **Inputted types list**: Should only show actual certificate types, not messy filenames

