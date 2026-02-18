

## Switch Industry Challenges Icons to Emojis

Replace the Lucide icon components in the "Common Industry Challenges" section with emoji icons, matching the style used in the "Platform Features" section.

### Changes

**File:** `src/pages/Auth.tsx`

| Challenge | Current (Lucide Icon) | New (Emoji) |
|---|---|---|
| Scattered certificate storage | `<Mail />` | 📧 |
| Manual Excel tracking | `<FileSpreadsheet />` | 📊 |
| Mobilization delays | `<Clock />` | ⏰ |
| Repetitive admin follow-up | `<RefreshCw />` | 🔄 |
| Fragmented recruitment | `<PhoneOff />` | 📞 |
| Unstructured compliance sharing | `<ShieldAlert />` | 🛡️ |

### What changes

1. Replace each `<IconComponent className="h-6 w-6 text-primary" />` with the corresponding emoji
2. Add `text-2xl` class to the icon wrapper `<div>` (matching Platform Features style)
3. Remove unused Lucide imports (`Mail`, `FileSpreadsheet`, `RefreshCw`, `PhoneOff`, `ShieldAlert`) from the import statement -- `Clock` is still used elsewhere so it stays

### Technical Details

- Only `src/pages/Auth.tsx` is modified
- The icon container markup changes from `<div className="p-3 bg-primary/10 rounded-lg shrink-0"><Mail className="h-6 w-6 text-primary" /></div>` to `<div className="p-3 bg-primary/10 rounded-lg shrink-0 text-2xl">📧</div>`
- No new dependencies or components needed

