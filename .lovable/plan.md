

## Direct "Book a Demo" buttons to Calendly link

All "Book a Demo" buttons currently either open a dialog or navigate to `/contact`. They should instead open the Calendly scheduling link directly in a new tab.

**Calendly URL:** `https://calendly.com/kmu-7-vf/30min`

### Changes

**`src/pages/Auth.tsx`**
1. **Hero section** (line 546): Change `onBookDemo` from opening the demo dialog to opening the Calendly link in a new tab: `window.open('https://calendly.com/kmu-7-vf/30min', '_blank')`
2. **CTA "Book a Demo" button** (line 882): Change from `navigate('/contact')` to `window.open('https://calendly.com/kmu-7-vf/30min', '_blank')`
3. Optionally remove the demo dialog state and dialog component if no longer used elsewhere.

