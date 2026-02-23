

# Fix: Remove Colored Icons from Project Detail Toggle Bar

**Risk: GREEN** -- purely UI color change.

## Problem
In the project detail view, the Personnel and Documents tab triggers have colored icons:
- Personnel tab: `<Users className="h-4 w-4 text-violet-500" />`
- Documents tab: `<FileText className="h-5 w-5 text-amber-500" />`

The dashboard's main toggle bar uses unstyled icons that inherit the tab's text color (white when active, muted when inactive), which is the desired behavior.

## Solution
In `src/components/ProjectDetail.tsx` (lines 378 and 382), remove the explicit color classes from the icons so they inherit the tab trigger's text color -- matching the dashboard pattern.

| Line | Before | After |
|------|--------|-------|
| 378 | `<Users className="h-4 w-4 text-violet-500" />` | `<Users className="h-4 w-4" />` |
| 382 | `<FileText className="h-5 w-5 text-amber-500" />` | `<FileText className="h-5 w-5" />` |

## Files modified
| File | Change |
|------|--------|
| `src/components/ProjectDetail.tsx` | Remove `text-violet-500` and `text-amber-500` from tab trigger icons (lines 378, 382) |

