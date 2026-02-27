

## Plan: Add teal card tint for recurring projects

### Single file change — `src/components/ProjectsTab.tsx`

In the `ProjectCard` component (around line 163), update the card's `className` logic:

**Current:** only checks `isPosted` for lavender tint
**New:** add teal tint when `isRecurring`, with recurring taking priority over posted when both are true

```
isRecurring  → bg-teal-500/10 border-teal-500/50
isPosted     → bg-[#C4B5FD]/10 border-[#C4B5FD]/50
both         → bg-teal-500/10 border-teal-500/50  (recurring wins)
neither      → default card styling
```

The hover ring stays `hover:ring-[#C4B5FD]` for all cards to keep the brand consistent.

### Risk
- 🟢 Pure UI styling — no anchor required

