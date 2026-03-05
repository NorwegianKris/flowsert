import { CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CertificateCategoriesManager } from '@/components/CertificateCategoriesManager';
import { DocumentCategoriesManager } from '@/components/DocumentCategoriesManager';
import { WorkerCategoriesManager } from '@/components/WorkerCategoriesManager';
import { WorkerGroupsManager } from '@/components/WorkerGroupsManager';
import { DepartmentsManager } from '@/components/DepartmentsManager';
import { CertificateTypesManager } from '@/components/CertificateTypesManager';
import { CertificateAliasesManager } from '@/components/CertificateAliasesManager';

import { CertificateBackfillTool } from '@/components/CertificateBackfillTool';
import { TaxonomySeedingTool } from '@/components/TaxonomySeedingTool';
import { Award, FileText, Users, Building2, ChevronDown, Settings2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CategoriesSectionProps {
  defaultTab?: string;
  defaultSubTab?: string;
}

export function CategoriesSection({ defaultTab, defaultSubTab }: CategoriesSectionProps) {
  return (
    <div className="p-4">
      <p className="text-sm text-muted-foreground mb-4">
        Manage the categories used throughout your organization for workers, departments, certificates, and documents.
      </p>
        <Tabs defaultValue={defaultTab || "workers"} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="workers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Workers
            </TabsTrigger>
            <TabsTrigger value="departments" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="certificates" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Certificates
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Global Documents
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="workers">
            <Tabs defaultValue="roles" className="w-full">
              <div className="flex items-center gap-4 mb-4">
                <TabsList>
                  <TabsTrigger value="roles">Roles</TabsTrigger>
                  <TabsTrigger value="worker-groups">Worker Groups</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-1.5">
                  <span className="text-sm">💡</span>
                  <span className="text-xs text-muted-foreground">Roles define job categories; Worker Groups organize personnel into custom teams.</span>
                </div>
              </div>
              
              <TabsContent value="roles">
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-muted-foreground">
                    Define job role categories for personnel. These will appear as options when new workers are added or register.
                  </p>
                </div>
                <WorkerCategoriesManager />
              </TabsContent>
              
              <TabsContent value="worker-groups">
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-muted-foreground">
                    Organize personnel into custom groups for filtering and team management.
                  </p>
                </div>
                <WorkerGroupsManager />
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          <TabsContent value="departments">
            <div className="space-y-2 mb-4">
              <p className="text-sm text-muted-foreground">
                Define departments within your organization. These will appear as options when adding new workers.
              </p>
            </div>
            <DepartmentsManager />
          </TabsContent>
          
          <TabsContent value="certificates">
            <TaxonomySeedingTool />
            <Tabs defaultValue={defaultSubTab || "categories"} className="w-full">
              <div className="flex items-center gap-4 mb-4">
                <TabsList>
                  <TabsTrigger value="categories">Categories</TabsTrigger>
                  <TabsTrigger value="types">Types</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-1.5">
                  <span className="text-sm">💡</span>
                  <span className="text-xs text-muted-foreground">Categories are broad groupings; Types are specific classifications.</span>
                </div>
              </div>
              
              <TabsContent value="categories">
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-muted-foreground">
                    Define broad certificate categories such as Welding, Diving, Inspection, or Safety.
                  </p>
                </div>
                <CertificateCategoriesContent />
              </TabsContent>
              
              <TabsContent value="types">
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-muted-foreground">
                    Manage the official certificate types used to organize and group certificates consistently.
                  </p>
                </div>
                <CertificateTypesManager />
              </TabsContent>
            </Tabs>
            
            {/* Advanced Tools - Collapsible */}
            <Collapsible className="mt-6 border-t pt-4">
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                <Settings2 className="h-4 w-4" />
                <span>Advanced</span>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-6">
                <p className="text-xs text-muted-foreground">
                  Rarely used tools for managing recognition and bulk processing.
                </p>
                <div>
                  <h4 className="text-sm font-medium mb-2">Aliases</h4>
                  <CertificateAliasesManager />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Backfill Tool</h4>
                  <CertificateBackfillTool />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>
          
          <TabsContent value="documents">
            <div className="space-y-2 mb-4">
              <p className="text-sm text-muted-foreground">
                Define document categories for personnel uploads.
              </p>
            </div>
            <DocumentCategoriesContent />
          </TabsContent>
        </Tabs>
    </div>
  );
}

// Inline versions without the Card wrapper for use in tabs
function CertificateCategoriesContent() {
  return <CertificateCategoriesInner />;
}

function DocumentCategoriesContent() {
  return <DocumentCategoriesInner />;
}

// These are simplified inline components that reuse the logic from the managers
// but without the Card wrapper
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCertificateTypes } from '@/hooks/useCertificateTypes';
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

interface Category {
  id: string;
  name: string;
  created_at: string;
}

function CertificateCategoriesInner() {
  const { businessId } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: certificateTypes } = useCertificateTypes({ includeInactive: false });

  const getTypeCount = (categoryId: string) => {
    if (!certificateTypes) return 0;
    return certificateTypes.filter(t => t.category_id === categoryId).length;
  };
  const [newCategoryName, setNewCategoryName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      const { error } = await supabase.from('certificate_categories').delete().eq('id', categoryToDelete.id);
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

        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-3">📜</div>
            <p>No certificate categories defined yet.</p>
            <p className="text-sm">Add your first category above.</p>
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-3 bg-white dark:bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{category.name}</span>
                  {(() => {
                    const count = getTypeCount(category.id);
                    return (
                      <Badge variant={count > 0 ? "secondary" : "outline"} className={count === 0 ? "text-muted-foreground" : ""}>
                        {count} {count === 1 ? 'type' : 'types'}
                      </Badge>
                    );
                  })()}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setCategoryToDelete(category); setDeleteDialogOpen(true); }}
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
            <AlertDialogTitle>Delete Certificate Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DocumentCategoriesInner() {
  const { businessId } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
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
      const { error } = await supabase.from('document_categories').delete().eq('id', categoryToDelete.id);
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

        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-3">🗂️</div>
            <p>No document categories defined yet.</p>
            <p className="text-sm">Add your first category above.</p>
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-3 bg-white dark:bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all rounded-lg">
                <span className="font-medium">{category.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setCategoryToDelete(category); setDeleteDialogOpen(true); }}
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
            <AlertDialogTitle>Delete Document Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function IssuersListInner() {
  const { businessId } = useAuth();
  const [issuers, setIssuers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    const fetchIssuers = async () => {
      try {
        const { data, error } = await supabase
          .from('certificates')
          .select('issuing_authority, personnel!inner(business_id)')
          .eq('personnel.business_id', businessId)
          .not('issuing_authority', 'is', null)
          .neq('issuing_authority', '');
        if (error) throw error;
        const unique = [...new Set((data || []).map((r: any) => r.issuing_authority as string))].sort((a, b) => a.localeCompare(b));
        setIssuers(unique);
      } catch (error) {
        console.error('Error fetching issuers:', error);
        toast.error('Failed to load issuing authorities');
      } finally {
        setLoading(false);
      }
    };
    fetchIssuers();
  }, [businessId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {issuers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-4xl mb-3">🏛️</div>
          <p>No issuing authorities found yet.</p>
          <p className="text-sm">Issuers will appear here once certificates with issuing authority data are added.</p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {issuers.map((issuer) => (
            <div key={issuer} className="flex items-center p-3 bg-white dark:bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all rounded-lg">
              <span className="font-medium">{issuer}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {issuers.length} issuer{issuers.length !== 1 ? 's' : ''} found
      </p>
    </div>
  );
}
