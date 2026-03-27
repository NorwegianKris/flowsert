

## Plan: Add .env to .gitignore

### Findings

1. **`.env` is NOT in `.gitignore`** — this is a risk. The `.env` file contains the Supabase URL, project ID, and anon key. While these are auto-generated and the anon key is a publishable key (not a secret), best practice is to keep `.env` out of version control.

2. **No hardcoded keys in client-side code** — all references use `import.meta.env.VITE_SUPABASE_*` correctly.

3. **Edge functions reference the project ref in logo URLs** — this is expected server-side behavior (these run on the backend, not exposed to the client repo). No action needed.

### Change

**`.gitignore`** — append `.env` and `.env.*` entries:

```
.env
.env.*
```

This is a single-line addition to an existing file. No other changes needed.

Risk level: Green — purely a config/hygiene change.

