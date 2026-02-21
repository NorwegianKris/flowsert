

## Minor UI Text and Styling Fixes

**Risk: 🟢 GREEN** — Text and CSS-only changes. No backend, auth, or access control affected.

---

### 1. Capitalize "Freelancers" in Personnel View toggles

**File:** `src/components/FreelancerFilters.tsx`

- Line 69: `Include freelancers` → `Include Freelancers`
- Line 80: `Show freelancers only` → `Show Freelancers only`

### 2. Purple icon for Personnel View

**File:** `src/components/FreelancerFilters.tsx`

- Line 47: Change `<Users className="h-4 w-4" />` to `<Users className="h-4 w-4 text-primary" />` to match the AI Personnel Search sparkle icon color.

### 3. Update Smart Upload text

**File:** `src/components/certificate-upload/UploadZone.tsx`

Update lines 112-121 to:

```
Smart Upload

Upload your certificate(s) and we'll extract the details automatically

Select up to 10 files • PDF, JPEG, PNG, WebP • Drag & drop or click

💡 Make sure your upload(s) is a clear photo, scan, or document for best results.
```

---

### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/components/FreelancerFilters.tsx` | MODIFY | Capitalize "Freelancers", add `text-primary` to Users icon |
| `src/components/certificate-upload/UploadZone.tsx` | MODIFY | Update Smart Upload description text |

