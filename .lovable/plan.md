

# Add Employee/Freelancer Tag to Personnel Group in Project Timeline

**Risk: GREEN** -- purely UI text/layout change, no database or backend modifications.

## What Changes

In the project timeline, each personnel row header currently shows the person's name and role. We will add a small colored tag showing "Employee" or "Freelancer" based on their `category` field, giving a quick visual indicator of the workforce mix.

## Technical Details

### File: `src/components/project-timeline/PersonnelGroup.tsx`

- Import the `Badge` component from `@/components/ui/badge`
- After the person's name `<span>`, add a `Badge` element:
  - If `person.category === 'freelancer'`: show "Freelancer" with a blue/indigo style
  - Otherwise: show "Employee" with a default/muted style
  - Badge will use `text-[8px]` sizing and compact padding (`px-1.5 py-0`) to fit the compact timeline row
- The tag appears between the name and the role text

### Visual result

```
v [Avatar] John Smith  Employee  Diver
v [Avatar] Jane Doe    Freelancer  Welder
```

