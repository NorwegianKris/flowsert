

# Revert Profile to Techno Dive

The UPDATE statement cannot be run via the read-only query tool. I need to execute this as a data modification.

## What will be done

Run the following SQL to revert your profile back to Techno Dive:

```sql
UPDATE public.profiles
SET business_id = '38672512-2331-4546-8bc4-de942605fce1'
WHERE id = '6f4e9869-09b6-4329-8356-de6bcb7616f1';
```

This switches kmu@live.no back from FlowSert TestCo to Techno Dive AS.

## Risk Classification

GREEN — single row data update, no schema or policy changes. No anchor required.

