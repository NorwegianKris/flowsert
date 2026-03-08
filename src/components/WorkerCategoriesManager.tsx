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

interface WorkerCategory {
  id: string;
  name: string;
  created_at: string;
}

export function WorkerCategoriesManager() {
  const { businessId } = useAuth();
  const [categories, setCategories] = useState<WorkerCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<WorkerCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    if (!businessId) return;

    try {
      // Use type assertion since worker_categories table was just added
      const { data, error } = await (supabase
        .from('worker_categories' as any)
        .select('id, name, created_at')
        .eq('business_id', businessId)
        .order('name') as any);

      if (error) throw error;
      setCategories((data as WorkerCategory[]) || []);
    } catch (error) {
      console.error('Error fetching worker categories:', error);
      toast.error('Failed to load worker categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [businessId]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !businessId) return;

    setAdding(true);
    try {
      const { error } = await (supabase
        .from('worker_categories' as any)
        .insert({
          business_id: businessId,
          name: newCategoryName.trim(),
        }) as any);

      if (error) {
        if (error.code === '23505') {
          toast.error('This category already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Category added successfully');
      setNewCategoryName('');
      fetchCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setDeleting(true);
    try {
      const { error } = await (supabase
        .from('worker_categories' as any)
        .delete()
        .eq('id', categoryToDelete.id) as any);

      if (error) throw error;

      toast.success('Category deleted successfully');
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (category: WorkerCategory) => {
    setCategoryToDelete(category);
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
        {/* Add new category */}
        <div className="flex gap-2">
          <Input
            className="bg-white dark:bg-card"
            placeholder="Enter new job role category..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            disabled={adding}
          />
          <Button onClick={handleAddCategory} disabled={adding || !newCategoryName.trim()}>
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="ml-2">Add</span>
          </Button>
        </div>

        {/* Categories list */}
        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-3">👷</div>
            <p>No worker categories defined yet.</p>
            <p className="text-sm">Add job role categories above (e.g., "Marine Engineer", "Deckhand").</p>
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-card hover:bg-[#C4B5FD]/10 hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all relative hover:z-10 first:rounded-t-lg last:rounded-b-lg"
              >
                <span className="font-medium">{category.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openDeleteDialog(category)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {categories.length} {categories.length !== 1 ? 'categories' : 'category'} defined
        </p>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Worker Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category "{categoryToDelete?.name}"? 
              This will not affect existing personnel records, but this job role 
              will no longer appear as an option when adding new personnel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
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
