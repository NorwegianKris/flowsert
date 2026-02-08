
# Add Recent Registrations Section to Overview Page

## Overview
Add a lightweight informational section at the bottom of the Overview tab that displays the latest 5-10 personnel registrations with their type, date, and source. This gives admins quick visibility into who has recently joined the system.

---

## User Experience

### Layout
The section will appear below the ExpiryTimeline on the Overview tab:

```text
[Compliance Snapshot - filter toggles]
[Expiry Timeline - certificate lanes]
[Recent Registrations - new section]
```

### Display Format
```text
┌─────────────────────────────────────────────────────────┐
│ 👤 Recent Registrations                                 │
├─────────────────────────────────────────────────────────┤
│ [Avatar] Emalie Idalen            Freelancer   2h ago   │
│          Self-registered                          →     │
├─────────────────────────────────────────────────────────┤
│ [Avatar] Matey Yordanov           Freelancer   4h ago   │
│          Self-registered                          →     │
├─────────────────────────────────────────────────────────┤
│ [Avatar] Heidi Benedikte Nordtveit Employee   4 days    │
│          Invited by admin                         →     │
└─────────────────────────────────────────────────────────┘
                      [View all personnel →]
```

### Information per row
| Element | Description |
|---------|-------------|
| Avatar | Initials with subtle background |
| Name | Personnel name (clickable) |
| Type badge | "Employee" or "Freelancer" (muted colors) |
| Time | Relative format ("2 days ago") |
| Source | "Self-registered" or "Invited by admin" |
| Arrow | Visual indicator that row is clickable |

---

## Technical Changes

### 1. Update Personnel Type (`src/types/index.ts`)
Add the `createdAt` field to the Personnel interface:

```typescript
export interface Personnel {
  // ... existing fields
  createdAt?: string; // Registration timestamp
}
```

### 2. Update usePersonnel Hook (`src/hooks/usePersonnel.ts`)
Map the `created_at` database field to the TypeScript interface:

```typescript
createdAt: p.created_at || undefined,
```

This change is needed in both `usePersonnel()` and `useWorkerPersonnel()` functions.

### 3. Create RecentRegistrations Component (`src/components/RecentRegistrations.tsx`)
New component with the following structure:

**Props:**
- `personnel: Personnel[]` - Full personnel list
- `onPersonnelClick: (person: Personnel) => void` - Navigation callback
- `limit?: number` - Number of entries to show (default: 8)

**Logic:**
- Filter to only show personnel with `createdAt` defined
- Sort by `createdAt` descending (newest first)
- Limit to specified count
- If empty, show "No recent registrations" or hide entirely

**Registration Source Logic:**
```typescript
const getRegistrationSource = (person: Personnel) => {
  // Freelancers self-register via the freelancer registration flow
  if (person.category === 'freelancer') {
    return 'Self-registered';
  }
  // Employees are added by admin (either directly or via invitation)
  return 'Invited by admin';
};
```

### 4. Update AdminDashboard (`src/pages/AdminDashboard.tsx`)
Add the new component to the Overview tab content:

```tsx
<TabsContent value="overview" className="mt-6 space-y-6">
  <ComplianceSnapshot ... />
  <ExpiryTimeline ... />
  <RecentRegistrations 
    personnel={personnel}
    onPersonnelClick={setSelectedPersonnel}
    limit={8}
  />
</TabsContent>
```

---

## Component Design Details

### Card Styling
Following the existing pattern from AdminOverview and PersonnelOverview:

```tsx
<Card className="border-border/50">
  <CardHeader className="pb-3">
    <CardTitle className="text-lg font-semibold flex items-center gap-2">
      <UserPlus className="h-5 w-5 text-muted-foreground" />
      Recent Registrations
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* Registration list */}
  </CardContent>
</Card>
```

### Row Styling
Each registration row will be clickable and include:

```tsx
<button
  onClick={() => onPersonnelClick(person)}
  className="w-full flex items-center gap-4 p-3 rounded-lg border border-border/50 
             hover:bg-muted/50 transition-colors text-left"
>
  <Avatar className="h-10 w-10 shrink-0">
    <AvatarFallback className="bg-muted text-muted-foreground text-sm">
      {initials}
    </AvatarFallback>
  </Avatar>
  
  <div className="flex-1 min-w-0">
    <p className="font-medium text-sm truncate">{person.name}</p>
    <p className="text-xs text-muted-foreground">{registrationSource}</p>
  </div>
  
  <div className="flex items-center gap-2 shrink-0">
    <Badge variant="outline" className="text-xs">{personType}</Badge>
    <span className="text-xs text-muted-foreground">{relativeTime}</span>
    <ChevronRight className="h-4 w-4 text-muted-foreground" />
  </div>
</button>
```

### Badge Colors (Muted, Non-Urgent)
| Type | Styling |
|------|---------|
| Employee | `bg-muted text-muted-foreground border-border` |
| Freelancer | `bg-muted text-muted-foreground border-border` |

### Empty State
When no recent registrations exist:
```tsx
<div className="text-center py-6">
  <p className="text-sm text-muted-foreground">No recent registrations</p>
</div>
```

### Optional "View All" Link
At the bottom of the list, a subtle link to switch to Personnel tab:
```tsx
<div className="pt-3 text-center">
  <Button 
    variant="ghost" 
    size="sm" 
    className="text-muted-foreground hover:text-foreground"
    onClick={() => onViewAll?.()}
  >
    View all personnel
    <ChevronRight className="h-4 w-4 ml-1" />
  </Button>
</div>
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types/index.ts` | Modify | Add `createdAt?: string` to Personnel interface |
| `src/hooks/usePersonnel.ts` | Modify | Map `created_at` to `createdAt` in both hook functions |
| `src/components/RecentRegistrations.tsx` | Create | New component for the recent registrations section |
| `src/pages/AdminDashboard.tsx` | Modify | Add RecentRegistrations to Overview tab |

---

## Scope Verification

| Requirement | Status |
|-------------|--------|
| Show latest 5-10 registrations | Yes (configurable limit, default 8) |
| Display name, type, date, source | Yes |
| Clicking navigates to profile | Yes |
| Read-only and informational | Yes |
| Subtle visual treatment | Yes (muted colors, no urgency) |
| No certificate/update activity | Yes (only registration events) |
| No filtering or configuration | Yes |
| Hide if empty | Optional (can show empty state instead) |
