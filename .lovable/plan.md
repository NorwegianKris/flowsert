

## Current Dynamic

1. **Certificate uploaded → OCR extracts a name** (e.g., "CSWIP 3.2U Diver Inspector") with a confidence score.
2. **Alias lookup**: checks if the extracted name matches a known alias in the business's `certificate_aliases` table. If yes → auto-selects the type, shows "AI suggested" badge.
3. **Fuzzy match**: if no alias, compares extracted name against all certificate types using string similarity. If a clear winner exists (score > 0.7, confidence ≥ 85) → auto-selects, shows "AI suggested" badge.
4. **No match found**: if fuzzy match fails or is ambiguous, the free-text input is activated and pre-filled with the AI-extracted name. The user sees a plain `<Input>` with the suggested name — **no visual indicator that this came from AI**.

## What Needs to Change

When the free-text input is pre-filled by AI suggestion (step 4), add a "Suggested" badge/tag in front of the input value so the user knows this name was extracted from the document, not typed manually.

### File: `src/components/CertificateTypeSelector.tsx`

In the free-text input section (lines 410-419), wrap the `<Input>` with a container that shows a `<Badge>` tag with "Suggested" (using Sparkles icon) when the free-text value was pre-filled by OCR. Track this with a new `freeTextFromOcr` state boolean, set to `true` when the OCR auto-fill path activates (lines 158-168), and reset to `false` when the user manually edits the input.

Changes:
1. Add `const [freeTextFromOcr, setFreeTextFromOcr] = useState(false);` state.
2. In the OCR fallback paths (lines 160-161 and 167-168), also call `setFreeTextFromOcr(true)`.
3. In the free-text input render (lines 412-419), add a "Suggested" badge inline before/beside the input when `freeTextFromOcr` is true.
4. When the user edits the input, set `freeTextFromOcr` to false (or keep it true as long as value matches the original OCR suggestion — simpler to just keep it true until user types).

