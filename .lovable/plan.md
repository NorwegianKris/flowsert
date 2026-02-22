

## Add Lavender Tint to Posted Project Header Card

**Risk: GREEN** -- purely UI styling change.

### What Changes

The header card in `ProjectDetail.tsx` (line 191) will get a lavender background tint when the project is posted, and remain white (default) for active/non-posted projects.

### Technical Detail

**File: `src/components/ProjectDetail.tsx`** (line 191)

```tsx
// Before
<Card className="border-border/50">

// After
<Card className={`border-border/50 ${project.isPosted ? 'border-[#C4B5FD]/50 bg-[#C4B5FD]/10' : ''}`}>
```

When a posted project is activated (`isPosted` becomes `false`), the card automatically reverts to the default white background. One line change in one file.

