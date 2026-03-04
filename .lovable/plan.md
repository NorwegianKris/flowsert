

## Remove ComplianceSnapshot from Overview Tab

Cosmetic only. No schema changes. 🟢

### Changes in `src/pages/AdminDashboard.tsx` (lines 724-742)

Remove `ComplianceSnapshot` and its wrapper. Place `FreelancerFilters` on its own row above the Compliance Plan bar:

```tsx
<TabsContent value="overview" className="mt-6 space-y-6">
  <div className="flex justify-end">
    <FreelancerFilters
      personnelFilter={overviewFilter}
      onPersonnelFilterChange={setOverviewFilter}
      personnel={personnel}
      customPersonnelIds={customFilterPersonnelIds}
      customRoles={customFilterRoles}
      customWorkerGroupIds={customFilterWorkerGroupIds}
      onCustomFilterChange={...}
    />
  </div>
  <CompliancePlanGenerator ... />
  <ExpiryTimeline ... />
  ...
</TabsContent>
```

The `ComplianceSnapshot` import can be removed from the file.

**Overview tab flow**: Toggle (right-aligned) → Compliance Plan → Expiry Timeline → Recent Registrations.

| File | Change |
|---|---|
| `AdminDashboard.tsx` | Remove ComplianceSnapshot usage; toggle gets own right-aligned row |

