

## Reset Personnel Toggle on Stat Card Click

### Change in `src/pages/AdminDashboard.tsx` (line 610-613)

Add `setPersonnelTabFilter('all')` inside the `onStatClick` handler, before setting the compliance filter:

```tsx
onStatClick={(status) => {
  setPersonnelTabFilter('all');
  setActiveTab('personnel');
  setComplianceStatusFilter(status === 'valid' ? 'valid' : status === 'expiring' ? 'expiring' : 'expired');
}}
```

One line added, one file changed. Pure UI — no anchor needed.

