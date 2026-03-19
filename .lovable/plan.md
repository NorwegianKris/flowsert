

## Plan: PersonnelCard spacing fixes

### Changes in `src/components/PersonnelCard.tsx`

**1. Skills container — fixed min height (lines 231-245)**
- Remove the conditional rendering (`{personnel.skills && personnel.skills.length > 0 && ...}`) so the container always renders
- Add `min-h-[32px]` to the skills div so cards without skills reserve the same space
- Keep the conditional inside for the badge content only

**2. Phone row — bottom spacing (line 223)**
- Add `pb-3` to the phone number row div: `className="flex items-center gap-2 pb-3"`

### No other files changed.

