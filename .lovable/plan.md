

## Collapse Certificate Status List by Default in Project View

Cosmetic only. No schema or backend changes. 🟢

### Change

**`src/components/ProjectCertificateStatus.tsx`** (line 207)
- Remove `defaultOpen` from `<Collapsible defaultOpen>` so it renders collapsed by default.

```tsx
// Before
<Collapsible defaultOpen>

// After
<Collapsible>
```

