

## Restrict Worker Project Chat to Assigned + Activated Personnel

**Risk: GREEN** -- purely frontend filtering change, no database or RLS modifications.

### Problem

Currently, any worker who is assigned to a project can access the Project Chat in the Chat Hub, regardless of whether their personnel record is activated. Workers should only see and access project chats when they are both **assigned** to the project AND their personnel record has `activated = true`.

### Changes

**File 1: `src/hooks/useWorkerBusinesses.ts`**

- Add `activated` to the `WorkerBusiness` interface
- Include `activated` in the personnel query (`select('id, name, business_id, activated')`)
- Map `activated` into the returned `WorkerBusiness` objects

**File 2: `src/components/ChatBot.tsx`**

- Update the worker project fetch filter (around line 169) to also check that the matching personnelId belongs to an activated personnel record
- Update the `isAssignedToProject` check (around line 216) to also verify the personnel is activated
- This means only activated workers see projects in the list, and only activated workers can send messages

### How it works

When a worker opens Project Chat, the project list is filtered so that a project only appears if:
1. The worker's personnelId is in the project's `assigned_personnel` array, AND
2. That personnelId corresponds to a `WorkerBusiness` entry where `activated` is `true`

This ensures deactivated workers cannot access project group chats at all.

