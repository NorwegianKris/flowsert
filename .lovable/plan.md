

## Fix: Replace SWC Plugin with Babel Plugin to Resolve Native Binding Error

### Root Cause
The `@vitejs/plugin-react-swc` plugin depends on `@swc/core`, which requires a platform-specific native binary. The build environment cannot load this binary, causing every build and publish attempt to fail with `Failed to load native binding`.

This is **not a code issue** — it's a binary compatibility problem between `@swc/core` and the build server's architecture.

### Fix
Switch from `@vitejs/plugin-react-swc` (requires native binary) to `@vitejs/plugin-react` (pure JS, uses Babel). This is a drop-in replacement with identical functionality — no other code changes needed.

### Changes

**`package.json`**
- Remove `@vitejs/plugin-react-swc` from devDependencies
- Add `@vitejs/plugin-react` to devDependencies

**`vite.config.ts`**
- Change import from `@vitejs/plugin-react-swc` to `@vitejs/plugin-react`

### Files modified
- `package.json`
- `vite.config.ts`

