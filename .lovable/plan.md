

## Fix Invitation URL Domain

**Problem:** `create-platform-business` generates invitation links pointing to `flowsert.lovable.app` instead of the production domain.

**Change:** In `supabase/functions/create-platform-business/index.ts`, update line ~133:

```
// From:
const invitationUrl = `https://flowsert.lovable.app/invite?token=${inviteToken}`;

// To:
const invitationUrl = `https://flowsert.com/invite?token=${inviteToken}`;
```

Single line change, then redeploy the function.

