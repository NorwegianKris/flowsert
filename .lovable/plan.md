

# Switch kmu@live.no Back to Techno Dive

## Current State
Profile `6f4e9869-09b6-4329-8356-de6bcb7616f1` has `business_id = c9e4b56d-bcca-4852-930f-7927498694c7` (FlowSert TestCo).

## Action
Run a single UPDATE to set it back to Techno Dive:

```sql
UPDATE public.profiles
SET business_id = '38672512-2331-4546-8bc4-de942605fce1'
WHERE id = '6f4e9869-09b6-4329-8356-de6bcb7616f1';
```

Then verify the row returns the Techno Dive UUID.

## Risk
GREEN — single row data update, no schema or policy changes.

