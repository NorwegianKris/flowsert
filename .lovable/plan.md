

## Make All Inputs & Textareas White System-Wide

Cosmetic only. No schema changes. 🟢

The root cause: `bg-background` in Input and Textarea resolves to `HSL 209 40% 96%` (the soft slate-blue page background), not white. Instead of adding `bg-white` to 600+ individual Input/Textarea usages, we change the base components.

### Changes (2 files)

**`src/components/ui/input.tsx`** — Replace `bg-background` with `bg-white dark:bg-card` in the base class string.

**`src/components/ui/textarea.tsx`** — Replace `bg-background` with `bg-white dark:bg-card` in the base class string.

This single change propagates to every Input and Textarea across the entire system automatically. The per-component `bg-white dark:bg-card` overrides already in place become redundant but harmless.

