

## Plan: Add Skills Section to Worker Profiles

### 1. Database Migration
Add `skills text[] default '{}'` to `personnel` table.

### 2. Type & Data Layer
- **`src/types/index.ts`**: Add `skills?: string[]` to `Personnel` interface
- **`src/hooks/usePersonnel.ts`**: Map `skills: p.skills || []` in both `usePersonnel` and `useWorkerPersonnel`

### 3. New Shared Data: `src/lib/skillsData.ts`
Export `SKILL_CATEGORIES` constant — array of `{ emoji, name, skills[] }` for all 18 categories (~170 skills). Reused by SkillsSelector and CustomPersonnelFilterDialog.

### 4. New Component: `src/components/SkillsSelector.tsx`
Props: `skills: string[]`, `onChange: (skills: string[]) => void`, `readonly?: boolean`

**Layout (edit mode):**
- Header: "Pick up to 8 key skills..." with counter "X of 8 selected" top-right
- Selected chips row at top with X buttons to deselect
- Search input filtering across all categories
- Categories with emoji headers (🤿 Diving & Subsea, 🔧 Mechanical, etc.)
- 6 tags shown per category by default, "Show more" toggle to expand
- Selected tags: filled `bg-[#3B3AC2]` white text; Unselected: outlined/ghost
- At 8 selected: unselected tags greyed out + disabled with tooltip

**Readonly mode:** Just renders selected skills as filled chips, no editing.

### 5. PersonnelDetail Integration
**`src/components/PersonnelDetail.tsx`** (line ~385): Insert a Skills card after the bio card, before the Certificates card. Shows `SkillsSelector` in readonly mode with an inline save — admin and worker can both edit via an Edit button that toggles edit mode, saves directly to DB on confirm.

### 6. EditPersonnelDialog Integration
**`src/components/EditPersonnelDialog.tsx`**:
- Add `skills: [] as string[]` to formData (line 42-64)
- Initialize from `personnel.skills || []` (line 66-93)
- Include `skills` in update payload (line 163-188)
- Render `SkillsSelector` after bio section (line 459)

### 7. PersonnelCard Preview
**`src/components/PersonnelCard.tsx`** (line ~231): Show first 3 skills as small `Badge` components in the card footer, before the certificates count row.

### 8. AI Search Integration
- **`src/hooks/useSuggestPersonnel.ts`**: Add `skills: string[]` to `PersonnelForAI` interface, include `p.skills || []` in the mapped data
- **`supabase/functions/suggest-project-personnel/index.ts`**: Add `skills: string[]` to `PersonnelData` interface so the AI prompt includes skills for matching

### Files Changed
1. Migration: `ALTER TABLE personnel ADD COLUMN skills text[] DEFAULT '{}'`
2. `src/types/index.ts`
3. `src/hooks/usePersonnel.ts`
4. `src/lib/skillsData.ts` (new)
5. `src/components/SkillsSelector.tsx` (new)
6. `src/components/PersonnelDetail.tsx`
7. `src/components/EditPersonnelDialog.tsx`
8. `src/components/PersonnelCard.tsx`
9. `src/hooks/useSuggestPersonnel.ts`
10. `supabase/functions/suggest-project-personnel/index.ts`

