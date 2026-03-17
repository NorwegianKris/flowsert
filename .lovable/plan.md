

## Brand Auth Emails: "Crew Certify" → "FlowSert"

The email domain `notify.flowsert.com` is already verified. I will:

1. **Scaffold auth email templates** using the managed tooling — creates `auth-email-hook` edge function and 6 template files (signup, recovery, magic-link, invite, email-change, reauthentication)

2. **Apply FlowSert branding** to all templates:
   - App name: "FlowSert" everywhere
   - Primary button color: `hsl(243, 75%, 41%)` (the project's purple)
   - Foreground: `hsl(222, 47%, 11%)`
   - Muted text: `hsl(215, 20%, 65%)`
   - Border radius: `0.5rem`
   - Font: Inter with web-safe fallback
   - Logo: add FlowSert logo from `public/email-logo.jpg`
   - White email background per requirements
   - Professional tone matching the app's existing copy style

3. **Deploy** `auth-email-hook` edge function

After deployment, all auth emails (confirmation, password reset, magic link, etc.) will automatically send branded FlowSert emails from `notify.flowsert.com` instead of the default "Crew Certify" templates.

