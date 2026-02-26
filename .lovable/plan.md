

# SPA Fallback Routing Fix

## Problem
Deep links like `app.flowsert.com/invite?token=abc` return 404 because the hosting server doesn't know to serve `index.html` for all routes. Lovable's hosting platform uses a static file server that needs a `_redirects` file to enable SPA fallback.

## Fix
Create `public/_redirects` with a single catch-all rewrite rule. This is the standard approach for Lovable-hosted projects (same mechanism as Netlify-style hosting).

### File: `public/_redirects` (new)
```
/*    /index.html   200
```

This tells the server: for any path that doesn't match a static file, serve `index.html` with a 200 status (not a redirect), letting React Router handle the route client-side.

## Risk: GREEN
Pure static hosting config. No auth, no DB, no code changes.

## Acceptance
- `app.flowsert.com/invite?token=abc` loads InviteAccept page (shows "Invalid Invitation" for bad token — correct)
- `app.flowsert.com/admin`, `app.flowsert.com/worker`, etc. all load correctly
- `app.flowsert.com/` continues to work as before

