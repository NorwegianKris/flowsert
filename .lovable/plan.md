

# Plan: Update Categories Section Description Text

## Summary

Update the explanatory text in the Settings > Categories section to clearly explain the two-level organizational structure: **Categories** (broader groupings) and **Types** (specific sub-categories within).

## Current Text (Line 18-20)

```
Manage the categories used throughout your organization for workers, certificates, and documents.
```

## Proposed New Text

```
Manage the categories and types used throughout your organization for workers, certificates, and documents. Categories define broad groupings, while types provide specific classifications within each category.
```

This wording:
- Mentions both "categories" and "types" upfront
- Clearly explains the hierarchy relationship
- Keeps the sentence concise and professional
- Avoids jargon like "two-layered" or "sub-category"

## File to Modify

| File | Change |
|------|--------|
| `src/components/CategoriesSection.tsx` | Update CardDescription text on lines 18-20 |

## Code Change

```tsx
<CardDescription>
  Manage the categories and types used throughout your organization for workers, certificates, and documents. Categories define broad groupings, while types provide specific classifications within each category.
</CardDescription>
```

