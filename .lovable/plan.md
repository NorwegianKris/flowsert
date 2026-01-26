
# AI-Powered Personnel Suggestions for New Project Dialog

## Overview
Add an intelligent personnel suggestion feature to the "New Project" dialog. Admins can describe their project requirements in a free-form prompt (e.g., "project in Norway, personnel needs driving license, must be available in March"), and the AI will analyze the personnel pool to suggest matching candidates with the ability to toggle job seekers visibility.

---

## User Experience

### Dialog Layout Changes
- **Wider dialog**: Expand from `max-w-lg` to `max-w-3xl` for a two-column layout
- **Left column**: Free-form AI prompt area at top, followed by project details fields
- **Right column**: Personnel selection with AI-suggested matches highlighted at top

### Interaction Flow
1. Admin opens "New Project" dialog
2. Types requirements in free-form prompt field (e.g., "Need 3 divers for offshore work in Stavanger, must have valid G4 certificate and be available 15-20 February")
3. Clicks "Get Suggestions" button
4. AI analyzes the prompt and returns:
   - Suggested project field values (location, work category, dates)
   - Ranked personnel suggestions with match reasons
5. Admin can:
   - Accept auto-filled fields or modify them
   - Select suggested personnel or choose manually
   - Toggle "Include Job Seekers" to expand the search pool

---

## Technical Implementation

### 1. New Edge Function: `suggest-project-personnel`

Creates a new edge function that:
- Receives the admin's free-form prompt and personnel data
- Uses Lovable AI (gemini-2.5-flash) with structured output via tool calling
- Returns suggested field values and ranked personnel matches

```text
supabase/functions/suggest-project-personnel/index.ts
```

**Input:**
- `prompt`: The admin's free-form requirements
- `personnel`: Array of personnel with their attributes (location, certificates, availability)
- `includeJobSeekers`: Boolean to include/exclude job seekers

**Output (structured via tool calling):**
```json
{
  "suggestedFields": {
    "location": "Stavanger, Norway",
    "workCategory": "Offshore Diving",
    "startDate": "2025-02-15",
    "endDate": "2025-02-20"
  },
  "suggestedPersonnel": [
    {
      "id": "personnel-uuid",
      "matchScore": 95,
      "matchReasons": ["Valid G4 certificate", "Located in Norway", "Available on dates"]
    }
  ]
}
```

### 2. Frontend Component Updates

**AddProjectDialog.tsx modifications:**
- Add state for AI prompt and suggestions
- Add "Include Job Seekers" toggle switch
- Implement two-column responsive layout
- Add "Get Suggestions" button with loading state
- Display suggested personnel at top of list with match indicators
- Auto-fill form fields from AI suggestions (with edit capability)

**New UI Elements:**
- Free-form textarea with placeholder guidance
- "Get Suggestions" button with sparkle/wand icon
- Match score badges (e.g., "95% match")
- Match reason tooltips
- Job seekers toggle switch

### 3. Config Updates

**supabase/config.toml:**
- Add configuration for new `suggest-project-personnel` function

---

## Data Flow Diagram

```text
+------------------+     +-------------------------+     +------------------+
|  Admin enters    | --> | Frontend collects       | --> | Edge Function    |
|  free-form       |     | - prompt                |     | - Formats data   |
|  requirements    |     | - personnel data        |     | - Calls Lovable  |
+------------------+     | - job seeker toggle     |     |   AI Gateway     |
                         +-------------------------+     +------------------+
                                                                  |
                         +-------------------------+              v
                         | Frontend displays       | <-- | AI returns       |
                         | - Auto-filled fields    |     | structured       |
                         | - Ranked suggestions    |     | suggestions      |
                         | - Match indicators      |     +------------------+
                         +-------------------------+
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/suggest-project-personnel/index.ts` | Create | New edge function for AI-powered suggestions |
| `supabase/config.toml` | Modify | Add function configuration |
| `src/components/AddProjectDialog.tsx` | Modify | Expand dialog, add AI prompt section, two-column layout |
| `src/hooks/useSuggestPersonnel.ts` | Create | Custom hook to call the edge function |

---

## AI Prompt Engineering

The edge function will use a system prompt that instructs the AI to:
1. Parse the admin's natural language requirements
2. Extract structured project details (location, dates, work type)
3. Match personnel based on:
   - **Location proximity**: Personnel location matches project location
   - **Certificate requirements**: Personnel has required/mentioned certificates
   - **Availability**: Personnel is available during project dates (if specified)
   - **Role/skills**: Personnel role matches work category
   - **Category**: Fixed employees vs freelancers vs job seekers
4. Rank matches with scores and clear reasons

---

## Edge Cases Handled

- **Empty prompt**: Show all personnel without ranking
- **No matches found**: Display message and show all available personnel
- **Partial matches**: Show best matches with lower scores
- **Rate limiting (429)**: Display toast with retry message
- **Credit exhaustion (402)**: Display toast with upgrade prompt
- **Network errors**: Graceful fallback to manual selection

---

## Security Considerations

- Edge function validates authentication
- Personnel data filtered by business_id before sending to AI
- No sensitive fields (national ID, salary info) sent to AI
- Rate limiting handled at gateway level
