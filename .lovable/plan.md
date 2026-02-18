

## Step 5 -- Enable Leaked Password Protection

### What Changes

Enable the built-in breached password detection in the authentication settings. This prevents new signups and password changes from using known compromised passwords.

### Implementation

Use the authentication configuration tool to:
- Enable **Leaked Password Protection** (HIBP check)
- Set minimum password length to **10 characters**

### What It Does NOT Do

- Does not invalidate existing passwords
- Does not log out any users
- Does not require database migrations or code changes
- Only applies to new signups and future password changes

### Risk

Zero. Purely additive security hardening with no impact on current users.

