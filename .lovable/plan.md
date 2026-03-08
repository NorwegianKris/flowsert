

## Fix: Invitation Row Date Clipping

### Problem
In the `InvitationsContent` sub-component of `PersonnelProjectsTabs.tsx`, the invitation date text ("Invited 27.2.2026") is clipped underneath the Decline/Accept buttons. This happens at intermediate widths where `sm:flex-row` activates but horizontal space is tight — the buttons compress the left content area.

### Fix (1 line change)

**File:** `src/components/PersonnelProjectsTabs.tsx`, line 248

**Current:**
```tsx
<div className="flex items-center gap-2 w-full sm:w-auto">
```

**Replace with:**
```tsx
<div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
```

Adding `shrink-0` prevents the buttons container from being compressed, ensuring the left content (including the date) always has room to display fully. The `min-w-0` on the left side already handles text truncation gracefully via `truncate` on the project name — the date line will no longer be squeezed out.

### Risk
🟢 Single CSS class addition. No logic changes.

