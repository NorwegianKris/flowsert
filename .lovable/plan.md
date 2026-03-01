

## Fix: Suppress Duplicate Alias Toast During AI Suggest Approval

**Problem**: The `useCreateAlias` hook's `onError` callback shows a toast for duplicate alias errors (code 23505) before the AISuggestDialog's catch block can suppress it.

**Root cause**: Line 155-161 in `src/hooks/useCertificateAliases.ts` — the `onError` handler unconditionally toasts on 23505.

**Risk**: 🟢 UI-only — no data model, no backend changes.

### Change: `src/hooks/useCertificateAliases.ts`

In the `useCreateAlias` hook's `onError` callback (lines 155-161), silently ignore duplicate alias errors instead of showing a toast. Only show the toast for non-duplicate errors. This makes the hook safe for both manual "Teach the System" use (where the admin already sees context) and automated AI Suggest flows.

```typescript
// Before:
onError: (error: any) => {
  if (error.code === "23505") {
    toast.error("An alias with this name already exists");
  } else {
    toast.error("Failed to create alias");
  }
},

// After:
onError: (error: any) => {
  if (error.code === "23505") {
    // Silently skip — alias already exists, no action needed
    return;
  }
  toast.error("Failed to create alias");
},
```

### Files changed

| File | Action |
|---|---|
| `src/hooks/useCertificateAliases.ts` | MODIFY — suppress 23505 toast in `onError` |

