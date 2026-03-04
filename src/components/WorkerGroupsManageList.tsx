import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, Users, ChevronDown, User } from 'lucide-react';
import {
  useWorkerGroups,
  useCreateWorkerGroup,
  useUpdateWorkerGroup,
  useDeleteWorkerGroup,
  useWorkerGroupMemberCounts,
  WorkerGroup,
} from '@/hooks/useWorkerGroups';
import { usePersonnelWorkerGroups } from '@/hooks/usePersonnelWorkerGroups';
import { usePersonnel } from '@/hooks/usePersonnel';
import { PersonnelPreviewSheet } from '@/components/PersonnelPreviewSheet';
import { Personnel } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function WorkerGroupsManageList() {
  const { data: groups = [], isLoading } = useWorkerGroups();
  const { data: memberCounts = [] } = useWorkerGroupMemberCounts();
  const { data: personnelWorkerGroups = [] } = usePersonnelWorkerGroups();
  const { personnel: allPersonnel = [] } = usePersonnel();
  const createMutation = useCreateWorkerGroup();
  const updateMutation = useUpdateWorkerGroup();
  const deleteMutation = useDeleteWorkerGroup();

  const [newName, setNewName] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<WorkerGroup | null>(null);
  const [editName, setEditName] = useState('');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [previewPersonnel, setPreviewPersonnel] = useState<Personnel | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Member count lookup
  const countMap = new Map<string, number>();
  for (const mc of memberCounts) countMap.set(mc.worker_group_id, mc.count);

  // Build a map of group -> personnel list
  const groupMembersMap = useMemo(() => {
    const map = new Map<string, Personnel[]>();
    const personnelMap = new Map(allPersonnel.map(p => [p.id, p]));
    for (const pwg of personnelWorkerGroups) {
      const person = personnelMap.get(pwg.personnel_id);
      if (!person) continue;
      const list = map.get(pwg.worker_group_id) ?? [];
      list.push(person);
      map.set(pwg.worker_group_id, list);
    }
    return map;
  }, [personnelWorkerGroups, allPersonnel]);

  // Auto-focus input when empty state
  useEffect(() => {
    if (!isLoading && groups.length === 0) {
      inputRef.current?.focus();
    }
  }, [isLoading, groups.length]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await createMutation.mutateAsync(newName);
    setNewName('');
  };

  const handleEdit = async () => {
    if (!selectedGroup || !editName.trim()) return;
    await updateMutation.mutateAsync({ id: selectedGroup.id, name: editName });
    setEditDialogOpen(false);
    setSelectedGroup(null);
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;
    await deleteMutation.mutateAsync(selectedGroup.id);
    setDeleteDialogOpen(false);
    setSelectedGroup(null);
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder="Enter new group name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          disabled={createMutation.isPending}
          className="bg-white dark:bg-card"
        />
        <Button onClick={handleAdd} disabled={createMutation.isPending || !newName.trim()}>
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span className="ml-2">Add</span>
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No groups created yet</p>
          <p className="text-sm mt-1">Create your first group above to start organizing workers.</p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {groups.map((group) => {
            const count = countMap.get(group.id) || 0;
            const isExpanded = expandedGroupId === group.id;
            const members = groupMembersMap.get(group.id) ?? [];
            return (
              <div key={group.id}>
                <div
                  className="flex items-center justify-between p-3 bg-white dark:bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all rounded-lg cursor-pointer"
                  onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                    <span className="font-medium">{group.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {count} {count === 1 ? 'member' : 'members'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedGroup(group);
                        setEditName(group.name);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setSelectedGroup(group);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded member list */}
                {isExpanded && (
                  <div className="bg-muted/30 border-t">
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No members assigned to this group.</p>
                    ) : (
                      <div className="divide-y divide-border/40">
                        {members.map((person) => (
                          <button
                            key={person.id}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left bg-white dark:bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all rounded-lg"
                            onClick={() => setPreviewPersonnel(person)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={person.avatarUrl} alt={person.name} />
                              <AvatarFallback className="text-xs">{getInitials(person.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{person.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{person.role || person.email}</p>
                            </div>
                            <Badge variant={person.category === 'freelancer' ? 'secondary' : 'default'} className="font-normal">
                              {person.category === 'freelancer' ? 'Freelancer' : 'Employee'}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {groups.length} {groups.length !== 1 ? 'groups' : 'group'} defined
      </p>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-group-name">Name</Label>
            <Input
              id="edit-group-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending || !editName.trim()}>
              {updateMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedGroup?.name}"? This will remove all personnel assignments to this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Personnel Preview Sheet */}
      <PersonnelPreviewSheet
        open={!!previewPersonnel}
        onOpenChange={(open) => { if (!open) setPreviewPersonnel(null); }}
        personnel={previewPersonnel}
      />
    </div>
  );
}
