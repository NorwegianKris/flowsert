

## Fix Invisible Email Button in Auth Templates

**Root cause:** The `Button` component from `@react-email/components` uses `hsl(243, 75%, 41%)` for `backgroundColor`. Many email clients (Gmail, Outlook, Yahoo) do not support `hsl()` CSS color values — they strip or ignore the property entirely, leaving the button with no background and white text on white, making it invisible.

**Fix:** Replace `hsl(243, 75%, 41%)` with its hex equivalent `#3219a8` in the `button` style object across all 4 templates that have buttons:

- `supabase/functions/_shared/email-templates/signup.tsx` (line 80)
- `supabase/functions/_shared/email-templates/recovery.tsx` (line 65)
- `supabase/functions/_shared/email-templates/invite.tsx` (line 73)
- `supabase/functions/_shared/email-templates/magic-link.tsx` (check for same issue)

Each file has a single line change:
```
// Before
backgroundColor: 'hsl(243, 75%, 41%)'

// After
backgroundColor: '#3219a8'
```

After updating all templates, redeploy the `auth-email-hook` edge function so the changes take effect.

