

## Make Settings Sections Collapsible

### Overview
Wrap three sections in the Admin Settings panel with collapsible containers so they can be expanded/collapsed, reducing visual clutter. Also rename "Activation Overview" to "Profile Activation Overview".

### Changes

**1. `src/pages/AdminDashboard.tsx`**
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from the existing UI component
- Import `ChevronDown` icon for the toggle indicator
- Wrap the following three sections in collapsible containers (defaulting to collapsed):
  - `LocationStandardizationTool` ("Standardize Locations")
  - `ActivationOverview` (renamed to "Profile Activation Overview")
  - `RegistrationLinkCard` ("Freelancer Registration Link")
- Each collapsible will have a styled trigger header with the section title, icon, and a chevron that rotates on open

**2. `src/components/ActivationOverview.tsx`**
- Rename the CardTitle text from "Activation Overview" to "Profile Activation Overview"

### Implementation Detail
Each collapsible section will follow this pattern:
```text
<Collapsible>
  <CollapsibleTrigger> Section Title + Chevron </CollapsibleTrigger>
  <CollapsibleContent>
    <OriginalComponent />
  </CollapsibleContent>
</Collapsible>
```

The trigger will be styled as a bordered, rounded header row with the section name and a rotating chevron icon, matching the existing card styling. The components themselves remain unchanged -- they are simply wrapped.

All three sections will start collapsed by default to keep the settings panel clean.
