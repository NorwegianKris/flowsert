

## Make All Filter & Action Buttons White Background

Purely cosmetic. 🟢

### Problem
The outline buttons use `bg-background` which is the soft slate-blue page color (`hsl(209 40% 96%)`), making them blend into the background rather than standing out as white controls.

### Changes

**`src/components/PersonnelFilters.tsx`**
- Add `bg-white dark:bg-card` to all five filter button triggers (Availability, Location, Certificates, Department, Compliance). They currently use `variant="outline"` which inherits the slate-blue background.

**`src/pages/AdminDashboard.tsx`**
- Add `bg-white dark:bg-card` to the three header action buttons: **Actions** dropdown trigger, **Settings**, and **Sign Out**.

**`src/components/DashboardHeader.tsx`**
- Add `bg-white dark:bg-card` to the **My Profile** button.

All buttons keep `variant="outline"` for border styling; we just override the background color with an additional class.

