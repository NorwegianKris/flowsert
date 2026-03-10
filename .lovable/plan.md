

## Move Shift Tabs Below Search Row

### Current order (lines in AddProjectDialog.tsx)
1. Personnel header + Select All (~1130-1146)
2. **Shift tabs (1148-1173)** ← wrong position
3. FreelancerFilters (1175-1178)
4. Invite/Assign banner (1180-1185)
5. Search + Filters + Sort (1187-1453)
6. Personnel list ScrollArea (1455+)

### Target order
1. Personnel header + Select All
2. FreelancerFilters
3. Invite/Assign banner
4. Search + Filters + Sort
5. **Shift tabs** ← move here
6. Personnel list ScrollArea

### Change — `AddProjectDialog.tsx`
- **Remove** the shift tabs block from lines 1148-1173
- **Insert** the identical block at line 1454 (after the search/sort `</div>` and before `<ScrollArea>`)

Single file, pure relocation — no logic changes.

