

## Batch C: Project Timeline and Project View Fixes (5 items)

### #68 — Edit/delete phases, events, milestones in timeline
**Status: Already implemented.** The `EditTimelineItemsDialog` component already exists and is wired up via the "Edit timeline" button (Settings icon) in `ProjectTimeline.tsx`. It supports editing descriptions/dates and deleting items with inline edit mode. The dialog is connected in `ProjectDetail.tsx` lines 556-565 with full CRUD handlers (`handleRemoveCalendarItem`, `removePhase`, `handleUpdateCalendarItem`, `updatePhase`). No changes needed.

### #117 — Availability bar start position fix + certificate bar readability
**Root cause:** The `AvailabilityLane` uses `dateToX(span.startDate, ...)` which can produce negative values for spans starting before the project. The `Math.max(0, x1Raw)` on line 71 handles the left clamp, but the width calculation `x2 - x1` doesn't account for the clamped x1 vs raw x1, potentially making bars wider than they should be. Actually looking more carefully, x1 is already clamped — the issue is that `fillGapsWithAvailable` in `useProjectTimelineData.ts` starts the loop at the project start date but uses `new Date(projectStart + 'T00:00:00')` which is fine. The real issue is `dateToX` returns 0 for the project start, but the availability span's first day maps to x=0, so the bar starts at the correct position. The width extends correctly via the +1 day logic.

**Actual fix needed:** The `dateToX` function divides by `totalDays` which is `differenceInDays(end, start)`. For the availability lane, `endDatePlusOne` adds 1 day to make it inclusive, but this can push `x2` beyond `totalWidth`. Need to clamp x2 to `totalWidth`.

**Certificate bar readability:** In `ComplianceLane.tsx`, bars use `text-[9px]` which is very small. Increase to `text-[10px]` and ensure `whitespace-nowrap` isn't causing overflow issues.

**Files:**
- `src/components/project-timeline/AvailabilityLane.tsx` — clamp x2 to totalWidth
- `src/components/project-timeline/ComplianceLane.tsx` — increase font size to `text-[10px]`, add `overflow-hidden` to bar container

### #125 — Certificate bar label: Category – Type – Issuer
**Status: Already implemented.** `ComplianceLane.tsx` line 77 already renders `[bar.certificate.category, bar.certificate.name, bar.certificate.issuingAuthority].filter(Boolean).join(' – ')` which produces exactly "Category — Type — Issuer". No changes needed.

### #127 — Clicking certificate bar highlights it in status list
**Status: Already implemented.** `ComplianceLane.tsx` calls `onScrollToCertificates?.(bar.certificate.id)` on click. `ProjectTimeline.tsx` passes `handleScrollToCertificates` which calls `onHighlightCertificate`. `ProjectDetail.tsx` manages `highlightedCertificateId` state and passes it to `ProjectCertificateStatus`, which applies `ring-2 ring-primary shadow-md` and scrolls into view. However, the Collapsible is closed by default — clicking a bar won't auto-open it.

**Fix needed:** In `ProjectCertificateStatus.tsx`, auto-expand the Collapsible when `highlightedCertificateId` is set.

**File:** `src/components/ProjectCertificateStatus.tsx` — add controlled `open` state to Collapsible, set it to true when `highlightedCertificateId` changes.

### #133 — Certificate status list filters
**File:** `src/components/ProjectCertificateStatus.tsx`

Add filter controls above the table inside `CollapsibleContent`:
- **Personnel dropdown** — Select from assigned personnel (filter by `personnelId`)
- **Role filter** — Text input or dropdown of unique roles
- **Compliance status** — Buttons/toggles for Valid / Expiring / Expired

Use the same filter styling as the Personnel tab (outline dropdowns, white background, `max-w-96` input pattern).

Apply filters to `sortedCertificates` before rendering.

---

### Summary

| # | Status | Action | Files | Risk |
|---|--------|--------|-------|------|
| 68 | Already implemented | Skip | — | — |
| 117 | Needs fix | Clamp availability bar x2, improve cert bar font | AvailabilityLane.tsx, ComplianceLane.tsx | None |
| 125 | Already implemented | Skip | — | — |
| 127 | Partial fix needed | Auto-expand collapsible on highlight | ProjectCertificateStatus.tsx | None |
| 133 | Needs implementation | Add filter controls to cert status list | ProjectCertificateStatus.tsx | None |

No schema changes. Pure UI — anchor optional.

