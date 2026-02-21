

## Bug Fixes: 4 Items

All changes are 🟢 UI-only (Q5) -- no schema, RLS, edge functions, or auth changes.

---

### 1. "Clear Search" button for AI Personnel Search

**File:** `src/components/AIPersonnelSuggestions.tsx`

The "Clear" button currently only shows when there are results (`suggestedCount > 0`). It needs to also appear when a search has been performed but returned zero results, or when the AI filter is active.

- Show the "Clear Search" button whenever `suggestions` is not null (i.e., a search has been performed) OR `aiPrompt` is not empty
- Rename label to "Clear Search" for clarity
- The existing `handleClear` already resets prompt, clears suggestions, clears highlight, and calls `onFilterByAI(null)` -- no logic changes needed

---

### 2. "Get Started" button on About page navigates to Contact

**File:** `src/pages/About.tsx` (line 118)

Currently: `onClick={() => navigate('/auth')}` -- goes to login.
Fix: Change to `onClick={() => navigate('/contact')}` to go to the Contact page.

---

### 3. Separate Events lane in Project Timeline

**Files:**
- **NEW** `src/components/project-timeline/EventsLane.tsx` -- new component for non-milestone calendar items (events), styled with a distinct color (e.g., blue/primary tint), placed between Milestones and Phases
- **MODIFY** `src/components/project-timeline/MilestoneLane.tsx` -- remove the rendering of events (the `!isMilestone` items); only render milestones. Update empty state text to "No milestones"
- **MODIFY** `src/components/project-timeline/ProjectTimeline.tsx` -- import and render `EventsLane` between `MilestoneLane` and `PhaseLane`, passing the same `calendarItems`

The EventsLane will filter for `!isMilestone` items and render them as small dots (same style currently used in MilestoneLane for events), with its own label "Events" and a distinct background tint.

---

### 4. Scrollable Notifications Log

**File:** `src/components/NotificationsLog.tsx`

The notifications list view (line 283) already uses `ScrollArea`, but the dialog's `max-h-[80vh] overflow-hidden` combined with flex layout may prevent proper scrolling.

Fix: Wrap the list view's `ScrollArea` in a container with explicit max height, and ensure the detail view's recipients list also scrolls properly by adding `ScrollArea` where the raw `overflow-y-auto` div is used (line 241).

---

### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/components/AIPersonnelSuggestions.tsx` | MODIFY | Show "Clear Search" button when any search state is active |
| `src/pages/About.tsx` | MODIFY | Change "Get Started" to navigate to `/contact` |
| `src/components/project-timeline/EventsLane.tsx` | CREATE | New lane for non-milestone events |
| `src/components/project-timeline/MilestoneLane.tsx` | MODIFY | Remove events rendering, milestones only |
| `src/components/project-timeline/ProjectTimeline.tsx` | MODIFY | Add EventsLane between Milestones and Phases |
| `src/components/NotificationsLog.tsx` | MODIFY | Fix scroll behavior in list and detail views |

