import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2 } from 'lucide-react';
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

interface Department {
  id: string;
  name: string;
  created_at: string;
}

export function DepartmentsManager() {
  const { businessId } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDepartments = async () => {
    if (!businessId) return;

    try {
      const { data, error } = await (supabase
        .from('departments' as any)
        .select('id, name, created_at')
        .eq('business_id', businessId)
        .order('name') as any);

      if (error) throw error;
      setDepartments((data as Department[]) || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [businessId]);

  const handleAddDepartment = async () => {
    if (!newDepartmentName.trim() || !businessId) return;

    setAdding(true);
    try {
      const { error } = await (supabase
        .from('departments' as any)
        .insert({
          business_id: businessId,
          name: newDepartmentName.trim(),
        }) as any);

      if (error) {
        if (error.code === '23505') {
          toast.error('This department already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Department added successfully');
      setNewDepartmentName('');
      fetchDepartments();
    } catch (error) {
      console.error('Error adding department:', error);
      toast.error('Failed to add department');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!departmentToDelete) return;

    setDeleting(true);
    try {
      const { error } = await (supabase
        .from('departments' as any)
        .delete()
        .eq('id', departmentToDelete.id) as any);

      if (error) throw error;

      toast.success('Department deleted successfully');
      setDeleteDialogOpen(false);
      setDepartmentToDelete(null);
      fetchDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('Failed to delete department');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (department: Department) => {
    setDepartmentToDelete(department);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Add new department */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter new department name..."
            value={newDepartmentName}
            onChange={(e) => setNewDepartmentName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()}
            disabled={adding}
          />
          <Button onClick={handleAddDepartment} disabled={adding || !newDepartmentName.trim()}>
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="ml-2">Add</span>
          </Button>
        </div>

        {/* Departments list */}
        {departments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-3">🏢</div>
            <p>No departments defined yet.</p>
            <p className="text-sm">Add departments above (e.g., "Engineering", "Operations").</p>
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {departments.map((department) => (
              <div
                key={department.id}
                className="flex items-center justify-between p-3 hover:bg-muted/50"
              >
                <span className="font-medium">{department.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openDeleteDialog(department)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {departments.length} department{departments.length !== 1 ? 's' : ''} defined
        </p>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the department "{departmentToDelete?.name}"? 
              This will not affect existing personnel records, but this department 
              will no longer appear as an option when adding new personnel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDepartment}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
