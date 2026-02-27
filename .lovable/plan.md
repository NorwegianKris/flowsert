

## Plan: Expand extractCountry and replace system prompt

Single file: `supabase/functions/suggest-project-personnel/index.ts`

### Change 1 — Replace extractCountry (lines 257-274)

Replace the current function with the expanded version adding: Scotland, Wales, Husøy, Leirvik, Stord (Norway); Newcastle, Bristol, Leeds (UK); Seville, Bilbao (Spain); Wroclaw, Poznan (Poland); Turin, Genoa (Italy); Hrvatska, Rijeka, Dubrovnik (Croatia); Uppsala, Linköping (Sweden); plus new country blocks for Germany, Netherlands, Denmark, France, Greece, Portugal, Thailand, Philippines.

### Change 2 — Replace entire system prompt (lines 297-398)

Replace with the new prompt that:
- Reframes as "offshore and subsea project staffing"
- Adds geographic groupings (Scandinavia, Nordic, Europe)
- Adds HUET certificate matching
- Adds employment type synonyms (contractor, consultant, staff, permanent)
- Adds profile completion filtering rules (complete profiles = 3+ valid certs + bio)
- Changes ambiguous location scoring from 70% → 60%
- Adds Step 4 credential depth bonus (+5 for 3+ valid certs, +3 for non-empty bio, capped at 100)
- Adds Step 5 as the final summation step
- Updates matchReasons guidance to "2-4 specific reasons"

### Risk
- 🔴 Edge function prompt change → anchor required per checklist Q2

