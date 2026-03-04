

## Revert Container Backgrounds to Grey — Keep Content White

Cosmetic only. No schema changes. 🟢

**Design rule**: Grey (`bg-muted/*`) for structural wrappers, headers, and static containers. White (`bg-white dark:bg-card`) for content items (list cards, inputs, message bodies). The Notifications Log is the reference template — white cards on grey space.

### Reverts (containers back to grey)

| # | File | Element | Revert to |
|---|---|---|---|
| 1 | `IssuerMergingPane.tsx` | Left panel header | `bg-muted/30` |
| 2 | `IssuerMergingPane.tsx` | Expanded content | `bg-muted/20` |
| 3 | `IssuerMergingPane.tsx` | Right panel header | `bg-muted/30` |
| 4 | `IssuerMergingPane.tsx` | Merge summary | `bg-muted` |
| 5 | `IssuerMergingPane.tsx` | Create info box | `bg-muted` |
| 6 | `IssuerMergingPane.tsx` | Linked certs panel | `bg-muted/20` |
| 7 | `TypeMergingPane.tsx` | Left panel header | `bg-muted/30` |
| 8 | `TypeMergingPane.tsx` | Right panel header | `bg-muted/30` |
| 9 | `TypeMergingPane.tsx` | Category group header | `bg-muted/50` |
| 10 | `TypeMergingPane.tsx` | Merge summary | `bg-muted` |
| 11 | `TypeMergingPane.tsx` | Create info box | `bg-muted` |
| 12 | `WorkerGroupMergingPane.tsx` | Left panel header | `bg-muted/30` |
| 13 | `WorkerGroupMergingPane.tsx` | Right panel header | `bg-muted/30` |
| 14 | `LocationStandardizationTool.tsx` | Panel header | `bg-muted/50` |
| 15 | `LocationStandardizationTool.tsx` | Selected footer | `bg-muted/50` |
| 16 | `LocationStandardizationTool.tsx` | Tabs header | `bg-muted/50` |
| 17 | `LocationStandardizationTool.tsx` | Preview callout | `bg-muted/30` |
| 18 | `CertificateTypesManager.tsx` | Category group header | `bg-muted/50` |
| 19 | `CertificateLocationNormalizationTool.tsx` | Wrapper | `bg-muted/20` |
| 20 | `TaxonomySeedingTool.tsx` | Wrapper | `bg-muted/20` |
| 21 | `CertificateBackfillTool.tsx` | Progress panel | `bg-muted/30` |
| 22 | `BillingSection.tsx` | Canceled callout | `bg-muted/50` |
| 23 | `BillingSection.tsx` | Enterprise callout | `bg-muted/30` |
| 24 | `BillingSection.tsx` | Portal callout | `bg-muted/30` |
| 25 | `AIPersonnelSuggestions.tsx` | Wrapper | `bg-muted/30` |
| 26 | `RescanCertificatesTool.tsx` | Wrapper | `bg-muted/20` |
| 27 | `WorkerGroupsManageList.tsx` | Expanded members | `bg-muted/30` |
| 28 | `CertificateReviewQueue.tsx` | Table header | `bg-muted/50` |
| 29 | `CertificateReviewQueue.tsx` | Expanded row | `bg-muted/30` |
| 30 | `CertificateReviewQueue.tsx` | Selected list | `bg-muted` |
| 31 | `NotificationsLog.tsx` | Message panel bg | `bg-muted/30` |

### What stays white (no changes)
- All `<Input>` / search fields — `bg-white dark:bg-card`
- All list item cards — `bg-white dark:bg-card`
- All lavender hover patterns on interactive rows

31 container reverts across 14 files. Content items and inputs untouched.

