

# Style the Billing Section Toggle and Tier Cards to Match System Design

## What needs to change

Two visual issues in the "Payment & Billing" section:

1. **Monthly/Annual toggle** — currently uses default `ToggleGroup` styling (white-on-primary-foreground). It should use the system's primary purple (`#4338CA`) for the selected state with white text, matching the design language.

2. **Subscription tier cards** — currently plain `variant="outline"` buttons with no hover lift effect. They should get the standardized card hover interaction (subtle lift, shadow, Lavender border ring) consistent with the rest of the system.

## Changes

### File: `src/components/ui/toggle.tsx`

Update the `data-[state=on]` classes in `toggleVariants` from:
```
data-[state=on]:bg-primary-foreground data-[state=on]:text-primary
```
to:
```
data-[state=on]:bg-primary data-[state=on]:text-primary-foreground
```

This makes the selected toggle item show as purple background with white text (matching the system's primary color), instead of white background with purple text.

### File: `src/components/BillingSection.tsx`

Update the tier `Button` elements (lines 231-249) to add the standardized hover effect:
- Add `transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD]` classes to each tier card button.
- This matches the card-interaction-standardization pattern used on Project cards, Personnel cards, and Expiry Timeline boxes.

## Scope

- Purely UI/styling (Q5: green, anchor optional)
- No database, RLS, auth, or edge function changes
- The toggle variant change is global but intentional — it aligns the component with the system's primary color convention

