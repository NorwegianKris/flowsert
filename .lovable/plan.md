

## Plan: Pin @supabase/supabase-js to 2.39.3

### Problem
The `^2.90.1` semver range resolved to a version with breaking changes in the `SupabaseAuthClient` type surface — `getSession`, `signOut`, `onAuthStateChange`, `User`, `Session` exports are all missing, causing 30+ build errors across the project.

### Change

**File: `package.json`** (line 42)

Replace:
```json
"@supabase/supabase-js": "^2.90.1",
```

With:
```json
"@supabase/supabase-js": "2.39.3",
```

No caret — exact pin. This is a known stable v2 release with the full auth API surface. No other dependency changes.

