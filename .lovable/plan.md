
# Certificates Navigation Refactor (UI Only)

## Summary

Restructure the Certificates sub-navigation from 5 flat tabs to a cleaner 3-tab layout with a collapsible Advanced section. This is a presentation-only change - no backend, schema, or logic modifications.

---

## Current vs Target Structure

```text
CURRENT:
Categories | Types | Aliases | Review Queue | Backfill Tool

TARGET:
Categories | Types | Organize
                              
[Advanced] (collapsible)
  ├─ Aliases
  └─ Backfill Tool
```

---

## Changes Required

### 1. Update TabsList (lines 63-69)

Remove Aliases, Review Queue, and Backfill Tool triggers. Keep Categories and Types. Add new "Organize" trigger.

**Before:**
```tsx
<TabsList className="mb-4">
  <TabsTrigger value="categories">Categories</TabsTrigger>
  <TabsTrigger value="types">Types</TabsTrigger>
  <TabsTrigger value="aliases">Aliases</TabsTrigger>
  <TabsTrigger value="review">Review Queue</TabsTrigger>
  <TabsTrigger value="backfill">Backfill Tool</TabsTrigger>
</TabsList>
```

**After:**
```tsx
<TabsList className="mb-4">
  <TabsTrigger value="categories">Categories</TabsTrigger>
  <TabsTrigger value="types">Types</TabsTrigger>
  <TabsTrigger value="organize">Organize</TabsTrigger>
</TabsList>
```

### 2. Replace Review Queue TabsContent with Organize (lines 98-105)

**Before:**
```tsx
<TabsContent value="review">
  <div className="space-y-2 mb-4">
    <p className="text-sm text-muted-foreground">
      Review certificates that need manual type assignment.
    </p>
  </div>
  <CertificateReviewQueue />
</TabsContent>
```

**After:**
```tsx
<TabsContent value="organize">
  <div className="space-y-2 mb-4">
    <p className="text-sm text-muted-foreground">
      Confirm which certificates belong together. The system will organize them automatically.
    </p>
  </div>
  <CertificateReviewQueue />
</TabsContent>
```

### 3. Remove Aliases and Backfill TabsContent (lines 89-109)

Delete these TabsContent blocks as they will be moved to the Advanced section.

### 4. Add Collapsible Advanced Section

After the closing `</Tabs>` tag (line 110), add a collapsible section containing Aliases and Backfill:

```tsx
{/* Advanced Tools - Collapsible */}
<Collapsible className="mt-6 border-t pt-4">
  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
    <Settings2 className="h-4 w-4" />
    <span>Advanced</span>
    <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
  </CollapsibleTrigger>
  <CollapsibleContent className="pt-4 space-y-6">
    <div className="text-xs text-muted-foreground mb-4">
      Rarely used tools for managing recognition and bulk processing.
    </div>
    <div>
      <h4 className="text-sm font-medium mb-2">Aliases</h4>
      <CertificateAliasesManager />
    </div>
    <div>
      <h4 className="text-sm font-medium mb-2">Backfill Tool</h4>
      <CertificateBackfillTool />
    </div>
  </CollapsibleContent>
</Collapsible>
```

### 5. Add Required Imports (line 11)

Add imports for Collapsible components and icons:

```tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Settings2 } from 'lucide-react';
```

---

## File Changes Summary

| File | Action |
|------|--------|
| `src/components/CategoriesSection.tsx` | Modify - restructure Certificates sub-tabs |

---

## What Stays the Same

- Categories tab (broad certificate categories)
- Types tab (canonical certificate type reference)
- CertificateReviewQueue component logic (just renamed in navigation)
- CertificateAliasesManager component (relocated to Advanced)
- CertificateBackfillTool component (relocated to Advanced)
- All backend logic, data, and permissions

---

## UX Copy Updates

| Location | Text |
|----------|------|
| Organize helper | "Confirm which certificates belong together. The system will organize them automatically." |
| Advanced intro | "Rarely used tools for managing recognition and bulk processing." |
