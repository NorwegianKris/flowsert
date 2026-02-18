

## Fix: Certificate Count Discrepancy in AI Chatbot

### Root Cause

The discrepancy is NOT a data bug. The database has exactly 405 certificates, zero orphans, all correctly linked to personnel in one business. The UI components (`ComplianceSnapshot`, `PersonnelCard`) all count from the same data source and are consistent.

The issue is in the **AI chatbot edge function** (`certificate-chat/index.ts`). The `SUMMARY STATISTICS` section (line 272-277) includes "Certificates Expiring Soon" and "Expired Certificates" but does NOT include a **Total Certificates** count. The AI has to compute this itself by reading the detailed `PERSONNEL OVERVIEW` section. When the AI's text response is long (79 personnel with certificates), it can get truncated by output token limits, causing a manual count from the truncated output to fall short.

### Fix (single file change)

**File:** `supabase/functions/certificate-chat/index.ts` (lines 272-277)

Add a "Total Certificates" line to the `SUMMARY STATISTICS` section so the AI never needs to compute it from the detailed list:

```text
=== SUMMARY STATISTICS ===
Total Personnel: ${allPersonnel.length}
Total Certificates: ${allPersonnel.reduce((acc, p) => acc + p.certificates.length, 0)}
Total Projects: ${allProjects.length} (${activeProjects.length} active, ...)
Certificates Expiring Soon: ...
Expired Certificates: ...
```

This is a one-line addition. The AI will read the pre-computed total directly instead of attempting to sum from a potentially truncated personnel list.

### Verification

After deploying, ask the chatbot "How many total certificates do we have?" and confirm it answers 405 (matching the database).

### No other changes needed

- The UI dashboard (`ComplianceSnapshot`) correctly shows the total by iterating `personnel.certificates` from the `usePersonnel` hook
- The `usePersonnel` hook fetches certificates in parallel (not nested) and is under the 1000-row default limit (405 certificates, 151 personnel)
- No orphaned certificates exist in the database
