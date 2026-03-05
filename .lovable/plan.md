

## Make RefreshCw Icon Always Visible & Compact

**File:** `src/components/CertificateTable.tsx`

1. Change RefreshCw icon classes from `opacity-0 group-hover:opacity-60 hover:!opacity-100` to `opacity-30 hover:opacity-100 transition-opacity cursor-pointer`
2. Reduce icon size from `h-3.5 w-3.5` (14px) to `h-3 w-3` (12px)
3. Change the flex container gap from `gap-1.5` to `gap-1`

Pure styling change — no logic affected.

