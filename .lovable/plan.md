

## Align Bottom Edges of Both Columns

The Calendly widget is set to 900px but the actual calendar content is much shorter (~500px). The form stretches to match that 900px, creating excessive whitespace.

### Change — `src/pages/Contact.tsx`

Reduce the height of both the Calendly widget and the form container from `900px` to `580px`. This fits the calendar content (date picker + time zone) without internal scrolling, and the form box will align with the calendar's bottom edge as shown in the reference image.

- Line 96: Change Calendly widget height from `900px` to `580px`
- Line 100: Change form container height from `900px` to `580px`

Single file: `src/pages/Contact.tsx`

