

# Sanity Check: Complete — No Stale References

All uses of `TIERS`, `getCurrentTierIndex`, and `currentTierIndex` exist only in `src/components/ActivationOverview.tsx`:

| What | Lines | Type |
|------|-------|------|
| `TIERS` constant | 43-48 | Definition |
| `getCurrentTierIndex` | 50-55 | Definition |
| `currentTierIndex` | 105 | Computed value |
| `TIERS.map` + `currentTierIndex` | 310-341 | JSX pricing grid |

No other file in the project references any of these. Deleting all four blocks is a clean removal with zero risk of compile errors.

The plan is fully validated and ready to implement as specified in the previous iterations. No design changes needed.

