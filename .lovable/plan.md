

## Fix: Dev Preview Blank Screen After Plugin Switch

### Root Cause
Two problems in `package.json`:
1. `@vitejs/plugin-react` was added to `dependencies` (line 44) instead of `devDependencies`
2. `@vitejs/plugin-react-swc` was **not removed** from `devDependencies` (line 75)

Having both plugins installed causes duplicate React resolution conflicts in the dev server, resulting in a blank screen. The production build works because it tree-shakes the unused plugin.

### Fix

**`package.json`**:
- Remove `@vitejs/plugin-react` from `dependencies` (line 44)
- Remove `@vitejs/plugin-react-swc` from `devDependencies` (line 75)
- Add `@vitejs/plugin-react: "5.2.0"` to `devDependencies`

No other files need changes — `vite.config.ts` already imports from `@vitejs/plugin-react` and has the `dedupe` config.

