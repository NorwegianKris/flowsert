
# Plan: Improve AI Personnel Search Accuracy

## Overview
The AI personnel search currently passes limited data to the AI model. To significantly improve accuracy, we need to:
1. Send more personnel data (nationality, department, bio, employment type)
2. Include certificate categories for better certificate matching
3. Add availability data for date-based queries
4. Enhance the system prompt with more matching guidance
5. Improve certificate name matching (fuzzy matching, abbreviations)

---

## Current Limitations Identified

1. **Missing Personnel Data**: The AI only receives `id`, `name`, `role`, `location`, `category`, `certificates`, and completion status. It's missing: `nationality`, `department`, `bio`, `gender`, and employment type context.

2. **No Availability Data**: When users ask "available next week", the AI cannot verify actual availability since the `availability` table data isn't included.

3. **Limited Certificate Context**: Only certificate names and expiry dates are sent. Missing: certificate categories, issuing authorities, which would help with "need someone with G4" type queries.

4. **Weak Certificate Matching**: The AI might miss matches due to abbreviations (e.g., "G4" vs "G4 Certificate" or "Class G4").

5. **No Fuzzy Matching Guidance**: The prompt doesn't instruct the AI on how to handle partial name matches or variations.

---

## Technical Implementation

### 1. Enhance PersonnelForAI Interface (useSuggestPersonnel.ts)

Add these fields to the data sent to AI:
- `nationality` - for region/country-based matching
- `department` - for organizational queries
- `bio` - for skill/experience matching from free text
- `employmentType` - distinguish fixed/freelancer/job_seeker
- `certificateCategories` - map certificate names to their categories

```typescript
interface PersonnelForAI {
  // ... existing fields ...
  nationality: string | null;
  department: string | null;
  bio: string | null;
  employmentType: 'fixed_employee' | 'freelancer' | 'job_seeker';
  availability?: { date: string; status: string }[];
}
```

### 2. Include Availability Data

Modify `AIPersonnelSuggestions.tsx` and `AddProjectDialog.tsx` to:
- Parse project date requirements from the AI prompt (if dates are mentioned)
- Fetch availability data for those dates
- Pass availability information to the AI

### 3. Improve Certificate Data

Include certificate category names alongside certificate names:
```typescript
certificates: p.certificates.map(c => ({
  name: c.name,
  category: c.category || null,  // Add category
  expiryDate: c.expiryDate,
  issuingAuthority: c.issuingAuthority || null  // Add issuer
}))
```

### 4. Enhanced System Prompt (suggest-project-personnel/index.ts)

Strengthen the system prompt with:
- **Fuzzy certificate matching**: "G4" should match "G4 Certificate", "Class G4", etc.
- **Bio analysis**: Extract skills and experience from bio text
- **Nationality matching**: Consider nationality for region-based queries
- **Availability awareness**: When dates are provided, check availability data
- **Employment type awareness**: Match "freelancer" or "contractor" queries
- **Negative matching**: Handle "NOT" or "except" in queries

```text
IMPORTANT - Certificate Matching Rules:
- Use fuzzy matching for certificate names (e.g., "G4" matches "G4 Certificate", "Class G4 Diver")
- Certificate abbreviations are common - match partial names
- Check certificate validity - only suggest personnel with valid (non-expired) required certificates

IMPORTANT - Bio/Skills Matching:
- The 'bio' field contains free-text about experience and skills
- Extract relevant keywords and match against requirements
- Consider years of experience mentioned in bio

IMPORTANT - Employment Type Matching:
- "freelancer", "contractor", "external" → employmentType = 'freelancer'
- "fixed", "employee", "internal", "permanent" → employmentType = 'fixed_employee'
- "candidate", "applicant" → employmentType = 'job_seeker'

IMPORTANT - Availability Matching:
- When dates are specified, check availability data if provided
- Personnel with 'unavailable' status on requested dates should be excluded or ranked lower
- No availability data means availability is unknown (don't exclude)

IMPORTANT - Strict vs Flexible Matching:
- "ONLY" or "MUST have" → strict requirement, exclude non-matches
- "preferably" or "ideally" → preference, rank higher but don't exclude
- Default to flexible matching unless strict keywords are used
```

### 5. Add Availability Fetching (Optional Enhancement)

When the AI prompt contains date references (e.g., "next week", "February 15-20"):
- Parse date ranges from the prompt
- Fetch availability data for those dates
- Include in the personnel data sent to AI

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useSuggestPersonnel.ts` | Add nationality, department, bio, employmentType to PersonnelForAI; enhance mapping |
| `supabase/functions/suggest-project-personnel/index.ts` | Update interface, enhance system prompt with matching rules |
| `src/components/AIPersonnelSuggestions.tsx` | No changes needed (already fetches document counts) |
| `src/components/AddProjectDialog.tsx` | Pass additional data when calling getSuggestions |

---

## Expected Accuracy Improvements

1. **Certificate queries**: "Need G4 divers" will match "Class G4 Commercial Diver Certificate"
2. **Nationality queries**: "Norwegian divers" will check nationality field
3. **Experience queries**: "5+ years experience" will analyze bio text
4. **Employment queries**: "freelancers only" will filter by employment type
5. **100% completion**: Already improved, will continue to work
6. **Skill queries**: Bio analysis enables "familiar with ROV operations" matching

---

## Risk Considerations

- **Token usage**: Sending more data increases AI token consumption (minor cost increase)
- **Bio length**: Very long bios should be truncated to avoid token limits
- **Availability data**: Large date ranges could add significant data; limit to 30 days max
