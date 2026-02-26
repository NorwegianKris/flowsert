

## Changes across 5 files — COMPLETED ✅

### 1. `supabase/functions/suggest-project-personnel/index.ts`

- ✅ Model changed to `google/gemini-2.5-flash` + `temperature: 0`
- ✅ Geographic Location Matching prompt replaced with strict rules
- ✅ `includeEmployees` added to request body destructuring
- ✅ Filter logic updated: `return true` → `return includeEmployees`
- ✅ `logUsage` model string updated

### 2. `src/hooks/useSuggestPersonnel.ts`

- ✅ `includeEmployees: boolean` parameter added to `getSuggestions`
- ✅ `includeEmployees` added to request body

### 3. `src/components/AIPersonnelSuggestions.tsx`

- ✅ `includeEmployees: boolean` added to props interface
- ✅ `includeEmployees` destructured and passed to `getSuggestions`

### 4. `src/pages/AdminDashboard.tsx`

- ✅ `personnel={personnel}` → `personnel={filteredPersonnel}`
- ✅ `includeEmployees={includeEmployees}` prop added

### 5. `src/components/AddProjectDialog.tsx` (bonus fix)

- ✅ `getSuggestions` call updated to pass local `includeEmployees` state

### Risk
- Edge function deployed ✅
- 🔴 Anchor recommended per checklist Q2 (edge function prompt + model change)
