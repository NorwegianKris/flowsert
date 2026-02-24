

## Fix: Terms/Privacy Links on Consent Page Open in New Tab

**Risk: GREEN** -- Pure UI fix, no database or auth changes.

---

### Problem

On the `/consent` page, clicking "Terms of Service" or "Privacy Policy" navigates the user away to `/terms` or `/privacy`. There is no back button or navigation affordance to return to `/consent`, so the worker gets stuck on the legal page.

The same issue exists in the signup form on `Auth.tsx`, where the consent checkbox also uses in-page `<Link>` elements.

---

### Fix

Change the `<Link>` elements to `<a>` tags with `target="_blank"` and `rel="noopener noreferrer"` so they open in a new browser tab. The consent form remains visible in the original tab.

**Files to modify:**

| File | Change |
|------|--------|
| `src/pages/Consent.tsx` (lines 109, 113) | Replace `<Link to="/terms">` and `<Link to="/privacy">` with `<a href="/terms" target="_blank" rel="noopener noreferrer">` |
| `src/pages/Auth.tsx` | Same change for the Terms/Privacy links in the signup consent checkbox |

No other files are affected. No database, RLS, or auth changes.

