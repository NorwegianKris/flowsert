

## Make "Posted" Badge Consistent Between Project Cards and Project Detail View

**Risk: GREEN** -- purely UI styling change.

### Problem

When a project is posted, the project card in the dashboard correctly shows a purple "Posted" badge with a Megaphone icon. However, inside the project detail view, it ignores `isPosted` and always shows the status-based badge (e.g., "Active" in indigo), which is incorrect and confusing.

### Fix

**File: `src/components/ProjectDetail.tsx`** (lines 211-214)

Update the badge rendering to check `project.isPosted` first. If the project is posted, show the same purple Megaphone "Posted" badge used on project cards. Otherwise, fall back to the normal status badge.

Replace:
```tsx
<Badge variant={config.variant} className="text-sm">
  <StatusIcon className="h-3 w-3 mr-1" />
  {config.label}
</Badge>
```

With:
```tsx
{project.isPosted ? (
  <Badge className="text-sm bg-[#C4B5FD] text-[#4338CA] border-[#C4B5FD]">
    <Megaphone className="h-3 w-3 mr-1" />
    Posted
  </Badge>
) : (
  <Badge variant={config.variant} className="text-sm">
    <StatusIcon className="h-3 w-3 mr-1" />
    {config.label}
  </Badge>
)}
```

Also update the icon fallback area (line 200-202) to use a purple theme when posted:

```tsx
<div className={`p-4 rounded-xl ${project.isPosted ? 'bg-[#C4B5FD]/10' : `${config.color}/10`}`}>
  {project.isPosted ? (
    <Megaphone className="h-12 w-12 text-[#C4B5FD]" />
  ) : (
    <StatusIcon className={`h-12 w-12 ...`} />
  )}
</div>
```

`Megaphone` is already imported in the file. Single file, two small changes.

