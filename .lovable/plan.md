

## Plan: Add temperature, message cap, and intent-based context trimming to certificate-chat

Single file: `supabase/functions/certificate-chat/index.ts`

### Change 1 — Add `detectIntent` function before `serve()` (before line 335)

New function that pattern-matches the last user message to return one of `'certificates' | 'projects' | 'availability' | 'general'`.

### Change 2 — Add `intent` parameter to `generateAdminContext` (line 175-283)

- Add optional `intent` parameter to function signature
- Replace the final return (line 280-283) with intent-based conditional returns that only include relevant sections

### Change 3 — Detect intent and pass to `generateAdminContext` (line 467-471)

```ts
const intent = detectIntent(messages);
contextData = generateAdminContext(..., intent);
```

### Change 4 — Trim messages and add temperature (lines 562-577)

- Add `const trimmedMessages = messages.slice(-10);` before the fetch
- Add `temperature: 0,` after the model line
- Replace `...messages` with `...trimmedMessages`

### Risk
- 🔴 Edge function logic + prompt change → anchor required per checklist Q2

