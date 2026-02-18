

## Two Changes to Posted Projects Dialog

### 1. Rename "Cancel" button to "Close"

**`src/components/PostedProjects.tsx`** (line ~189 in DialogFooter)
- Change the outline button label from the conditional `'Close' : 'Cancel'` to always say `"Close"`.

### 2. Show company name and logo in the project details card

**`src/hooks/usePostedProjects.ts`**
- Add `businessName` and `businessLogoUrl` to the `PostedProject` interface.
- After fetching projects, join with the `businesses` table (projects already have `business_id`) to get `name` and `logo_url`.
- Map those fields into each `PostedProject` object.

**`src/components/PostedProjects.tsx`**
- In the dialog's project details card (the `rounded-lg bg-muted/50 p-3` div around line 174), restructure it to a flex layout:
  - Left side: project name, description, date, and location (existing content).
  - Right side: company logo (using Avatar with fallback) and company name below it.
- Import `Avatar`, `AvatarImage`, `AvatarFallback` from the UI components.

The result will look like a card with project info on the left and a small company logo + name aligned to the right.

### Technical details

**PostedProject interface additions:**
```typescript
businessName?: string;
businessLogoUrl?: string;
```

**Data fetching change** -- fetch the business once after getting `personnelData.business_id`:
```typescript
const { data: businessData } = await supabase
  .from('businesses')
  .select('name, logo_url')
  .eq('id', personnelData.business_id)
  .maybeSingle();
```

Then set `businessName: businessData?.name` and `businessLogoUrl: businessData?.logo_url` on each project.

**Dialog card layout:**
```tsx
<div className="rounded-lg bg-muted/50 p-3">
  <div className="flex items-start justify-between gap-3">
    <div className="flex-1 min-w-0">
      {/* existing: name, description, date, location */}
    </div>
    {(selectedProject.businessLogoUrl || selectedProject.businessName) && (
      <div className="flex flex-col items-center gap-1 shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={selectedProject.businessLogoUrl} />
          <AvatarFallback>{selectedProject.businessName?.[0]}</AvatarFallback>
        </Avatar>
        <span className="text-xs text-muted-foreground text-center max-w-[80px] truncate">
          {selectedProject.businessName}
        </span>
      </div>
    )}
  </div>
</div>
```
