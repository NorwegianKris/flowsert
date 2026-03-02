

## Enhanced Plan: Seed Default Issuers + Upgrade IssuerMergingPane Layout

Corrected approach: reuse the existing `issuer_types` / `issuer_aliases` / `IssuerMergingPane` / `IssuerTypesManager` system. No new tables.

---

### 1. Database Migration (RED — trigger + seed + backfill)

**A. Create `seed_default_issuer_types()` trigger function** on `businesses` INSERT, matching `seed_default_certificate_categories()` pattern exactly. Seeds ~40 issuer types with idempotent `INSERT ... WHERE NOT EXISTS`:

DNV, Lloyd's Register, Bureau Veritas, OPITO, Nautical Institute, NEBOSH, IOSH, City & Guilds, ECITB, LEEA, CISRS, GWO, IMCA, TUV, ClassNK, American Bureau of Shipping, Korean Register, RINA, SGS, Intertek, BSI, Norwegian Maritime Authority, UK Maritime and Coastguard Agency, Maritime New Zealand, AMSA, NOGEPA, Oil & Gas UK, IADC, IWCF, WeldTech, TWI, PCN, BINDT, NACE International, CompEx, Red Cross, St John Ambulance, EFA Awards, Highfield Qualifications, Qualsafe Awards, ProTrainings.

**B. Auto-create one `issuer_aliases` row per seeded issuer type** where `alias_normalized = lower(trim(name))`, `alias_raw_example = name`, `created_by = 'system'`, `confidence = 100`. This ensures exact-name matches work immediately upon business creation.

**C. Backfill migration** for existing businesses: loop over all businesses missing these defaults and insert them idempotently (same `WHERE NOT EXISTS` pattern). Also backfill the matching aliases.

**D. Attach trigger** to `businesses` table on `AFTER INSERT FOR EACH ROW`.

### 2. Refactor IssuerMergingPane to Match TypeMergingPane Layout (UI only)

Current state: `IssuerMergingPane` uses a two-column grid (`grid-cols-[1fr,auto,1fr]`) but the right pane has no collapsible rows showing linked certificates, no count badges with variant styling, and no category grouping.

Changes to `src/components/IssuerMergingPane.tsx`:

- **Right pane**: Add collapsible rows on each merged issuer. Expanding shows certificates linked to that issuer type (personnel name, certificate type name, issue/expiry dates) — fetched via a query joining `certificates` where `issuer_type_id = <id>` and `personnel.business_id = businessId`. Show count badge on each: `variant="outline"` for 0, `variant="secondary"` for >0 (matching TypeMergingPane line 686-688).
- **Layout proportions**: Switch from equal `1fr` columns to explicit flex proportions matching TypeMergingPane: left 35%, center 28%, right 37% (via `style={{ flex: "0 0 NN%" }}`).
- **Add `needs-review-count` invalidation** in `executeGrouping()` — currently missing (line 275-276 only invalidates `certificates` and `issuer-type-usage`).

### 3. Files Changed

| File | Action | Scope |
|------|--------|-------|
| Migration SQL | Create | Seed trigger + backfill |
| `src/components/IssuerMergingPane.tsx` | Edit | Three-pane layout, collapsible right pane, count badges, invalidation fix |

### Production Risk

This is a GREEN migration (additive only — new trigger function, new default rows). No destructive changes. The trigger only fires on new business creation. Backfill uses idempotent inserts. No RLS changes needed — existing `issuer_types` and `issuer_aliases` RLS policies already cover these rows.

