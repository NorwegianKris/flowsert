

## Single-Line Full Labels on Stat Cards

### Changes in `src/components/DashboardStats.tsx`

Update the label strings to full descriptive text on one line:

- `'All Valid'` → `'All Valid Profiles'`
- `'Expiring Soon'` → `'Profiles Expiring Soon'`
- `'Expired'` → `'Profiles Expired'`
- `'To Review'` → `'Certificates to Review'`

Keep `whitespace-nowrap` so they stay on one line. No other changes.

### One file changed
`src/components/DashboardStats.tsx`

