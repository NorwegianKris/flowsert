

## Pulsating "Teach the System" Button + Close X

Cosmetic only. No schema changes. 🟢

### Changes — `src/components/TaxonomySeedingTool.tsx`

1. **Convert from uncontrolled to controlled Collapsible** — add `const [open, setOpen] = useState(false)` and pass `open`/`onOpenChange` to `<Collapsible>`.

2. **Style the trigger as pulsating pill button** (line 250):
```tsx
<CollapsibleTrigger
  onClick={(e) => e.stopPropagation()}
  className="flex items-center gap-2 text-sm font-bold cursor-pointer py-2 px-4 rounded-full bg-primary text-primary-foreground shadow-lg animate-pulse hover:animate-none transition-colors"
>
  <Sparkles className="h-4 w-4" />
  <span>Teach the System</span>
</CollapsibleTrigger>
```
- Remove the ChevronDown arrow entirely from the trigger.

3. **Add X close button inside the expanded content** (line 256, top-right of the content panel):
```tsx
<div className="border rounded-lg p-4 space-y-4 bg-muted/20 relative">
  <button onClick={() => setOpen(false)} className="absolute top-2 right-2 ...">
    <X className="h-4 w-4" />
  </button>
  ...
</div>
```

4. **Hide the trigger when open** — only show the pulsating button when collapsed, so the X is the only way to close.

