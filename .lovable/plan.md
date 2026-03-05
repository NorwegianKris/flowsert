

## Anchor: Hybrid Role Extraction with AI Fallback — VERIFIED

All items confirmed against the deployed code.

### Fast path — keyword extraction (lines 100-151)
- `extractConstraints` runs first with hardcoded `roleKeywords` map
- Entries sorted by descending key length (line 144): `"dive supervisor"` checked before `"diver"`
- Returns immediately when keyword match found — no AI call

### AI fallback (lines 154-212)
- `extractConstraintsWithAIFallback` calls `extractConstraints` first (line 158)
- Returns early if roles found (lines 159-161) — **no AI call on keyword hit**
- Gemini call uses `temperature: 0` (line 181), `max_tokens: 200` (line 182), model `google/gemini-2.5-flash` (line 172)
- System prompt requests structured JSON with fields: role, location, certificates (line 176)
- Response parsed with defensive `try/catch` wrapping `JSON.parse` (lines 190-193 inside outer try, line 208 catch)
- On gateway error (`!response.ok`), returns keyword result gracefully (lines 185-188)
- On parse/network failure, returns keyword result gracefully (lines 208-211)
- `[keyword-miss]` logged with query and extracted role (line 200) — non-blocking `console.log`

### Role-prioritised 50-cap (lines 446-481)
- `constraints` sourced from `extractConstraintsWithAIFallback` (line 447)
- Group A / Group B split on `constraints.roles` (lines 454-464)
- Case-insensitive matching via `.toLowerCase()` (lines 456, 458)
- Partial title matching via `.includes()` — "Senior Dive Supervisor" matches "dive supervisor" (line 459)
- If ≤50 candidates total, no capping applied (line 452)
- If no roles extracted (from either path), falls back to profile-completion sort (lines 477-481)

### Unchanged (confirmed)
- Location pre-filter runs before cap (lines 432-444)
- Freelancer/employee toggle runs before cap (lines 437-440)
- Main scoring prompt with 100%/60%/20%/0% role tiers (confirmed in system prompt block starting line 537)
- Frontend threshold: ≥40% display, suppress below 50% on strong match (lines 154, 156-158 in `useSuggestPersonnel.ts`)
- Auth, rate limiting, allowance checks all unchanged (lines 220-314)
- Response schema unchanged

### Test case expectations
| Query | Path | Result |
|---|---|---|
| "find dive supervisors" | Keyword match → no AI call | All Dive Supervisors in Group A |
| "run dive ops" | Keyword miss → AI extracts "Dive Supervisor" | All Dive Supervisors in Group A |
| "NDT guy in Norway" | Keyword miss → AI extracts role + location | Role-prioritised + location-filtered |
| Gibberish | Keyword miss → AI returns nulls | Falls back to profile-completion sort, no crash |

**Status: All 23 checklist items pass. Safe to publish.**

