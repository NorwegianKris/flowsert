

## Fix: SWC Native Binding Build Error

The build fails because `@vitejs/plugin-react-swc` requires `@swc/core` native binaries, which have become corrupted in the dev server environment. The feature you requested (expandable type rows with certificate lists) is already present in the code.

### Solution
Switch from `@vitejs/plugin-react-swc` to `@vitejs/plugin-react` (Babel-based), which doesn't depend on native bindings and is more resilient in sandboxed environments.

### Changes

**`package.json`**: Replace `@vitejs/plugin-react-swc` with `@vitejs/plugin-react` in devDependencies.

**`vite.config.ts`**: Change the import from `@vitejs/plugin-react-swc` to `@vitejs/plugin-react`.

### Files modified
- `package.json`
- `vite.config.ts`

