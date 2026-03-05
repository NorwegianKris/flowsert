
Goal: restore the chat launcher pulse to its original slower behavior (no rapid flicker).

What I found
- The chat launcher is in `src/components/ChatBot.tsx` (closed state button, around line ~394) and uses `animate-pulse hover:animate-none`.
- The shared primary button now adds global motion classes in `src/components/ui/button.tsx` (`duration-200` + hover transform/shadow), which can interfere with pulse timing/visual stability on this specific floating CTA.

Implementation plan
1. Make chat pulse timing explicit on the launcher button (ChatBot only)
- File: `src/components/ChatBot.tsx`
- Update the closed-state chat button to force a stable pulse cycle:
  - Keep pulse animation, but set explicit animation duration on this element (`2s`) so it cannot inherit/appear sped up.
  - Keep `hover:animate-none` so it stops pulsing on hover as before.

2. Prevent hover-lift jitter on the floating chat launcher
- File: `src/components/ChatBot.tsx`
- Override inherited primary hover lift for this one button:
  - Neutralize translate/shadow changes on hover for the floating launcher only (so pointer position does not create a micro blink/jitter effect).

3. (Optional hardening) Apply same explicit pulse duration to the other pulsing primary CTA
- File: `src/components/TaxonomySeedingTool.tsx`
- Add explicit pulse duration there too to avoid similar regressions elsewhere.

4. Validate behavior
- Confirm launcher pulse looks like original (slow breathing pulse, not rapid blink).
- Confirm hover still pauses pulse and click/open behavior remains unchanged.

Files to change
- `src/components/ChatBot.tsx`
- `src/components/TaxonomySeedingTool.tsx` (optional hardening)
