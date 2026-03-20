

## Plan: Add 3 inline stat metrics to Overview tab top bar (revised)

### Changes in `src/pages/AdminDashboard.tsx`

**1. Add imports**
- `Popover, PopoverTrigger, PopoverContent` from `@/components/ui/popover`

**2. Compute stats via `useMemo`**
- `totalCertificates`: sum of all personnel's `certificates.length`
- `profilesWithoutCerts`: active personnel with 0 certificates (list + count)
- `activeProjectsCount`: projects with `status === 'active'`

**3. Insert stat clusters in the top bar (between label and filter buttons)**
- Wrapper div: `h-full overflow-hidden flex items-center gap-4` — fills parent height, never expands it
- 3 stat clusters separated by vertical dividers (`w-px bg-[#E5E7EB] self-stretch my-[20%]`)
- Each cluster: number (18px bold) + label (9px, #6B7280), vertically centered
- Stat 1: Certificates uploaded — number color `#3B3AC2`
- Stat 2: Profiles without certificates — amber if >0, green if 0; wrapped in `Popover` listing names with links
- Stat 3: Active projects — number color `#3B3AC2`

### No other files changed.

