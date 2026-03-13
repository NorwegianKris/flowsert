

## Redesign Contact Page Layout

### Changes — `src/pages/Contact.tsx`

**Hero section**: Change heading to "Get in touch", subheading to "Book a demo directly or send us a message and we'll get back to you within 1 business day."

**Left column** — Calendly only:
- Column heading: "Book a 15-minute demo"
- Calendly widget height increased to 900px
- URL updated: `?hide_event_type_details=1&hide_gdpr_banner=1&background_color=faf5ff`
- Remove the old "Get in Touch" email block and "Or book a meeting directly" heading

**Right column** — Contact form:
- Column heading: "Send a message"
- Remove Subject field from form and state
- Keep Name, Email, Message fields (Name and Email side by side, Message below)
- Below the form card, add a subtle muted line: mail icon + "hello@flowsert.com"

**State cleanup**: Remove `subject` from `formData` state and from the edge function call body.

