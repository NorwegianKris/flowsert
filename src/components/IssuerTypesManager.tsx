import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Building2,
  Merge,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import {
  useIssuerTypes,
  useCreateIssuerType,
  useUpdateIssuerType,
  useArchiveIssuerType,
  useRestoreIssuerType,
  useIssuerTypeUsageCount,
  IssuerType,
} from "@/hooks/useIssuerTypes";
import { IssuerMergingPane } from "@/components/IssuerMergingPane";

type FilterStatus = "active" | "archived" | "all";

export function IssuerTypesManager() {
  const [activeView, setActiveView] = useState<"merge" | "manage">("merge");

  return (
    <div className="space-y-4">
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "merge" | "manage")}>
        <TabsList>
          <TabsTrigger value="merge" className="gap-2">
            <Merge className="h-4 w-4" />
            <span className="hidden sm:inline">Group Issuers</span>
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Manage Issuers</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="merge" className="mt-4">
          <IssuerMergingPane />
        </TabsContent>

        <TabsContent value="manage" className="mt-4">
          <IssuersManageList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IssuersManageList() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("active");
  const [searchQuery, setSearchQuery] = useState("");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedIssuer, setSelectedIssuer] = useState<IssuerType | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const { data: issuers = [], isLoading } = useIssuerTypes({
    includeInactive: filterStatus !== "active",
  });
  const createMutation = useCreateIssuerType();
  const updateMutation = useUpdateIssuerType();
  const archiveMutation = useArchiveIssuerType();
  const restoreMutation = useRestoreIssuerType();
  const { data: usageCount = 0 } = useIssuerTypeUsageCount(selectedIssuer?.id || null);

  const filteredIssuers = issuers.filter((issuer) => {
    if (filterStatus === "active" && !issuer.is_active) return false;
    if (filterStatus === "archived" && issuer.is_active) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        issuer.name.toLowerCase().includes(query) ||
        issuer.description?.toLowerCase().includes(query)
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
    });

    setCreateDialogOpen(false);
    resetForm();
  };

  const handleEdit = async () => {
    if (!selectedIssuer || !formName.trim()) return;

    await updateMutation.mutateAsync({
      id: selectedIssuer.id,
      name: formName.trim(),
      description: formDescription.trim() || undefined,
    });

    setEditDialogOpen(false);
    setSelectedIssuer(null);
    resetForm();
  };

  const handleArchive = async () => {
    if (!selectedIssuer) return;
    await archiveMutation.mutateAsync(selectedIssuer.id);
    setArchiveDialogOpen(false);
    setSelectedIssuer(null);
  };

  const handleRestore = async (issuer: IssuerType) => {
    await restoreMutation.mutateAsync(issuer.id);
  };

  const openEditDialog = (issuer: IssuerType) => {
    setSelectedIssuer(issuer);
    setFormName(issuer.name);
    setFormDescription(issuer.description || "");
    setEditDialogOpen(true);
  };

  const openArchiveDialog = (issuer: IssuerType) => {
    setSelectedIssuer(issuer);
    setArchiveDialogOpen(true);
  };

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search issuers..."
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
          New Issuer
        </Button>
      </div>

      {filteredIssuers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No issuers found.</p>
          {filterStatus === "active" && (
            <p className="text-sm mt-1">Create your first issuer to get started.</p>
          )}
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {filteredIssuers.map((issuer) => (
            <div
              key={issuer.id}
              className="flex items-center justify-between p-4 hover:bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{issuer.name}</span>
                  {!issuer.is_active && (
                    <Badge variant="secondary" className="text-xs">
                      Archived
                    </Badge>
                  )}
                </div>
                {issuer.description && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {issuer.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(issuer)}
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {issuer.is_active ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openArchiveDialog(issuer)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRestore(issuer)}
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
      )}

      <p className="text-xs text-muted-foreground">
        {filteredIssuers.length} issuer{filteredIssuers.length !== 1 ? "s" : ""}{" "}
        {filterStatus !== "all" && `(${filterStatus})`}
      </p>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Issuer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="issuer-name">Name *</Label>
              <Input
                id="issuer-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., DNV GL"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuer-description">Description</Label>
              <Textarea
                id="issuer-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
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
            <DialogTitle>Edit Issuer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-issuer-name">Name *</Label>
              <Input
                id="edit-issuer-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-issuer-description">Description</Label>
              <Textarea
                id="edit-issuer-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
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
            <AlertDialogTitle>Archive Issuer</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Are you sure you want to archive "{selectedIssuer?.name}"?
                </p>
                {usageCount > 0 && (
                  <p className="text-warning">
                    This issuer is currently used by {usageCount} certificate
                    {usageCount !== 1 ? "s" : ""}. Archiving will hide it from
                    future selections but won't affect existing certificates.
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  You can restore archived issuers at any time.
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
