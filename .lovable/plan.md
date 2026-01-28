
# Auto-Update Location from Address

## Overview
When a user fills in their address or postal address but leaves the location field empty, we'll automatically populate the location field with a derived value. This is a lightweight, client-side solution that doesn't require external APIs.

## How It Will Work

1. **Trigger**: When a user changes the `address` or `postalAddress` fields in the edit dialog
2. **Condition**: Only auto-fill if the `location` field is currently empty or set to "Not specified"
3. **Source Priority**:
   - First, try to use `postalAddress` (typically contains "City, Country" format)
   - If postal address is empty, fall back to extracting from `address` if it contains location info

## Implementation Steps

### 1. Add Auto-Fill Logic to EditPersonnelDialog
Add an `onChange` handler for the address and postal address fields that checks if location is empty and auto-populates it:

```typescript
// When postal address changes and location is empty
const handlePostalAddressChange = (value: string) => {
  setFormData(prev => ({
    ...prev,
    postalAddress: value,
    // Auto-fill location if empty
    location: (!prev.location || prev.location === 'Not specified') && value.trim() 
      ? value.trim() 
      : prev.location
  }));
};
```

### 2. Add Visual Feedback
Show a subtle toast or inline message when location is auto-filled, so users understand what happened and can correct it if needed.

### 3. Update Both Address Fields
Apply the same logic to both `postalAddress` (primary source - usually "City, Country") and if needed, extract city from `address` as a fallback.

## Technical Details

**Files to modify:**
- `src/components/EditPersonnelDialog.tsx` - Add auto-fill logic to address field handlers

**Behavior:**
- Location auto-fills only when it's empty or "Not specified"
- Users can still manually edit the location afterward
- Postal Address is preferred since it typically contains city/region info
- Shows a subtle notification when auto-fill occurs

## Alternative Considered
A geocoding API (like Google Maps or OpenStreetMap) was considered but rejected because:
- Adds external dependency and potential costs
- Requires API key management
- Overkill for this use case since postal address already contains location info
