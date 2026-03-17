

## Make AI-suggested Badge Clickable to Focus Input

The badge and text are already correct (emerald green Badge with Sparkles icon saying "AI-suggested type"). The only missing piece is click-to-focus behavior.

### Change in `src/components/TaxonomySeedingTool.tsx`

**Lines 398-409** — Add a ref per suggestion input and an `onClick` on the Badge to focus it. Since suggestions are dynamic, use a ref map:

1. Add a `useRef` for input refs: `const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})` near line 42.

2. At line 399, add a `ref` callback to the `<Input>`:
```tsx
<Input
  ref={(el) => { inputRefs.current[s.id] = el; }}
  value={s.extractedName}
  ...
/>
```

3. At line 406, add `cursor-pointer` and `onClick` to the Badge:
```tsx
<Badge
  className="mt-1 flex items-center gap-1 w-fit cursor-pointer bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
  onClick={() => inputRefs.current[s.id]?.focus()}
>
  <Sparkles className="h-3 w-3" />
  AI-suggested type
</Badge>
```

### Files modified
- `src/components/TaxonomySeedingTool.tsx` — add ref map + clickable badge
