
# Fix Expiry Timeline Click Navigation

## Problem
Clicking on expiry groups in the Expiry Timeline does nothing visible. The navigation code runs and changes the URL, but the Admin Dashboard doesn't respond to URL parameters.

## Root Cause
The `AdminDashboard` component manages tab state internally using `useState('personnel')` but never reads the `?tab=` query parameter from the URL. When `ExpiryTimeline` calls `navigate('/admin?tab=personnel&status=overdue')`, the URL updates but nothing on the page changes.

## Solution
Add URL parameter synchronization to the Admin Dashboard so that:
1. When the URL contains `?tab=X`, the dashboard switches to that tab
2. When filters are in the URL (like `status=overdue` or `expiryMin/expiryMax`), they are applied to the personnel list

---

## Implementation Steps

### Step 1: Add URL Parameter Reading to AdminDashboard
Import `useSearchParams` from `react-router-dom` and create an effect that:
- Reads the `tab` parameter and updates `activeTab` state
- Reads filter parameters (`status`, `expiryMin`, `expiryMax`, `category`) and applies them to the personnel filters

### Step 2: Add Expiry-Based Filtering to Personnel
The personnel list needs to be able to filter by certificate expiry status. This requires:
- Adding new state for expiry filters (e.g., `expiryStatus`, `expiryRange`)
- Updating the `filteredPersonnel` logic to include certificates that match the expiry criteria
- Clearing these filters when the user navigates away or resets

### Step 3: Apply URL Filters on Mount/Change
Create a `useEffect` that watches URL parameters and:
- Switches to the correct tab
- Sets appropriate filter states
- Optionally scrolls to show the filtered results

### Step 4: Visual Feedback
When navigating from the timeline, show which filter is active so users understand why they're seeing a subset of personnel.

---

## Technical Details

### Files to Modify

**`src/pages/AdminDashboard.tsx`**
- Import `useSearchParams` from `react-router-dom`
- Add new state variables for expiry filtering
- Add `useEffect` to sync URL params to state
- Update `filteredPersonnel` logic to support expiry-based filtering

**`src/components/PersonnelFilters.tsx`** (optional enhancement)
- Add visual indicator when expiry filters are active from URL navigation
- Add a "Clear expiry filter" button

### Code Changes Preview

```typescript
// In AdminDashboard.tsx
import { useSearchParams } from 'react-router-dom';

// Add new state
const [searchParams, setSearchParams] = useSearchParams();
const [expiryFilterStatus, setExpiryFilterStatus] = useState<'overdue' | null>(null);
const [expiryFilterRange, setExpiryFilterRange] = useState<{min: number, max: number} | null>(null);

// Sync URL params to state
useEffect(() => {
  const tab = searchParams.get('tab');
  if (tab && ['personnel', 'overview', 'projects'].includes(tab)) {
    setActiveTab(tab);
  }
  
  const status = searchParams.get('status');
  if (status === 'overdue') {
    setExpiryFilterStatus('overdue');
  }
  
  const expiryMin = searchParams.get('expiryMin');
  const expiryMax = searchParams.get('expiryMax');
  if (expiryMin && expiryMax) {
    setExpiryFilterRange({ min: parseInt(expiryMin), max: parseInt(expiryMax) });
  }
  
  const category = searchParams.get('category');
  if (category === 'employees' || category === 'freelancers') {
    // Apply category filter
  }
}, [searchParams]);
```

### Filter Logic Update
In the `filteredPersonnel` memo, add logic to filter by expiry:
```typescript
// If expiry filter is active, only show personnel with matching certificates
if (expiryFilterStatus === 'overdue') {
  const hasOverdueCert = p.certificates.some(c => {
    const days = getDaysUntilExpiry(c.expiryDate);
    return days !== null && days < 0;
  });
  if (!hasOverdueCert) return false;
}

if (expiryFilterRange) {
  const hasMatchingCert = p.certificates.some(c => {
    const days = getDaysUntilExpiry(c.expiryDate);
    return days !== null && days >= expiryFilterRange.min && days <= expiryFilterRange.max;
  });
  if (!hasMatchingCert) return false;
}
```

---

## Expected Outcome
After implementation:
1. Clicking "Overdue" in the Expiry Timeline navigates to `/admin?tab=personnel&status=overdue`
2. The dashboard switches to the Personnel tab
3. Only personnel with overdue certificates are shown
4. A filter indicator shows that expiry filtering is active
5. Users can clear the filter to see all personnel again
