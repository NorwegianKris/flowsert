

## Redirect FAQ "Get Started" Button to Contact Page

**Risk: GREEN** -- purely UI text/navigation change.

### Change

**File: `src/pages/FAQ.tsx` (line 121)**

Update the "Get Started" button's `onClick` handler to navigate to `/contact` instead of `/auth`, matching the same pattern already used on the About page.

```
// Before
<Button onClick={() => navigate('/auth')}>Get Started</Button>

// After
<Button onClick={() => navigate('/contact')}>Get Started</Button>
```

Single one-word change in one file.

