
# Plan: Synchronize Edit Certificate Dialog with Add Certificate Fields

## Summary

Update the Edit Certificate Dialog to have the **exact same fields and UI** as the "Processed Certificates" section in the Add Certificate Dialog. This ensures workers editing their certificates can enter custom types that appear in the admin's "Inputted Types" list.

## Fields Required (in order)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Certificate Name | Text input | Yes | Already exists |
| Category | Dropdown | No | **MISSING - needs adding** |
| Date of Issue | Date input | Yes | Already exists |
| Expiry Date | Date input | No | Already exists |
| Place of Issue | Text input | No | Already exists |
| Issuing Authority | Text input | No | Already exists |
| Certificate Type | Hybrid (dropdown + free text) | Yes* | **Needs free text support** |

## Changes Required

### File: `src/components/EditCertificateDialog.tsx`

#### 1. Add Category State and Fetch

Add state and database fetch for certificate categories:

```typescript
const [categoryId, setCategoryId] = useState<string | null>(null);
const [categories, setCategories] = useState<{id: string; name: string}[]>([]);

// Fetch categories on dialog open
useEffect(() => {
  const fetchCategories = async () => {
    if (!businessId) return;
    const { data } = await supabase
      .from('certificate_categories')
      .select('id, name')
      .eq('business_id', businessId)
      .order('name');
    setCategories(data || []);
  };
  if (open) fetchCategories();
}, [businessId, open]);
```

#### 2. Populate Category from Certificate

In the existing `useEffect` that populates form fields:

```typescript
setCategoryId((certificate as any).category_id || null);
```

#### 3. Add Category Dropdown UI

Add after Certificate Name field:

```tsx
<div className="space-y-2">
  <Label>Category</Label>
  <Select
    value={categoryId || 'none'}
    onValueChange={(value) => setCategoryId(value === 'none' ? null : value)}
  >
    <SelectTrigger>
      <SelectValue placeholder="No category" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">No category</SelectItem>
      {categories.map((cat) => (
        <SelectItem key={cat.id} value={cat.id}>
          {cat.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

#### 4. Add Free Text State for Certificate Type

```typescript
const [certificateTypeFreeText, setCertificateTypeFreeText] = useState('');
const [debouncedFreeText, setDebouncedFreeText] = useState('');

// Debounce free text for alias lookup
useEffect(() => {
  const timer = setTimeout(() => setDebouncedFreeText(certificateTypeFreeText), 400);
  return () => clearTimeout(timer);
}, [certificateTypeFreeText]);
```

#### 5. Add Alias Lookup for Free Text

```typescript
const freeTextNormalized = debouncedFreeText?.trim()
  ? normalizeCertificateTitle(debouncedFreeText)
  : null;

const { data: freeTextAliasMatch, isLoading: freeTextAliasLoading } = useLookupAlias(
  useCanonicalCertificates && freeTextNormalized ? freeTextNormalized : null
);
```

#### 6. Update CertificateTypeSelector with Free Text

Change from dropdown-only to hybrid mode:

```tsx
<CertificateTypeSelector
  value={selectedTypeId}
  onChange={(typeId, typeName) => {
    setSelectedTypeId(typeId);
    setSelectedTypeName(typeName || null);
    if (typeId) {
      setCertificateTypeFreeText(''); // Clear free text when dropdown selected
    }
  }}
  required={isAdminOrManager}
  autoMatched={showAutoMatched}
  placeholder={isAdminOrManager ? "Select certificate type..." : "Select type (optional)..."}
  allowFreeText={true}
  freeTextValue={certificateTypeFreeText}
  onFreeTextChange={(text) => {
    setCertificateTypeFreeText(text);
    if (text) {
      setSelectedTypeId(null); // Clear dropdown when free text entered
      setSelectedTypeName(null);
    }
  }}
/>
```

#### 7. Add Alias Match Feedback UI

After the CertificateTypeSelector, add the same feedback badge as in Add dialog:

```tsx
{/* Alias Match Feedback for free text */}
{certificateTypeFreeText?.trim() && 
 !selectedTypeId && 
 freeTextAliasMatch && 
 freeTextAliasMatch.certificate_type_name && (
  <div className="flex items-center gap-2 mt-1 p-2 rounded bg-primary/5 border border-primary/20">
    <span className="text-xs text-muted-foreground">
      Matched: <span className="font-medium text-foreground">
        {freeTextAliasMatch.certificate_type_name}
      </span>
    </span>
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-auto p-0 text-xs text-primary"
      onClick={() => {
        setSelectedTypeId(freeTextAliasMatch.certificate_type_id);
        setSelectedTypeName(freeTextAliasMatch.certificate_type_name);
        setCertificateTypeFreeText('');
      }}
    >
      Use this type
    </Button>
  </div>
)}
```

#### 8. Update Submit Logic

Modify title_raw determination to prioritize free text:

```typescript
let titleRaw: string | null = null;
if (certificateTypeFreeText?.trim()) {
  // User typed free text - store exactly what they typed
  titleRaw = certificateTypeFreeText.trim();
} else if (selectedTypeId && selectedTypeName) {
  // User selected from dropdown - store the type name
  titleRaw = selectedTypeName;
}
const titleNormalized = titleRaw ? normalizeCertificateTitle(titleRaw) : null;

// If free text is used without selecting an alias match, type ID should be null
updateData.certificate_type_id = certificateTypeFreeText?.trim() && !selectedTypeId 
  ? null 
  : selectedTypeId;
```

Also add category update:

```typescript
updateData.category_id = categoryId;
```

#### 9. Reset State on Dialog Open

Clear free text and category when dialog opens:

```typescript
setCertificateTypeFreeText('');
```

## Visual Result

The Edit Certificate dialog will now have:

```text
┌─────────────────────────────────────────────┐
│ ✎ Edit Certificate                          │
├─────────────────────────────────────────────┤
│                                             │
│ Certificate Name *                          │
│ [_____________________________]             │
│                                             │
│ Category                                    │
│ [▼ No category________________]             │
│                                             │
│ Date of Issue *          Expiry Date        │
│ [___________]            [___________]      │
│                                             │
│ Place of Issue           Issuing Authority  │
│ [___________]            [___________]      │
│                                             │
│ Certificate Type *                          │
│ [▼ Select type...] or type if not found [__]│
│                                             │
│ ☐ Remember this name for future matching    │
│                                             │
│ Document (PDF or Image)                     │
│ [📎 existing-doc.pdf] [View] [✕]            │
│                                             │
├─────────────────────────────────────────────┤
│                      [Cancel] [Save Changes]│
└─────────────────────────────────────────────┘
```

## Data Flow After Implementation

```text
User edits certificate and types custom text
      │
      ├─► Alias lookup runs on debounced text
      │       │
      │       ├─► Match found ─► Shows "Matched: [Type]" badge
      │       │                  User can click "Use this type"
      │       │                      │
      │       │                      └─► Sets certificate_type_id
      │       │                          Clears free text
      │       │
      │       └─► No match ─► User saves with free text
      │                       certificate_type_id = NULL
      │                       title_raw = [custom text]
      │                       → Appears in Inputted Types list
      │
      └─► User selects from dropdown
              │
              └─► certificate_type_id = [selected ID]
                  title_raw = [type name]
                  → Does NOT appear in Inputted Types
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/EditCertificateDialog.tsx` | Add category state/fetch/dropdown, add free text state, update CertificateTypeSelector with allowFreeText, add alias match feedback UI, update submit logic |

## Additional Imports Needed

```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
```
