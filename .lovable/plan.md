
# Remove Generic Sign Up Access

## Summary
Remove all generic "Sign Up" entry points since registration is invitation-only. Freelancers register through dedicated invitation links.

## Changes

### 1. Auth page (`src/pages/Auth.tsx`)
- **Lines 903-912**: Replace the "Don't have an account? Sign up" link with a static message: "Registration is by invitation only. Need access? [Contact us](/contact)."

### 2. Public header (`src/components/PublicHeader.tsx`)
- **Lines 68-76**: Remove the conditional that shows "Sign Up" on non-auth pages. Always show "Get in Touch" linking to `/contact`, regardless of current page.
- Remove the `handleSignUp` function (lines 26-32) and the `openAuthDialog` prop since it's no longer needed for signup.

## What Does NOT Change
- Token-based freelancer/job seeker registration flows continue to work
- Admin invitation flows are unaffected
- The sign-in form remains fully functional
- The signup form code itself stays (it's used by invitation links with tokens)
