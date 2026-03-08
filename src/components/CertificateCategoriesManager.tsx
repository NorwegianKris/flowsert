import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCertificateTypes, useCreateCertificateType } from '@/hooks/useCertificateTypes';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Award, FileText, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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

interface CertificateCategory {
  id: string;
  name: string;
  created_at: string;
}

export function CertificateCategoriesManager() {
  const { businessId } = useAuth();
  const [categories, setCategories] = useState<CertificateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CertificateCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  // Inline add-type state per category
  const [addingTypeForCategory, setAddingTypeForCategory] = useState<string | null>(null);
  const [newTypeName, setNewTypeName] = useState('');

  const { data: certificateTypes = [] } = useCertificateTypes({ includeInactive: false });
  const createTypeMutation = useCreateCertificateType();

  const fetchCategories = async () => {
    if (!businessId) return;
    try {
      const { data, error } = await supabase
        .from('certificate_categories')
        .select('id, name, created_at')
        .eq('business_id', businessId)
        .order('name');
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load certificate categories');
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
        .from('certificate_categories')
        .insert({ business_id: businessId, name: newCategoryName.trim() });
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
        .from('certificate_categories')
        .delete()
        .eq('id', categoryToDelete.id);
      if (error) {
        if (error.code === '23503') {
          toast.error('Cannot delete — this category has types assigned to it. Reassign or remove them first.');
        } else {
          throw error;
        }
        return;
      }
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

  const openDeleteDialog = (category: CertificateCategory) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const openEditDialog = (category: CertificateCategory) => {
    setEditingCategory({ id: category.id, name: category.name });
    setEditName(category.name);
  };

  const handleRenameCategory = async () => {
    if (!editingCategory || !editName.trim() || editName.trim() === editingCategory.name) {
      setEditingCategory(null);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('certificate_categories')
        .update({ name: editName.trim() })
        .eq('id', editingCategory.id);
      if (error) {
        if (error.code === '23505') {
          toast.error('A category with this name already exists');
        } else {
          throw error;
        }
        return;
      }
      toast.success('Category renamed successfully');
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Error renaming category:', error);
      toast.error('Failed to rename category');
    } finally {
      setSaving(false);
    }
  };

  const handleAddType = async (categoryId: string) => {
    if (!newTypeName.trim()) return;
    await createTypeMutation.mutateAsync({
      name: newTypeName.trim(),
      category_id: categoryId,
    });
    setNewTypeName('');
    setAddingTypeForCategory(null);
  };

  const getTypesForCategory = (categoryId: string | null) => {
    return certificateTypes
      .filter((t) => t.category_id === categoryId)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Certificate Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const uncategorizedTypes = getTypesForCategory(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Certificate Categories
          </CardTitle>
          <CardDescription>
            Define the certificate categories that personnel can upload. Expand a category to see and manage its types.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new category */}
          <div className="flex gap-2">
            <Input
              className="bg-white dark:bg-card"
              placeholder="Enter new category name..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              disabled={adding}
            />
            <Button onClick={handleAddCategory} disabled={adding || !newCategoryName.trim()}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ml-2">Add</span>
            </Button>
          </div>

          {/* Categories accordion */}
          {categories.length === 0 && uncategorizedTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-3">📜</div>
              <p>No certificate categories defined yet.</p>
              <p className="text-sm">Add your first category above.</p>
            </div>
          ) : (
            <Accordion type="multiple" className="border rounded-lg">
              {categories.map((category) => {
                const types = getTypesForCategory(category.id);
                return (
                  <AccordionItem key={category.id} value={category.id}>
                    <AccordionTrigger className="px-3 hover:no-underline">
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <span className="font-medium">{category.name}</span>
                        <Badge variant={types.length > 0 ? "secondary" : "outline"} className={`text-xs ${types.length === 0 ? 'text-muted-foreground' : ''}`}>
                          {types.length} type{types.length !== 1 ? 's' : ''}
                        </Badge>
                        <div className="ml-auto flex items-center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(category)}
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(category)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3">
                      {types.length === 0 ? (
                        <p className="text-sm text-muted-foreground pl-4 py-2">No types in this category yet.</p>
                      ) : (
                        <div className="space-y-1 pl-4">
                          {types.map((type) => (
                            <div key={type.id} className="flex items-center justify-between py-1.5 text-sm">
                              <span>{type.name}</span>
                              {(type.usage_count ?? 0) > 0 && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  <FileText className="h-3 w-3 mr-1" />
                                  {type.usage_count}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inline add type */}
                      {addingTypeForCategory === category.id ? (
                        <div className="flex gap-2 mt-2 pl-4">
                          <Input
                            placeholder="New type name..."
                            value={newTypeName}
                            onChange={(e) => setNewTypeName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddType(category.id);
                              if (e.key === 'Escape') {
                                setAddingTypeForCategory(null);
                                setNewTypeName('');
                              }
                            }}
                            className="h-8 text-sm bg-white dark:bg-card"
                            autoFocus
                            disabled={createTypeMutation.isPending}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAddType(category.id)}
                            disabled={!newTypeName.trim() || createTypeMutation.isPending}
                          >
                            {createTypeMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Add'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAddingTypeForCategory(category.id);
                            setNewTypeName('');
                          }}
                          className="text-xs text-primary hover:underline mt-2 pl-4 flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Add type
                        </button>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}

              {/* Uncategorized section */}
              {uncategorizedTypes.length > 0 && (
                <AccordionItem value="__uncategorized__">
                  <AccordionTrigger className="px-3 hover:no-underline">
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <span className="font-medium text-muted-foreground italic">Uncategorized</span>
                      <Badge variant="secondary" className="text-xs">
                        {uncategorizedTypes.length} type{uncategorizedTypes.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="space-y-1 pl-4">
                      {uncategorizedTypes.map((type) => (
                        <div key={type.id} className="flex items-center justify-between py-1.5 text-sm">
                          <span>{type.name}</span>
                          {(type.usage_count ?? 0) > 0 && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              <FileText className="h-3 w-3 mr-1" />
                              {type.usage_count}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          )}

          <p className="text-xs text-muted-foreground">
            {categories.length} {categories.length !== 1 ? 'categories' : 'category'} defined
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Certificate Category</AlertDialogTitle>
            <AlertDialogDescription>
              {categoryToDelete && getTypesForCategory(categoryToDelete.id).length > 0 ? (
                <>
                  The category "{categoryToDelete.name}" has {getTypesForCategory(categoryToDelete.id).length} type(s) assigned. 
                  Reassign or remove them first before deleting this category.
                </>
              ) : (
                <>
                  Are you sure you want to delete the category "{categoryToDelete?.name}"? 
                  This will not affect existing certificates, but personnel will no longer 
                  be able to select this category when adding new certificates.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={deleting || (categoryToDelete ? getTypesForCategory(categoryToDelete.id).length > 0 : false)}
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
