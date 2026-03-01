import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Archive,
  RotateCcw,
  Loader2,
  Search,
  Award,
  Merge,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  useCertificateTypes,
  useCreateCertificateType,
  useUpdateCertificateType,
  useArchiveCertificateType,
  useRestoreCertificateType,
  useCertificateTypeUsageCount,
  CertificateType,
} from "@/hooks/useCertificateTypes";
import { TypeMergingPane } from "@/components/TypeMergingPane";

interface Category {
  id: string;
  name: string;
}

type FilterStatus = "active" | "archived" | "all";

export function CertificateTypesManager() {
  const { businessId } = useAuth();
  const [activeView, setActiveView] = useState<"merge" | "manage">("merge");

  return (
    <div className="space-y-4" data-scroll-target="unmapped-certificates">
      {/* View selector */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "merge" | "manage")}>
        <TabsList>
          <TabsTrigger value="merge" className="gap-2">
            <Merge className="h-4 w-4" />
            <span className="hidden sm:inline">Group Types</span>
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Manage Types</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="merge" className="mt-4">
          <TypeMergingPane />
        </TabsContent>
        
        <TabsContent value="manage" className="mt-4">
          <TypesManageList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * The original types management list - for editing/archiving types
 */
function TypesManageList() {
  const { businessId } = useAuth();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<CertificateType | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<string | null>(null);

  // Hooks
  const { data: types = [], isLoading } = useCertificateTypes({
    includeInactive: filterStatus !== "active",
  });
  const createMutation = useCreateCertificateType();
  const updateMutation = useUpdateCertificateType();
  const archiveMutation = useArchiveCertificateType();
  const restoreMutation = useRestoreCertificateType();
  const { data: usageCount = 0 } = useCertificateTypeUsageCount(selectedType?.id || null);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      if (!businessId) return;
      const { data, error } = await supabase
        .from("certificate_categories")
        .select("id, name")
        .eq("business_id", businessId)
        .order("name");

      if (!error && data) {
        setCategories(data);
      }
    };
    fetchCategories();
  }, [businessId]);

  // Filter types based on status and search
  const filteredTypes = types.filter((type) => {
    // Filter by status
    if (filterStatus === "active" && !type.is_active) return false;
    if (filterStatus === "archived" && type.is_active) return false;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        type.name.toLowerCase().includes(query) ||
        type.description?.toLowerCase().includes(query) ||
        type.category_name?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }

    await createMutation.mutateAsync({
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      category_id: formCategoryId || undefined,
    });

    setCreateDialogOpen(false);
    resetForm();
  };

  const handleEdit = async () => {
    if (!selectedType || !formName.trim()) return;

    await updateMutation.mutateAsync({
      id: selectedType.id,
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      category_id: formCategoryId || undefined,
    });

    setEditDialogOpen(false);
    setSelectedType(null);
    resetForm();
  };

  const handleArchive = async () => {
    if (!selectedType) return;
    await archiveMutation.mutateAsync(selectedType.id);
    setArchiveDialogOpen(false);
    setSelectedType(null);
  };

  const handleRestore = async (type: CertificateType) => {
    await restoreMutation.mutateAsync(type.id);
  };

  const openEditDialog = (type: CertificateType) => {
    setSelectedType(type);
    setFormName(type.name);
    setFormDescription(type.description || "");
    setFormCategoryId(type.category_id);
    setEditDialogOpen(true);
  };

  const openArchiveDialog = (type: CertificateType) => {
    setSelectedType(type);
    setArchiveDialogOpen(true);
  };

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormCategoryId(null);
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
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <TabsList>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setCreateDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Type
        </Button>
      </div>

      {/* Types list grouped by category */}
      {filteredTypes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No certificate types found.</p>
          {filterStatus === "active" && (
            <p className="text-sm mt-1">Create your first type to get started.</p>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {(() => {
            const grouped: Record<string, CertificateType[]> = {};
            for (const type of filteredTypes) {
              const key = type.category_name || "Uncategorized";
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(type);
            }
            const sortedKeys = Object.keys(grouped).sort((a, b) => {
              if (a === "Uncategorized") return 1;
              if (b === "Uncategorized") return -1;
              return a.localeCompare(b);
            });
            for (const key of sortedKeys) {
              grouped[key].sort((a, b) => a.name.localeCompare(b.name));
            }
            return sortedKeys.map((category) => (
              <div key={category}>
                <div className="font-semibold text-xs uppercase text-muted-foreground bg-muted/50 px-3 py-2 border-b">
                  {category}
                </div>
                <div className="divide-y">
                  {grouped[category].map((type) => (
                    <div
                      key={type.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{type.name}</span>
                          {!type.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Archived
                            </Badge>
                          )}
                        </div>
                        {type.description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {type.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(type)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {type.is_active ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openArchiveDialog(type)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRestore(type)}
                            disabled={restoreMutation.isPending}
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filteredTypes.length} type{filteredTypes.length !== 1 ? "s" : ""}{" "}
        {filterStatus !== "all" && `(${filterStatus})`}
      </p>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Certificate Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type-name">Name *</Label>
              <Input
                id="type-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., CSWIP 3.2U Inspector"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-description">Description</Label>
              <Textarea
                id="type-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-category">Category</Label>
              <Select
                value={formCategoryId || "none"}
                onValueChange={(v) => setFormCategoryId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !formName.trim()}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Certificate Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-type-name">Name *</Label>
              <Input
                id="edit-type-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type-description">Description</Label>
              <Textarea
                id="edit-type-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type-category">Category</Label>
              <Select
                value={formCategoryId || "none"}
                onValueChange={(v) => setFormCategoryId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={updateMutation.isPending || !formName.trim()}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Certificate Type</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Are you sure you want to archive "{selectedType?.name}"?
                </p>
                {usageCount > 0 && (
                  <p className="text-warning">
                    This type is currently used by {usageCount} certificate
                    {usageCount !== 1 ? "s" : ""}. Archiving will hide it from
                    future selections but won't affect existing certificates.
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  You can restore archived types at any time.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Archiving...
                </>
              ) : (
                "Archive"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
