

## Highlight Certificate Row from Compliance Timeline Bar Click

**Risk: GREEN** -- purely UI interaction change, no backend or data modifications.

### What Changes

Clicking a specific certificate bar in the compliance timeline will:
1. Scroll down to the Certificate Status table
2. Highlight the clicked certificate's row with a purple ring/frame
3. The highlight auto-clears after 3 seconds

### Technical Detail

**1. `ComplianceLane.tsx`** -- change `onScrollToCertificates` from a void callback to one that passes a certificate ID

- Update prop type: `onScrollToCertificates?: (certificateId: string) => void`
- Each bar's click handler calls `onScrollToCertificates(bar.certificate.id)` instead of the lane-level click
- Remove the lane-level `onClick` (so clicking empty space does nothing, only bars trigger it)

**2. `PersonnelGroup.tsx`** -- update prop type to pass through the certificate ID

- `onScrollToCertificates?: (certificateId: string) => void`

**3. `ProjectTimeline.tsx`** -- update `handleScrollToCertificates` to accept and forward a certificate ID

- Change callback signature: `(certificateId: string) => void`
- Add new prop: `onHighlightCertificate?: (certificateId: string) => void`
- Call both scroll-to-element and the highlight callback

**4. `ProjectDetail.tsx`** -- manage highlight state and pass it down

- Add state: `const [highlightedCertificateId, setHighlightedCertificateId] = useState<string | null>(null)`
- Pass `onHighlightCertificate={setHighlightedCertificateId}` to `ProjectTimeline`
- Pass `highlightedCertificateId` to `ProjectCertificateStatus`

**5. `ProjectCertificateStatus.tsx`** -- apply purple ring to highlighted row

- Accept new prop: `highlightedCertificateId?: string | null`
- On the matching `TableRow`, add a purple ring class: `ring-2 ring-primary shadow-md`
- Use a ref + `scrollIntoView` to ensure the row is visible
- Auto-clear highlight after 3 seconds via `useEffect`

### Files Changed (5)

- `src/components/project-timeline/ComplianceLane.tsx`
- `src/components/project-timeline/PersonnelGroup.tsx`
- `src/components/project-timeline/ProjectTimeline.tsx`
- `src/components/ProjectDetail.tsx`
- `src/components/ProjectCertificateStatus.tsx`
