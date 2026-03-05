

## Fix: Hybrid Role Extraction with AI Fallback

**RED change** — edge function edit. Anchor before publish.

### Problem

`extractConstraints` only matches a hardcoded keyword map. Queries like "run dive ops", "NDT guy", or "someone who can weld" return no role, so the 50-cap falls back to profile-completion sorting — losing all role prioritisation.

### Changes

**File:** `supabase/functions/suggest-project-personnel/index.ts`

#### 1. Add AI fallback function (after `extractConstraints`, ~line 152)

New async function `extractConstraintsWithAIFallback(prompt, apiKey)`:
- Calls `extractConstraints(prompt)` first (fast path)
- If `constraints.roles` is non-null, return immediately — no AI call
- If no role found, make a lightweight Gemini call to extract structured constraints:

```typescript
async function extractConstraintsWithAIFallback(
  prompt: string,
  apiKey: string
): Promise<{ country: string | null; roles: string[] | null; usedAI: boolean }> {
  const keywordResult = extractConstraints(prompt);
  if (keywordResult.roles && keywordResult.roles.length > 0) {
    return { ...keywordResult, usedAI: false };
  }

  // AI fallback — lightweight extraction call
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Extract structured search constraints from the user's personnel search query. Return ONLY valid JSON with these fields: role (string or null — the job title/role being searched for), location (string or null — country, city, or region), certificates (string[] or null — specific certifications mentioned). Be precise about role — 'run dive ops' means 'Dive Supervisor', 'NDT guy' means 'NDT Inspector', 'someone who can weld' means 'Welder'. Return null for fields not mentioned.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.warn(`[AI constraint extraction] gateway ${response.status}, falling back`);
      return { ...keywordResult, usedAI: false };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);

    const aiRoles = parsed.role ? [parsed.role] : null;
    const aiCountry = parsed.location || keywordResult.country;

    // Log the keyword miss for future keyword map expansion
    if (aiRoles) {
      console.log(`[keyword-miss] query="${prompt}" ai_role="${parsed.role}"`);
    }

    return {
      country: aiCountry,
      roles: aiRoles || keywordResult.roles,
      usedAI: true,
    };
  } catch (err) {
    console.warn("[AI constraint extraction] failed, using keyword result:", err);
    return { ...keywordResult, usedAI: false };
  }
}
```

#### 2. Replace `extractConstraints` call in serve handler (~line 387)

Change:
```typescript
const constraints = extractConstraints(prompt);
```

To:
```typescript
const constraints = await extractConstraintsWithAIFallback(prompt, LOVABLE_API_KEY);
```

The rest of the role-prioritised cap logic (lines 389-421) remains unchanged — it already uses `constraints.roles`.

#### 3. No other changes

- Location pre-filter, freelancer toggle, 50-cap logic, AI scoring prompt — all untouched
- The AI fallback is fail-open: if the gateway errors, it falls back to keyword-only (current behaviour)
- `max_tokens: 200` keeps the fallback call tiny and fast

### What this fixes

| Query | Before | After |
|-------|--------|-------|
| "find dive supervisors" | Keyword match works | Same (fast path) |
| "run dive ops" | No role → role-blind cap | AI extracts "Dive Supervisor" → role-prioritised cap |
| "NDT guy in Norway" | No role → random 50 | AI extracts "NDT Inspector" → role-prioritised cap |
| "someone who can weld" | No role → random 50 | AI extracts "Welder" → role-prioritised cap |

### Files changed
- `supabase/functions/suggest-project-personnel/index.ts` — add AI fallback function, wire it up

