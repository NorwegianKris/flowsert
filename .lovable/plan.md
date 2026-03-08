

## Batch: Edit Category Name + Personnel Profile Project Tabs

### Prompt 1 — Edit Certificate Category Name

**File:** `src/components/CertificateCategoriesManager.tsx`

**Risk:** 🟢 Pure UI + simple DB update on existing table with existing RLS.

**Changes:**

1. Add state: `editingCategory: { id: string; name: string } | null`, `saving: boolean`
2. Add `Pencil` to lucide imports
3. In the category accordion trigger row (line 209-218), add a pencil button to the left of the trash button:
```tsx
<Button variant="ghost" size="icon" onClick={() => setEditingCategory({ id: category.id, name: category.name })} className="h-7 w-7 text-muted-foreground hover:text-primary">
  <Pencil className="h-3.5 w-3.5" />
</Button>
```
4. Add a small dialog for renaming (reuse AlertDialog pattern or a Dialog with Input + Save/Cancel). On save, run:
```ts
await supabase.from('certificate_categories').update({ name: newName.trim() }).eq('id', editingCategory.id);
```
Then call `fetchCategories()` and close dialog.

---

### Prompt 2 — Personnel Profile Projects as Tabs

**Files:**
- `src/components/AssignedProjects.tsx` — refactor to export sub-components or accept a `filter` prop
- `src/components/PersonnelDetail.tsx` — replace lines 445-449 with tabbed component

**Risk:** 🟠 Medium — restructures UI rendering but no data/logic changes.

**Approach:**

1. **Refactor `AssignedProjects.tsx`:** Export the internal project list rendering as reusable pieces. Add exported sub-components or a new wrapper that exposes `activeProjects`, `previousProjects`, and loading state via a hook or render-prop pattern. Simplest approach: export `useAssignedProjects` (already exists at line 220) and create two presentational components `ActiveProjectsList` and `PreviousProjectsList` that render the project cards without the Card wrapper.

2. **In `PersonnelDetail.tsx` (lines 445-449):** Replace the sequential `PersonnelInvitations` + `AssignedProjects` sections with:
```tsx
<Card className="border-border/50">
  <Tabs defaultValue="active">
    <CardHeader className="py-3">
      <TabsList>
        <TabsTrigger value="active">
          Active Projects {activeProjects.length > 0 && <Badge>...</Badge>}
        </TabsTrigger>
        <TabsTrigger value="previous">
          Previous Projects {previousProjects.length > 0 && <Badge>...</Badge>}
        </TabsTrigger>
        {!hideInvitations && (
          <TabsTrigger value="invitations">
            Invitations {pendingCount > 0 && <Badge>...</Badge>}
          </TabsTrigger>
        )}
      </TabsList>
    </CardHeader>
    <CardContent>
      <TabsContent value="active"><ActiveProjectsList .../></TabsContent>
      <TabsContent value="previous"><PreviousProjectsList .../></TabsContent>
      <TabsContent value="invitations"><PersonnelInvitations .../></TabsContent>
    </CardContent>
  </Tabs>
</Card>
```

3. **Data:** Use the existing `useAssignedProjects` hook (already exported from `AssignedProjects.tsx`) in `PersonnelDetail` to get `projects` and split into active/previous. Use `useProjectInvitations` (already imported) for pending count.

4. **PersonnelInvitations:** Render without its own Card wrapper when used inside the tab. Either add a `bare` prop or create an inner content component.

5. **Freelancer guard:** Currently `AssignedProjects` is hidden for freelancers (line 449). In the tabbed version, hide the Active/Previous tabs for freelancers but still show the Invitations tab if `!hideInvitations`.

