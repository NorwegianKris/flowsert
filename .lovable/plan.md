
Goal: make project name/location reliably show in `WorkerInvitations` without changing the fixed card layout, button handlers, colors, or behavior.

1) Root-cause diagnosis (already identified from code + network)
- `WorkerInvitations.tsx` renders `invitation.projectName` / `invitation.projectLocation`.
- The fetch hook (`useProjectInvitations.ts`) does join `project_invitations -> projects` and network shows project data is returned.
- The fragile point is data-shape assumptions in mapping (`inv.projects?.*` only). If embedded relation shape varies (e.g. alias/key differences), mapped flat fields become `undefined`, and UI falls back to generic text.

2) Data fetch hardening in `src/hooks/useProjectInvitations.ts`
- Keep the invitation query joined to projects, but make relation explicit and stable:
  - Use a singular relation alias (e.g. `project:projects(...)`) for clarity.
  - Include at minimum `name` and `location` (and keep other currently used project fields).
- In mapper, normalize project payload once, then map from that normalized object:
  - `const project = inv.project ?? inv.projects ?? null;`
  - If array shape appears, safely pick first item.
- Populate:
  - `projectName` from normalized `project.name`
  - `projectLocation` from normalized `project.location`
- Keep all existing invitation logic unchanged.

3) Render confirmation in `src/components/WorkerInvitations.tsx`
- Keep current layout structure exactly as fixed.
- Keep this content block (or equivalent):
  - first line: `projectName` (truncate)
  - second line: `projectLocation` only when non-empty (truncate)
- Add a robust fallback only for title (`'Project Invitation'`) and render no empty location row.

4) Safety constraints (explicitly preserved)
- No changes to:
  - Accept/Decline handlers
  - Button styles/colors/icons
  - Card structure and spacing that fixed clipping
  - Invitation response logic / dialog logic

5) Verification checklist after implementation
- Open worker dashboard `/worker` and confirm in “Project Invitations”:
  - Project name appears on line 1
  - Location appears on line 2 when present
  - No blank second line when location missing
  - Date row remains below with `mt-2`
  - Accept/Decline actions still work exactly as before
- Confirm network response and mapped object keys align (`projectName`, `projectLocation` non-undefined for pending invitations with project data).
