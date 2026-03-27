

## Plan: Add FlowSert One Pager PDF as a public asset

### Steps

1. **Copy the uploaded PDF** to `public/onepager.pdf` so Vite serves it at the root path.

2. **Add a redirect rule** in `public/_redirects` — not needed since files in `public/` are served directly by Vite/the CDN at their exact filename. The file will be accessible at `flowsert.com/onepager.pdf` automatically.

### Summary
One file copy operation. No code changes needed. The PDF will be available at `https://flowsert.com/onepager.pdf` (and `https://flowsert.lovable.app/onepager.pdf`).

