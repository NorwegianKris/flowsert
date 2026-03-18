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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
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
import { RescanCertificatesTool } from "@/components/RescanCertificatesTool";
import { DocumentPreviewDialog, DocumentPreviewMetadata } from "@/components/DocumentPreviewDialog";
import { getCertificateStatus, getDaysUntilExpiry, formatExpiryText } from "@/lib/certificateUtils";
import { cn } from "@/lib/utils";

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
      <RescanCertificatesTool />
      
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
function TypeCertificatesList({ typeId }: { typeId: string }) {
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    title: string;
    metadata: DocumentPreviewMetadata;
  } | null>(null);

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ["type-certificates", typeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select(
          "id, name, expiry_date, document_url, date_of_issue, place_of_issue, issuing_authority, personnel:personnel_id(id, name)"
        )
        .eq("certificate_type_id", typeId)
        .order("expiry_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-3 px-1">
        No certificates uploaded for this type yet.
      </p>
    );
  }

  return (
    <>
      <div className="divide-y border rounded-md">
        {certificates.map((cert: any) => {
          const personnelName =
            cert.personnel?.name || "Unknown worker";
          const status = getCertificateStatus(cert.expiry_date);
          const days = getDaysUntilExpiry(cert.expiry_date);
          const expiryText = formatExpiryText(days);

          return (
            <button
              key={cert.id}
              type="button"
              className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-accent/50 transition-colors text-sm"
              onClick={() => {
                if (cert.document_url) {
                  setPreviewDoc({
                    url: cert.document_url,
                    title: cert.name,
                    metadata: {
                      personnelName,
                      dateOfIssue: cert.date_of_issue,
                      expiryDate: cert.expiry_date,
                      placeOfIssue: cert.place_of_issue,
                      issuingAuthority: cert.issuing_authority,
                    },
                  });
                } else {
                  toast.info("No document attached to this certificate.");
                }
              }}
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium flex-1 min-w-0">
                {personnelName}
              </span>
              <span className="truncate text-muted-foreground hidden sm:block max-w-[200px]">
                {cert.name}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs shrink-0",
                  status === "valid" && "border-green-500 text-green-700 dark:text-green-400",
                  status === "expiring" && "border-yellow-500 text-yellow-700 dark:text-yellow-400",
                  status === "expired" && "border-destructive text-destructive"
                )}
              >
                {status === "valid"
                  ? "Valid"
                  : status === "expiring"
                  ? "Expiring soon"
                  : "Expired"}
              </Badge>
            </button>
          );
        })}
      </div>

      <DocumentPreviewDialog
        open={!!previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        documentUrl={previewDoc?.url || null}
        title={previewDoc?.title}
        metadata={previewDoc?.metadata}
      />
    </>
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
              className="pl-9 w-[200px] bg-white dark:bg-card"
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
                <Accordion type="multiple" className="divide-y">
                  {grouped[category].map((type) => (
                    <AccordionItem key={type.id} value={type.id} className="border-b-0">
                      <div className="flex items-center bg-card hover:bg-accent/40 transition-colors [&>h3]:flex-1 [&>h3]:min-w-0">
                        <AccordionTrigger className="flex-1 min-w-0 px-4 py-3 hover:no-underline">
                          <div className="flex items-center gap-2 min-w-0 text-left">
                            <span className="font-medium truncate">{type.name}</span>
                            {!type.is_active && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                Archived
                              </Badge>
                            )}
                            {type.description && (
                              <span className="text-sm text-muted-foreground truncate hidden sm:inline">
                                — {type.description}
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-1 pr-4 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); openEditDialog(type); }}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {type.is_active ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); openArchiveDialog(type); }}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); handleRestore(type); }}
                              disabled={restoreMutation.isPending}
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <AccordionContent className="px-4 pb-3">
                        <TypeCertificatesList typeId={type.id} />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
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
