

## Prompt Risk Assessment: 🟢 Anchor Optional
Pure UI fixes -- event propagation and URL formatting. No database, auth, or access control changes.

---

## Bug 1: "My Profile" dialog doesn't open inside project/personnel views

**Approach:** Refactor `AdminDashboard.tsx` to use the user's suggested pattern -- assign branch content to a variable, then render shared dialogs once outside all branches.

**File:** `src/pages/AdminDashboard.tsx`

- Refactor the three `if/return` branches (personnel detail at line 335, project detail at line 368, main dashboard at line 394) into a single return using a `content` variable
- Move `LinkProfileDialog` (and other shared dialogs like `ExternalSharingDialog`) outside the branch content so they always render
- Pattern:
  ```
  let content = <main dashboard JSX>;
  if (selectedPersonnel) content = <personnel detail JSX>;
  else if (selectedProject) content = <project detail JSX>;

  return (
    <>
      {content}
      <LinkProfileDialog ... />
    </>
  );
  ```
- This prevents this class of bug from recurring if more branches are added later

---

## Bug 2: Company website link navigates to wrong URL

**Approach:** Add robust protocol normalization in `CompanyCard.tsx` with the user's suggested guarded version.

**File:** `src/components/CompanyCard.tsx` (line 350-356)

- Normalize the URL before use:
  ```tsx
  const raw = (businessInfo.website ?? "").trim();
  const websiteUrl = raw === ""
    ? ""
    : /^https?:\/\//i.test(raw)
      ? raw
      : `https://${raw}`;
  ```
- Only render the link if `websiteUrl` is non-empty
- Keep `businessInfo.website` as the display text (show what the user entered)
- The existing `rel="noopener noreferrer"` is already present on line 353 -- no change needed there

---

## Summary

| File | Change |
|------|--------|
| `src/pages/AdminDashboard.tsx` | Refactor to single return with shared `LinkProfileDialog` outside branch content |
| `src/components/CompanyCard.tsx` | Add protocol normalization for website URL |

