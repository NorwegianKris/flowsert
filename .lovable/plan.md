

## Make Certificate Status Section Scrollable & Collapsible

Two CSS/structure changes to `src/components/ProjectCertificateStatus.tsx`. No schema or logic changes. 🟢

### Change 1: Collapsible section
Wrap the `CardContent` in a `Collapsible` from `@radix-ui/react-collapsible` (already available). Add a `CollapsibleTrigger` on the `CardHeader` with a chevron icon, default open. Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible` and `ChevronDown` from lucide.

### Change 2: Scrollable table with 10-row max height
Wrap the table's container `div` (line 214) with a `max-h` and `overflow-y-auto`. Each table row is roughly 56px, so 10 rows ≈ `max-h-[600px]` (including header). Use `overflow-y-auto` on the table wrapper. Keep `TableHeader` sticky with `sticky top-0 z-10 bg-primary`.

### Files
**`src/components/ProjectCertificateStatus.tsx`**
- Add imports: `Collapsible, CollapsibleTrigger, CollapsibleContent`, `ChevronDown`
- Add `const [isOpen, setIsOpen] = useState(true)` state
- Wrap outer Card content in `Collapsible open={isOpen} onOpenChange={setIsOpen}`
- Make CardHeader a `CollapsibleTrigger` with chevron that rotates on open
- Wrap CardContent in `CollapsibleContent`
- Add `max-h-[600px] overflow-y-auto` to the table container div (line 214)
- Add `sticky top-0 z-10` to `TableHeader` row

