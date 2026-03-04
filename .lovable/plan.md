

## Color & Layout Fixes for Certificate Status Table in Project View

CSS and data changes only. No schema changes. 🟢

### Changes in `src/components/ProjectCertificateStatus.tsx`

**1. Extend `CertificateWithPersonnel` interface (line 33)**
Add `personnelCategory?: PersonnelCategory` and `personnelCity?: string`, `personnelCountry?: string` fields.

**2. Update data mapping (line 146–153)**
Include `personnelCategory: person.category`, `personnelCity: person.city`, `personnelCountry: person.country` in the flatMap.

**3. Color table rows by category (line 243–247)**
Add conditional background to `TableRow`: freelancers get `bg-[#C4B5FD]/10`, employees stay default (white).

**4. Add category badge next to role (line 259)**
After the role text, add a small `Badge`: "Freelancer" (lavender: `bg-[#C4B5FD]/20 text-[#4338CA]`) or "Employee" (default secondary).

**5. Split location into city/country (line 310–312)**
Replace single-line `placeOfIssue` display with a two-line layout: city on top, country below in smaller muted text. Parse from the "City, Country" format already stored.

Wait — the user said "personnel list sections" and "location" — they're referring to the Personnel column (person's location), not the certificate's place of issue. Let me re-read: "the location is slightly off, and it extends beyond the right side of the scroll section" — looking at the table, there's no personnel location column in the certificate table. The user might be referring to a different view.

Let me re-read: "Make the colours of the personnel list sections inside project view" — this could be the team members list in `ProjectDetail.tsx`, not the certificate table.

### Revised scope — check ProjectDetail team section

The "personnel list sections inside project view" likely refers to the assigned personnel list in `ProjectDetail.tsx`. Let me check that.

