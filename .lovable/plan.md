

## Fix: Remove dead `user.email` check causing ReferenceError

### Root Cause

Line 47 has a duplicate authorization check referencing `user.email`, but the variable `user` does not exist. The function was refactored to use `getClaims` which extracts `userEmail` from `data.claims.email` (line 39). The old `user.email` block on lines 47-52 was never removed.

This is not a cascade delete issue or a table name mismatch — the function crashes before it ever reaches the delete logic.

### Fix

Remove lines 47-52 (the dead `if (user.email !== "hello@flowsert.com")` block). The correct check on `userEmail` at lines 40-44 already handles authorization.

### File

`supabase/functions/delete-platform-business/index.ts` — delete lines 47-52, then redeploy.

