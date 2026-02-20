

# AI Personnel Search: Remove Duplicate Toggle and Style Button

## Changes

### 1. Remove the "Include freelancers" toggle from the AI search panel
The freelancer inclusion toggle already exists in the main FreelancerFilters bar above the AI search. The duplicate toggle inside the AI search panel will be removed. Instead, the component will accept the current `includeFreelancers` value as a prop from the parent, so the AI search respects whatever the main toggle is set to.

### 2. Style the "Find Personnel" button in brand purple
Change the button from `variant="secondary"` (grey) to use the primary purple color (`bg-primary text-primary-foreground hover:bg-primary/90`), matching the brand color used in the main toggle bar.

## Technical Details

**File: `src/components/AIPersonnelSuggestions.tsx`**
- Add `includeFreelancers` as a prop (boolean) instead of managing it internally
- Remove the internal `includeFreelancers` state
- Remove the Switch/Label for "Include freelancers" from the UI (lines 159-168)
- Change the "Find Personnel" Button from `variant="secondary"` to `variant="default"` (which uses the primary purple)
- Clean up unused imports (`Switch`, `Label`)

**File: `src/pages/AdminDashboard.tsx`**
- Pass `includeFreelancers={includeFreelancers}` as a prop to `AIPersonnelSuggestions`
- Remove the `onIncludeFreelancersChange` prop (no longer needed)

