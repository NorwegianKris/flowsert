

## Add "Industry Challenges" Section

Create a new section on the Auth (landing) page that presents the six pain-point bullet points in the same visual style as the existing "Platform Features" section -- a 2-column grid with icon boxes, bold titles, and descriptive text.

### Bullet Points and Suggested Icons

| Bullet Point | Title | Icon |
|---|---|---|
| Personnel certificates stored across emails and shared folders | Scattered certificate storage | Mail |
| Expiry dates tracked manually in Excel | Manual Excel tracking | FileSpreadsheet |
| Last-minute mobilization issues due to missing or expired documentation | Mobilization delays | Clock |
| Administrative follow-up before every project start | Repetitive admin follow-up | RefreshCw |
| Inefficient freelancer recruitment through scattered emails and cold calls | Fragmented recruitment | PhoneOff |
| Unstructured compliance sharing to clients and auditors | Unstructured compliance sharing | ShieldAlert |

### Visual Style

- Same layout as "Platform Features": 2-column grid, each item with an icon in a rounded `bg-primary/10` box, bold title, and muted description text
- Uses Lucide icons instead of emojis (matching the rest of the app's icon usage)
- Section title: **"Common Industry Challenges"** (or similar) in the same `font-rajdhani` heading style
- Placed **above** the "Platform Features" section to set up the problem-then-solution narrative flow

### Technical Details

- **File modified:** `src/pages/Auth.tsx`
- Add a new `<section>` block before the existing Features section (around line 593)
- Import 6 additional Lucide icons: `Mail`, `FileSpreadsheet`, `Clock`, `RefreshCw`, `PhoneOff`, `ShieldAlert`
- Same background pattern overlay as the Features section for visual consistency
- No new components or files needed -- just a new section in the existing page

