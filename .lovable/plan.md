

## Plan: Update issuingAuthority Tool Schema Description

**Single change** in `supabase/functions/extract-certificate-data/index.ts`, line 293.

Replace the current `description` value on line 293 with the user-provided text that adds explicit search instructions including "(a)…(e)" priority list and "You MUST actively search the entire document" directive.

**Current (line 293):**
```
"The organization with authority over this certificate. Check in order: explicit 'issued by'/'godkjent av'/'utstedt av' fields, document header/logo organization, stamps or seals, 'issued on behalf of' phrases, footer text. Return organization name only — never a person's name. Examples: 'Helsedirektoratet', 'Havtil', 'DNV', 'Arbeidstilsynet', 'Falck Safety Services', 'OPITO', 'IMCA'."
```

**New:**
```
"The organization with authority over this certificate. You MUST actively search the entire document for this — do not skip it. Check in this order: (a) any field labeled 'issued by', 'issuing authority', 'issued on behalf of', 'godkjent av', 'utstedt av'; (b) the organization name in the document header or logo (e.g. 'Helsedirektoratet', 'Arbeidstilsynet', 'Havtil', 'DNV', 'OPITO', 'IMCA'); (c) any stamp or seal with an organization name; (d) footer organization text; (e) phrases like 'Issued on behalf of: [org]'. Return the organization name only, never a person's name. Examples: 'Helsedirektoratet', 'Havtil', 'Arbeidstilsynet', 'DNV GL', 'Falck Safety Services', 'OPITO'."
```

One line replacement. Nothing else touched.

