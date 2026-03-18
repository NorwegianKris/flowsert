

## Plan: Improve Extraction Prompts for issuingAuthority and placeOfIssue

Four targeted text replacements in `supabase/functions/extract-certificate-data/index.ts`. No logic, model, or schema structure changes.

### Changes

**1. System prompt rule 5** (line 202): Replace `Place of issue is typically a country or city` with the detailed inference-priority rule covering org address, training centre, clinic address, with city-preferred/country-fallback guidance.

**2. System prompt rule 6** (line 203): Replace `Issuing authority is the organization that issued the certificate (e.g., "DNV", "Falck Safety Services", "Red Cross")` with the multi-location search priority list (explicit fields, header/logo, stamps/seals, footer, "on behalf of" phrases) including Norwegian label variants.

**3. Tool schema `placeOfIssue` description** (line 279): Replace `"Country or location where certificate was issued"` with the new description about inference from org address, training centre, clinic — city preferred, country fallback, never holder's address.

**4. Tool schema `issuingAuthority` description** (line 284): Replace `"Organization that issued the certificate"` with the new description listing the check-order (explicit fields, header/logo, stamps, "on behalf of", footer) with Norwegian examples.

