

## Plan: Fix personnel deletion FK constraints

### Database Migration

Run a single migration with two changes:

1. **Fix `data_processing_acknowledgements.personnel_id` FK** — drop the existing NO ACTION constraint and re-add it with `ON DELETE CASCADE`
2. **Add missing `direct_messages.personnel_id` FK** — add a new foreign key to `personnel(id)` with `ON DELETE CASCADE`

```sql
ALTER TABLE public.data_processing_acknowledgements
  DROP CONSTRAINT data_processing_acknowledgements_personnel_id_fkey;
ALTER TABLE public.data_processing_acknowledgements
  ADD CONSTRAINT data_processing_acknowledgements_personnel_id_fkey
  FOREIGN KEY (personnel_id) REFERENCES public.personnel(id) ON DELETE CASCADE;

ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_personnel_id_fkey
  FOREIGN KEY (personnel_id) REFERENCES public.personnel(id) ON DELETE CASCADE;
```

### No frontend code changes needed

The existing delete handlers in `PersonnelCard.tsx` and `PersonnelOverview.tsx` already have proper error handling with toast messages. Once the FK constraints cascade correctly, deletion will succeed.

