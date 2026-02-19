import { useState, useRef, useEffect } from 'react';
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
import { Plus, Pencil, Trash2, Loader2, Users } from 'lucide-react';
import {
  useWorkerGroups,
  useCreateWorkerGroup,
  useUpdateWorkerGroup,
  useDeleteWorkerGroup,
  useWorkerGroupMemberCounts,
  WorkerGroup,
} from '@/hooks/useWorkerGroups';

export function WorkerGroupsManageList() {
  const { data: groups = [], isLoading } = useWorkerGroups();
  const { data: memberCounts = [] } = useWorkerGroupMemberCounts();
  const createMutation = useCreateWorkerGroup();
  const updateMutation = useUpdateWorkerGroup();
  const deleteMutation = useDeleteWorkerGroup();

  const [newName, setNewName] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<WorkerGroup | null>(null);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Member count lookup
  const countMap = new Map<string, number>();
  for (const mc of memberCounts) countMap.set(mc.worker_group_id, mc.count);

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
            return (
              <div key={group.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{group.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {count} {count === 1 ? 'member' : 'members'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
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
    </div>
  );
}
