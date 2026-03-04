

## Fix: OCR Must Extract Verbatim Document Title, Never Translate

**RED change** — edge function edit. Anchor before publish.

### Change 1: Edge function prompt
**File:** `supabase/functions/extract-certificate-data/index.ts` (lines 201–204)

Replace rules 4–7:

```
4. certificateName MUST be the verbatim title copied character-for-character from the document in its original language. NEVER translate, NEVER paraphrase, NEVER convert to English. If the document says "Helseerklæring /udyktighetserklæring for arbeidsdykking", that exact string must be returned as certificateName.
5. Place of issue is typically a country or city
6. Issuing authority is the organization that issued the certificate (e.g., "DNV", "Falck Safety Services", "Red Cross")
7. IMPORTANT: Also classify the certificate into its canonical industry-standard type name in English via the suggestedTypeName field. This is a SEPARATE field from certificateName and may differ from it — that is expected and correct. Use ALL available signals: document title, issuing authority, logos, expiry period, qualification level, and any other context clues. Examples: "BOSIET with CA-EBS", "CSWIP 3.2U Diver Inspector", "Offshore Diving Medical (DMAC 11)". Return null if genuinely uncertain.
```

### Change 2: Frontend display priority
**File:** `src/components/AddCertificateDialog.tsx` (line 218)

```typescript
// Before:
ocrExtractedName: extractedData.suggestedTypeName || extractedData.certificateName || '',

// After:
ocrExtractedName: extractedData.certificateName || extractedData.suggestedTypeName || '',
```

### Downstream effect (confirmed acceptable)
- Fuzzy matching receives original-language titles → lower scores against English types → more certs route to triage
- Alias flywheel strengthens: admin sees real title, assigns type, alias auto-created for future matches
- `suggestedTypeName` still exists in response for internal matching — never displayed to user

