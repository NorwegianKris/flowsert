

## Make Certificate Category Rows Expandable in CategoriesSection

### Problem
The Categories tab under Settings > Categories > Certificates renders `CertificateCategoriesInner` (inside `CategoriesSection.tsx`, lines 195-362), which shows flat rows with type count badges but no way to expand them. The full `CertificateCategoriesManager` component already has accordion support but is not used in this view.

### Solution
Replace the flat `div` list in `CertificateCategoriesInner` (lines 310-334) with an `Accordion` from Radix, showing assigned certificate types when expanded.

### Changes in `src/components/CategoriesSection.tsx`

**1. Add missing imports** (around line 175-176):
- Add `Accordion, AccordionItem, AccordionTrigger, AccordionContent` (already imported at top of file on line 6 — but since `CertificateCategoriesInner` is below the second import block at line 169, need to add `ChevronDown` to the lucide import at line 175 and use the Accordion components already imported at line 6).

**2. Add helper function** inside `CertificateCategoriesInner` (after line 204):
```tsx
const getTypesForCategory = (categoryId: string) => {
  if (!certificateTypes) return [];
  return certificateTypes.filter(t => t.category_id === categoryId).sort((a, b) => a.name.localeCompare(b.name));
};
```

**3. Replace the flat list** (lines 310-334) with an Accordion:
```tsx
<Accordion type="multiple" className="border rounded-lg">
  {categories.map((category) => {
    const types = getTypesForCategory(category.id);
    return (
      <AccordionItem key={category.id} value={category.id}>
        <AccordionTrigger className="px-3 hover:no-underline">
          <div className="flex items-center gap-2 flex-1 mr-2">
            <span className="font-medium">{category.name}</span>
            <Badge variant={types.length > 0 ? "secondary" : "outline"}
              className={types.length === 0 ? "text-muted-foreground" : ""}>
              {types.length} {types.length === 1 ? 'type' : 'types'}
            </Badge>
            <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon"
                onClick={() => { setCategoryToDelete(category); setDeleteDialogOpen(true); }}
                className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-3 pb-3">
          {types.length === 0 ? (
            <p className="text-sm text-muted-foreground pl-4 py-2">No types assigned</p>
          ) : (
            <div className="space-y-1 pl-4">
              {types.map((type) => (
                <div key={type.id} className="py-1.5 text-sm">{type.name}</div>
              ))}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    );
  })}
</Accordion>
```

### Files modified
- `src/components/CategoriesSection.tsx` — update `CertificateCategoriesInner` to use Accordion with type listings

