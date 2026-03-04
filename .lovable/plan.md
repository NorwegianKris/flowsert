

## White Backgrounds + Lavender Hover Across ALL Settings Components

Cosmetic only. No schema changes. 🟢

The screenshots show several components within the Settings panel that still use default input backgrounds and flat `hover:bg-muted/50` on list rows. The fix applies two patterns universally:

**Pattern A — List items/rows:** `bg-white dark:bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all rounded-lg`

**Pattern B — Input/Textarea fields:** Add `bg-white dark:bg-card` class

### Files and Changes

| # | File | What to change |
|---|---|---|
| 1 | `WorkerCategoriesManager.tsx` (line 163) | List items: replace `hover:bg-muted/50` with Pattern A |
| 2 | `AdminOverview.tsx` (line 324) | Admin cards: replace `hover:bg-muted/50` with Pattern A |
| 3 | `CompanyCard.tsx` (lines 468-548) | All `<Input>` and `<Textarea>` in the admin edit form: add `bg-white dark:bg-card` className |
| 4 | `CompanyCard.tsx` (line 396) | Document list items: add Pattern A |
| 5 | `AdminDashboard.tsx` (lines 807-994) | All `CollapsibleTrigger` section headers in Settings: replace `hover:bg-muted/50` with `hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all` (they already have `bg-card`) |
| 6 | `RegistrationLinkCard.tsx` | Any `<Input>` fields: add `bg-white dark:bg-card` |
| 7 | `DataAcknowledgementsManager.tsx` | Search `<Input>`: add `bg-white dark:bg-card` |
| 8 | `ActivationOverview.tsx` | Search `<Input>` and personnel list items: add `bg-white dark:bg-card` / Pattern A |
| 9 | `FeedbackList.tsx` | Feedback card items: add Pattern A |
| 10 | `BillingSection.tsx` (line 365) | CollapsibleTrigger: replace `hover:bg-muted/50` with lavender hover |

This ensures every field you write into, click on, or view inside the Settings panel uses white backgrounds with the lavender hover effect matching the Personnel Cards.

