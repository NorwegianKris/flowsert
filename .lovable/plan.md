

## Unified Floating Chat Hub -- Final Implementation Plan

### Summary

The floating chat button becomes the single entry point for all messaging. Both roles see a two-option picker. The existing "Personnel Chat" entry under the admin Actions dropdown is removed.

- **Admins**: "Personnel Chat" | "AI Chat"
- **Workers**: "Admin Chat" | "AI Chat"

No database changes required. All existing RLS policies remain untouched.

---

### New File: `src/hooks/useDirectMessages.ts`

Shared hook extracting messaging logic from `DirectMessageChat` and `PersonnelChatSidebar`.

**Parameters**: `personnelId: string | null`, `senderRole: 'admin' | 'worker'`, `isViewOpen: boolean`

**Lifecycle (order matters)**:
1. When `personnelId` is null: return empty state, no fetch, no subscription
2. When `personnelId` is set: fetch messages first, then subscribe to realtime
3. Realtime channel uses the exact Supabase Postgres changes filter format:
```text
.on(
  'postgres_changes',
  {
    event: 'INSERT',
    schema: 'public',
    table: 'direct_messages',
    filter: `personnel_id=eq.${personnelId}`
  },
  (payload) => { /* append to local state */ }
)
```
4. Cleanup: `supabase.removeChannel(channel)` in useEffect return, with `personnelId` in dependency array

**isViewOpen must NOT be hardcoded**:
- ChatBot passes a derived value, not `true`
- Admin chat: `isViewOpen = (view === 'admin-personnel-chat')`
- Worker chat: `isViewOpen = (view === 'worker-admin-chat')`
- This ensures markAsRead only fires when the user is actually looking at the chat thread, not when browsing the picker or selection list

**markAsRead behavior**:
- Only runs when `isViewOpen === true`
- Only marks messages where unread messages exist from opposite role
- Admin marks: `personnel_id = X AND sender_role = 'worker' AND read_at IS NULL`
- Worker marks: `personnel_id = X AND sender_role = 'admin' AND read_at IS NULL`
- Does not fire if no unread messages exist

**Message update strategy -- realtime-only (no refetch after send)**:
- After a successful send, do NOT refetch messages and do NOT optimistically append
- Instead, rely entirely on the realtime subscription to deliver the new message back (including the sender's own messages)
- This eliminates the duplicate message problem entirely: one source of truth for new messages
- The send function only clears the input and resets `isSending` state

**handleSend guard**: `if (!newMessage.trim() || !user || !personnelId) return;`

**Returns**: `messages`, `isLoading`, `isSending`, `newMessage`, `setNewMessage`, `handleSend`, `handleKeyDown`, `markAsRead`, `unreadCount`

---

### Modified File: `src/hooks/useWorkerBusinesses.ts`

**Updated interface**:
```text
WorkerBusiness {
  businessId: string
  businessName: string
  businessLogoUrl: string | null
  personnelId: string
  personnelName: string
}
```

**Query change**: `select('id, name, business_id')` on personnel table, then join with businesses table.

---

### Modified File: `src/components/MyCompanies.tsx`

Update field references: `biz.id` to `biz.businessId`, `biz.name` to `biz.businessName`, `biz.logo_url` to `biz.businessLogoUrl`.

---

### Modified File: `src/components/ChatBot.tsx` (Major Refactor)

Becomes the unified Chat Hub with a multi-view state machine.

**View states**: `'picker' | 'admin-personnel-select' | 'admin-personnel-chat' | 'worker-admin-select' | 'worker-admin-chat' | 'ai'`

**isViewOpen derivation** (passed to useDirectMessages):
```text
const isViewOpen = view === 'admin-personnel-chat' || view === 'worker-admin-chat';
```
This is computed from the view state and passed as the third argument. Never hardcoded to `true`.

**State isolation rules**:
- AI chat message history preserved in component state (not reset when switching views)
- `selectedPersonnelId` and `selectedChatName` reset to null when returning to picker
- Prevents sending to the wrong thread after navigating back

**Admin flow** (`isAdmin === true`):
- Picker: "Personnel Chat" (Building icon) | "AI Chat" (Sparkles icon)
- Personnel Chat uses `usePersonnel()` (RLS-scoped to admin's business)
- Only shows personnel where `userId` is truthy (chat-eligible filter)
- Sorted: unread first, then alphabetical
- Searchable list with per-person unread badges
- Selecting a person sets `selectedPersonnelId` and switches to `admin-personnel-chat`
- Unread badge on floating button: uses `useUnreadDirectMessages()` internally (self-contained, no props from parent)

**Worker flow** (`isAdmin === false`):
- Picker: "Admin Chat" (Building icon) | "AI Chat" (Sparkles icon)
- Uses `useWorkerBusinesses()` to get memberships
- If 0 businesses: "Admin Chat" card disabled with "No company linked"
- If 1 business: clicking goes directly to chat with that `personnelId`
- If multiple: shows company selection, then opens chat
- Unread badge: query with `.select('id', { count: 'exact', head: true }).in('personnel_id', personnelIds).eq('sender_role', 'admin').is('read_at', null)`
  - Read count from response `count` property, not `data.length` (since `head: true` returns no rows)
  - If `personnelIds.length === 0`: skip query entirely, set count to 0

**AI view**: Existing streaming chatbot, unchanged. Back arrow returns to picker.

**All sub-views** have a back arrow in the header returning to picker (which also resets `selectedPersonnelId`).

---

### Modified File: `src/components/DirectMessageChat.tsx`

Replace inline fetch/send/realtime/mark-as-read logic with `useDirectMessages(personnelId, senderRole, isSheetOpen)`. No visual changes.

---

### Modified File: `src/components/PersonnelChatSidebar.tsx`

Replace inline messaging logic with `useDirectMessages(selectedPersonnel?.id, 'admin', open)`. No visual changes. Entry point in Actions is removed.

---

### Modified File: `src/pages/AdminDashboard.tsx`

- Remove `personnelChatOpen` state variable
- Remove `PersonnelChatSidebar` import and render
- Remove "Personnel Chat" `DropdownMenuItem` from Actions dropdown
- Remove unread badge on Actions button
- Remove `useUnreadDirectMessages` import and usage (ChatBot handles its own)
- Keep `<ChatBot isAdmin />` as-is

---

### Security Constraints

1. All chat queries use `personnel_id` only, never `business_id` for message access
2. Admin personnel list from `usePersonnel()` is RLS-scoped to admin's business
3. Worker company list from `useWorkerBusinesses()` queries personnel where `user_id = auth.uid()` (RLS-enforced)
4. Realtime subscriptions must use server-side filter `personnel_id=eq.${personnelId}` inside `.on('postgres_changes', ...)`. Never subscribe broadly and filter on the client.
5. Subscription cleanup on `personnelId` change prevents duplicate channels
6. Mark-as-read: admin marks `sender_role='worker'` read; worker marks `sender_role='admin'` read. Always scoped to specific `personnel_id` and `read_at IS NULL`. Only called when `isViewOpen` is true (derived from view state, not hardcoded).
7. `handleSend` exits early if `!personnelId`
8. Unread badge query skipped when `personnelIds.length === 0`
9. Admin personnel-select only shows personnel where `userId` is truthy
10. Realtime subscription created only after initial fetch completes
11. Worker unread count read from response `count` property (not `data.length`)
12. AI chat state isolated from messaging state; `selectedPersonnelId` reset on return to picker
13. Message updates use realtime-only strategy (no refetch after send, no optimistic append) to prevent duplicates

### No Database Changes Required

Existing `direct_messages` table and RLS policies are already correct.

