import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Trash2,
  Loader2,
  Search,
  Link2,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import {
  useCertificateAliases,
  useReassignAlias,
  useDeleteAlias,
  CertificateAlias,
} from "@/hooks/useCertificateAliases";
import { useCertificateTypes } from "@/hooks/useCertificateTypes";
import { toDisplayTitle } from "@/lib/certificateNormalization";

export function CertificateAliasesManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedAlias, setSelectedAlias] = useState<CertificateAlias | null>(null);
  const [newTypeId, setNewTypeId] = useState<string>("");

  const { data: aliases = [], isLoading } = useCertificateAliases();
  const { data: types = [] } = useCertificateTypes();
  const deleteMutation = useDeleteAlias();
  const reassignMutation = useReassignAlias();

  // Filter aliases based on search
  const filteredAliases = aliases.filter((alias) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      alias.alias_normalized.toLowerCase().includes(query) ||
      alias.alias_raw_example?.toLowerCase().includes(query) ||
      alias.certificate_type_name?.toLowerCase().includes(query)
    );
  });

  // Group by certificate type
  const groupedAliases = filteredAliases.reduce((acc, alias) => {
    const typeId = alias.certificate_type_id;
    if (!acc[typeId]) {
      acc[typeId] = {
        typeName: alias.certificate_type_name || "Unknown Type",
        aliases: [],
      };
    }
    acc[typeId].aliases.push(alias);
    return acc;
  }, {} as Record<string, { typeName: string; aliases: CertificateAlias[] }>);

  const handleDelete = async () => {
    if (!selectedAlias) return;
    await deleteMutation.mutateAsync(selectedAlias.id);
    setDeleteDialogOpen(false);
    setSelectedAlias(null);
  };

  const handleReassign = async () => {
    if (!selectedAlias || !newTypeId) return;
    await reassignMutation.mutateAsync({
      aliasId: selectedAlias.id,
      newTypeId,
    });
    setReassignDialogOpen(false);
    setSelectedAlias(null);
    setNewTypeId("");
  };

  const openDeleteDialog = (alias: CertificateAlias) => {
    setSelectedAlias(alias);
    setDeleteDialogOpen(true);
  };

  const openReassignDialog = (alias: CertificateAlias) => {
    setSelectedAlias(alias);
    setNewTypeId("");
    setReassignDialogOpen(true);
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
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search aliases..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Aliases grouped by type */}
      {Object.keys(groupedAliases).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No aliases found.</p>
          <p className="text-sm mt-1">
            Aliases are created when certificates are mapped to types.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAliases).map(([typeId, { typeName, aliases: typeAliases }]) => (
            <div key={typeId} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">{typeName}</h3>
                <Badge variant="secondary" className="text-xs">
                  {typeAliases.length} alias{typeAliases.length !== 1 ? "es" : ""}
                </Badge>
              </div>
              <div className="border rounded-lg divide-y">
                {typeAliases.map((alias) => (
                  <div
                    key={alias.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {toDisplayTitle(alias.alias_normalized)}
                        </span>
                        <Badge
                          variant={alias.created_by === "admin" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {alias.created_by}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {alias.confidence}%
                        </Badge>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        {alias.alias_raw_example && (
                          <span>Example: "{alias.alias_raw_example}"</span>
                        )}
                        <span>
                          Last seen: {format(new Date(alias.last_seen_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReassignDialog(alias)}
                        className="h-8 text-xs"
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Reassign
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(alias)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filteredAliases.length} alias{filteredAliases.length !== 1 ? "es" : ""} total
      </p>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Alias</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the alias "
              {toDisplayTitle(selectedAlias?.alias_normalized || "")}"? Future
              certificates with this name will no longer auto-match.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reassign Dialog */}
      <AlertDialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reassign Alias</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Move "{toDisplayTitle(selectedAlias?.alias_normalized || "")}" to a
                  different certificate type:
                </p>
                <Select value={newTypeId} onValueChange={setNewTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {types
                      .filter((t) => t.id !== selectedAlias?.certificate_type_id)
                      .map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reassignMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReassign}
              disabled={reassignMutation.isPending || !newTypeId}
            >
              {reassignMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Reassigning...
                </>
              ) : (
                "Reassign"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
