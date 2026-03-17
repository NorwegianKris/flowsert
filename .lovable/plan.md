

## Auto-reset After All Suggestions Approved

### What changes

**`src/components/TaxonomySeedingTool.tsx`** — three modifications:

1. **`approveSuggestion`** (line 209-212): Instead of showing individual toasts per approval, track approved items and return the approved name + category for the summary. Remove the per-item `toast.success`.

2. **`approveAll`** (lines 231-236): After approving all pending suggestions, build a summary toast listing each approved type with its category, then call `reset()`.

3. **Add a `useEffect`** or post-approval check: After each individual approval, check if all non-dismissed suggestions are now approved. If so, show the summary toast and reset. This handles both the "Approve All" path and the "last individual approve" path.

### Implementation detail

Add a helper to build the summary toast message:

```tsx
const showApprovalSummaryAndReset = (approvedItems: Array<{name: string; categoryId: string}>) => {
  const lines = approvedItems.map(item => {
    const cat = (categories || []).find(c => c.id === item.categoryId);
    return `• ${item.name}${cat ? ` — ${cat.name}` : ''}`;
  }).join('\n');
  
  toast.success(`${approvedItems.length} certificate type${approvedItems.length !== 1 ? 's' : ''} added to your system:\n${lines}`, {
    duration: 6000,
  });
  reset();
};
```

**`approveAll`** — collect results, then call the helper:

```tsx
const approveAll = async () => {
  const pending = suggestions.filter(s => s.status === 'pending');
  const approved: Array<{name: string; categoryId: string}> = [];
  for (const s of pending) {
    await approveSuggestion(s);
    approved.push({ name: s.extractedName, categoryId: s.categoryId });
  }
  if (approved.length > 0) {
    showApprovalSummaryAndReset(approved);
  }
};
```

**`approveSuggestion`** — remove the per-item `toast.success("... approved and added")`. After marking as approved, check if all suggestions are now resolved (approved or dismissed). If so, collect all approved ones and call `showApprovalSummaryAndReset`. This auto-resets when the last suggestion is individually approved.

### Files modified
- `src/components/TaxonomySeedingTool.tsx`

