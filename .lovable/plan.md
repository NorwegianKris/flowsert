
## Add "Project Chat" to the Chat Hub

**Risk: GREEN** -- purely UI/frontend change, no database or RLS modifications needed. The existing `project_messages` table and RLS policies already handle access control.

### Overview

Add a third option "Project Chat" to the floating Chat Hub picker. Users can select a project they are associated with and chat within that project's group chat -- reusing the existing `project_messages` table and realtime subscription logic from `ProjectChat.tsx`.

### How It Works

**For Admins:**
- A new "Project Chat" button appears in the picker (between Personnel Chat and AI Assistant)
- Clicking it shows a project selection list
- Default view shows **active projects** with a dropdown/tabs to switch to completed/all projects
- Selecting a project opens the group chat for that project

**For Workers:**
- The same "Project Chat" button appears in the picker
- Shows only projects the worker is assigned to (or has been invited to)
- Selecting a project opens the group chat

### Technical Details

**File: `src/components/ChatBot.tsx`**

1. **Expand `ChatView` type** to include two new views:
   ```
   'project-select' | 'project-chat'
   ```

2. **Add state** for selected project:
   ```tsx
   const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
   const [selectedProjectName, setSelectedProjectName] = useState('');
   const [projectFilter, setProjectFilter] = useState<'active' | 'completed' | 'all'>('active');
   ```

3. **Import and use project data:**
   - For admins: use `useProjects()` hook (already fetches all business projects)
   - For workers: fetch projects where the worker is assigned (query `projects` table filtered by `assigned_personnel` array containing worker's personnel ID, plus projects with pending invitations). Use a lightweight inline fetch since workers only need id/name/status.

4. **Add picker button** -- new button with `FolderOpen` icon labeled "Project Chat" with subtitle "Chat with your project team"

5. **Add `renderProjectSelect()`** -- a list of projects filtered by status tab (active/completed/all for admins). Each project item shows name and status badge. Clicking navigates to `project-chat` view.

6. **Add `renderProjectChat()`** -- reuse the same message fetching/sending/realtime pattern from `ProjectChat.tsx` but adapted for the chat hub's compact layout (no Card wrapper, same bubble styling as DM chat). Key logic:
   - Fetch messages from `project_messages` where `project_id = selectedProjectId`
   - Subscribe to realtime INSERT events
   - Send messages with sender_id, sender_name, sender_role, content
   - Workers who are only invited (not assigned) can read but not send (matches existing RLS)

7. **Update header** to show project name when in `project-chat` view and "Project Chat" when in `project-select` view.

8. **Update `goToPicker()`** to also reset project selection state.

9. **Add `Briefcase` or `FolderOpen` to imports** from lucide-react.

### Single file change: `src/components/ChatBot.tsx`

No database changes needed -- the `project_messages` table, realtime subscription, and RLS policies are already in place and correctly scoped.
