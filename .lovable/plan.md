

## Changes across 4 files

### 1. `supabase/functions/suggest-project-personnel/index.ts`

**Change 1a — Model + temperature** (line 292):
- `"google/gemini-3-flash-preview"` → `"google/gemini-2.5-flash"`
- Add `"temperature": 0,` after the model line

**Change 1b — Geographic Location Matching** (lines 225–232):
Replace the current 8-line section with the new strict matching rules covering exact country matching, broad region matching, and "Not specified" exclusion logic.

**Change 1c — includeEmployees in request body** (line 159):
- Add `includeEmployees` to the destructuring: `const { prompt, personnel, includeFreelancers, includeEmployees } = await req.json();`

**Change 1d — Filter logic** (lines 174–179):
- Change `return true;` to `return includeEmployees;` for non-freelancer personnel

**Change 1e — logUsage model** (line 406):
- Update model string to `"google/gemini-2.5-flash"` to match the new model

### 2. `src/hooks/useSuggestPersonnel.ts`

**Change 2a — getSuggestions signature** (lines 73–77):
- Add `includeEmployees: boolean` parameter after `includeFreelancers`

**Change 2b — Request body** (lines 126–130):
- Add `includeEmployees` to the body object

### 3. `src/components/AIPersonnelSuggestions.tsx`

**Change 3a — Props interface** (line 21):
- Add `includeEmployees: boolean;` before `includeFreelancers`

**Change 3b — Destructured props** (line 30):
- Add `includeEmployees,` before `includeFreelancers,`

**Change 3c — getSuggestions call** (line 66):
- Add `includeEmployees` parameter: `getSuggestions(aiPrompt, personnel, includeFreelancers, includeEmployees, documentCounts)`

### 4. `src/pages/AdminDashboard.tsx`

**Change 4a — AIPersonnelSuggestions props** (lines 610–617):
- Change `personnel={personnel}` to `personnel={filteredPersonnel}`
- Add `includeEmployees={includeEmployees}` prop

### Risk
- Edge function change (prompt + model + filter logic) → 🔴 anchor per checklist Q2
- Requires redeployment of `suggest-project-personnel`

