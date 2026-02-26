

## Plan: Clear country/city on manual location input

### Single change in `src/components/EditPersonnelDialog.tsx`

**Line ~308** — Update the `onChange` handler on `GeoLocationInput`:

From:
```tsx
onChange={(value) => setFormData({ ...formData, location: value })}
```

To:
```tsx
onChange={(value) => setFormData(prev => ({ 
  ...prev, 
  location: value,
  country: '',
  city: ''
}))}
```

No other files changed. The `onStructuredSelect` handler remains untouched.

### Risk
- 🟢 Pure UI logic change — no backend, no auth, no RLS

