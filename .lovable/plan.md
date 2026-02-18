

## Industry Tags with Vertical Dividers

Add the industry tags line below the dashboard illustration in the hero section, using thin vertical line dividers instead of bullet punctuation between each item.

### Design

- Four labels separated by slim vertical bars: **Offshore | Subsea | Industrial Services | Construction**
- Uses a flex row with the existing `<Separator orientation="vertical" />` component (already in the project) between each label
- Styled with `font-rajdhani`, uppercase, `tracking-widest`, muted foreground color

### Technical Details

- **File:** `src/pages/Auth.tsx`
- Import `Separator` from `@/components/ui/separator`
- Insert a flex container after the dashboard card, using `<Separator orientation="vertical" className="h-4" />` between each text span
- Approximate markup:
```text
<div className="flex items-center justify-center gap-3 mt-5">
  <span>Offshore</span>
  <Separator orientation="vertical" className="h-4" />
  <span>Subsea</span>
  <Separator orientation="vertical" className="h-4" />
  <span>Industrial Services</span>
  <Separator orientation="vertical" className="h-4" />
  <span>Construction</span>
</div>
```
- Text spans styled with `text-sm tracking-widest uppercase font-rajdhani text-muted-foreground`
- No new files or components needed

