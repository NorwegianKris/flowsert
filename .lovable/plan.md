
# Plan: Show Previously Mapped Certificates in Type Merging UI

## Problem

When personnel upload certificates with custom names, they appear in the "Inputted Types" list. However, once these are grouped into an official type (like "CSWIP 3.2U Inspector"), they disappear from view because the current filter only shows unmapped certificates (`certificate_type_id IS NULL`).

This makes it impossible to:
- See what certificates have already been grouped into each official type
- Find older uploads with different naming variations to add to the same type
- Re-assign certificates to a different type if needed

## Solution

Add a **"Show mapped"** toggle to the Inputted Types pane that reveals all historical uploads, including those already assigned to a type. Additionally, display certificate counts on each Merged Type so you can see how many are grouped under each.

## Visual Changes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Inputted Types                                     │  Merged Types         │
│  ─────────────────────────────────────────          │  ─────────────────    │
│                              [Toggle] Show mapped   │                       │
│  ┌──────────────────────────────────────┐          │  ○ CSWIP 3.2U Inspector│
│  │ ☐ BOSIET                             │          │    3 certificates     │
│  │   1 certificate • John Doe           │   ──►    │                       │
│  │   (Not yet mapped)                   │          │  ○ Diver Medical      │
│  └──────────────────────────────────────┘          │    4 certificates     │
│  ┌──────────────────────────────────────┐          │                       │
│  │ ☐ 3.2U Inspector                     │          │  ○ Class B            │
│  │   1 certificate • Jane Smith         │          │    1 certificate      │
│  │   ✓ Mapped to: CSWIP 3.2U Inspector  │          │                       │
│  └──────────────────────────────────────┘          │                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

When toggle is ON:
- All historical uploads appear (both mapped and unmapped)
- Already-mapped items show a green badge indicating their current type
- These can still be selected and re-grouped to a different type

## Technical Changes

### File 1: `src/hooks/useInputtedTypes.ts`

**Add options parameter:**

```typescript
export function useInputtedTypes(options?: { includeMapped?: boolean }) {
  const { businessId } = useAuth();
  const includeMapped = options?.includeMapped ?? false;

  return useQuery({
    queryKey: ["inputted-types", businessId, includeMapped],
    queryFn: async () => {
      // ... existing setup ...
      
      let query = supabase
        .from("certificates")
        .select(`
          id,
          title_raw,
          title_normalized,
          certificate_type_id,
          personnel_id,
          created_at,
          expiry_date,
          document_url,
          certificate_types ( name ),
          personnel!inner (
            business_id,
            name
          )
        `)
        .eq("personnel.business_id", businessId)
        .is("unmapped_by", null)
        .not("title_raw", "is", null);
      
      // Only filter for unmapped when not including mapped
      if (!includeMapped) {
        query = query.is("certificate_type_id", null);
      }
      
      // ... rest of query
    }
  });
}
```

**Update InputtedType interface:**

Add a `mapped_type_name` field to track what type each group is mapped to (when showing mapped items).

### File 2: `src/components/TypeMergingPane.tsx`

**Add state and toggle:**

```tsx
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Add state
const [showMapped, setShowMapped] = useState(false);

// Update hook usage
const { data: inputtedTypes = [], ... } = useInputtedTypes({ 
  includeMapped: showMapped 
});
```

**Add toggle UI in header (after search):**

```tsx
<div className="flex items-center gap-2 pt-2">
  <Switch 
    id="show-mapped" 
    checked={showMapped} 
    onCheckedChange={setShowMapped}
  />
  <Label htmlFor="show-mapped" className="text-xs text-muted-foreground cursor-pointer">
    Show mapped
  </Label>
</div>
```

**Add visual indicator for mapped items:**

When an inputted type has a `certificate_type_id`, show which official type it belongs to:

```tsx
{inputted.is_mapped && inputted.mapped_type_name && (
  <div className="flex items-center gap-1 mt-1">
    <CheckCircle2 className="h-3 w-3 text-green-600" />
    <span className="text-xs text-green-700">
      Mapped to: {inputted.mapped_type_name}
    </span>
  </div>
)}
```

**Show certificate counts on Merged Types:**

In the right pane, display how many certificates are assigned to each type:

```tsx
<span className="text-xs text-muted-foreground">
  {merged.usage_count || 0} certificate{merged.usage_count !== 1 ? 's' : ''}
</span>
```

### File 3: `src/hooks/useCertificateTypes.ts`

Update to include certificate usage counts per type (batch fetch for efficiency).

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useInputtedTypes.ts` | Add `includeMapped` option, join to `certificate_types` table, track mapped type name |
| `src/components/TypeMergingPane.tsx` | Add toggle switch, show mapped indicator, show certificate counts on merged types |
| `src/hooks/useCertificateTypes.ts` | Add certificate count per type |

## Behavior Summary

1. **Default (toggle OFF)**: Same as current - shows only unmapped certificate names
2. **Toggle ON**: Shows all certificate names including those already assigned
   - Mapped items display a green indicator showing current type
   - Can still select and re-group to a different type
3. **Merged Types pane**: Shows certificate count for each type for visibility

## Edge Cases

- Re-grouping an already-mapped certificate updates its `certificate_type_id` to the new type
- Alias creation still works - new aliases are added for the normalized title
- The "dismiss" option only available for unmapped items (mapped items already have a destination)
