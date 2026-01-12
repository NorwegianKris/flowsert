import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, FileText } from 'lucide-react';
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

interface DocumentCategory {
  id: string;
  name: string;
  created_at: string;
}

export function DocumentCategoriesManager() {
  const { businessId } = useAuth();
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<DocumentCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    if (!businessId) return;

    try {
      const { data, error } = await supabase
        .from('document_categories')
        .select('id, name, created_at')
        .eq('business_id', businessId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching document categories:', error);
      toast.error('Failed to load document categories');
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
      const { error } = await supabase
        .from('document_categories')
        .insert({
          business_id: businessId,
          name: newCategoryName.trim(),
        });

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
      const { error } = await supabase
        .from('document_categories')
        .delete()
        .eq('id', categoryToDelete.id);

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

  const openDeleteDialog = (category: DocumentCategory) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Categories
          </CardTitle>
          <CardDescription>
            Define the document categories that personnel can upload. These categories will appear as options when uploading documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new category */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter new category name..."
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
              <p>No document categories defined yet.</p>
              <p className="text-sm">Add your first category above.</p>
            </div>
          ) : (
            <div className="border rounded-lg divide-y">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/50"
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
            {categories.length} category{categories.length !== 1 ? 'ies' : 'y'} defined
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category "{categoryToDelete?.name}"? 
              This will not affect existing documents, but personnel will no longer 
              be able to select this category when uploading new documents.
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
