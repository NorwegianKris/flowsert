

## Add OpenStreetMap Autocomplete to Project Location Fields

### What Changes

Replace the plain `<Input>` for the "Location" field in both **Add Project** and **Edit Project** dialogs with the existing `<GeoLocationInput>` component -- the same OpenStreetMap-powered autocomplete used for personnel profiles.

### Changes

**1. `src/components/AddProjectDialog.tsx`**
- Add import: `import { GeoLocationInput } from '@/components/ui/geo-location-input';`
- Replace the `<Input>` at lines 670-675 with:
  ```tsx
  <GeoLocationInput
    id="location"
    value={location}
    onChange={setLocation}
    placeholder="e.g., North Sea Platform A"
  />
  ```

**2. `src/components/EditProjectDialog.tsx`**
- Add import: `import { GeoLocationInput } from '@/components/ui/geo-location-input';`
- Replace the `<Input>` at lines 274-279 with:
  ```tsx
  <GeoLocationInput
    id="location"
    value={location}
    onChange={setLocation}
    placeholder="e.g., North Sea Platform A"
  />
  ```

### Result
Both project dialogs will show city/location suggestions from OpenStreetMap as the user types, matching the personnel profile experience. Users can still type free-text if they prefer (e.g., "North Sea Platform A") since the input remains editable.
