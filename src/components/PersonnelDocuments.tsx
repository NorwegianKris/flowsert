import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { getPersonnelDocumentUrl } from '@/lib/storageUtils';
import {
  Plus,
  FileText,
  Trash2,
  Download,
  Pencil,
  Tag,
  File,
  Image,
  ExternalLink,
  Calendar,
  Loader2,
} from 'lucide-react';

interface DocumentCategory {
  id: string;
  name: string;
  businessId: string;
}

interface PersonnelDocument {
  id: string;
  personnelId: string;
  categoryId: string | null;
  name: string;
  fileUrl: string;
  fileSize: number | null;
  fileType: string | null;
  createdAt: string;
}

interface PersonnelDocumentsProps {
  personnelId: string;
}

export function PersonnelDocuments({ personnelId }: PersonnelDocumentsProps) {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [documents, setDocuments] = useState<PersonnelDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditSelectOpen, setIsEditSelectOpen] = useState(false);
  const [isRemoveSelectOpen, setIsRemoveSelectOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<PersonnelDocument | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<PersonnelDocument | null>(null);
  const [documentToEdit, setDocumentToEdit] = useState<PersonnelDocument | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [documentName, setDocumentName] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [personnelId]);

  // Load signed URL when document is selected
  useEffect(() => {
    if (selectedDocument?.fileUrl) {
      setLoadingUrl(true);
      getPersonnelDocumentUrl(selectedDocument.fileUrl)
        .then(url => setSignedUrl(url))
        .finally(() => setLoadingUrl(false));
    } else {
      setSignedUrl(null);
    }
  }, [selectedDocument?.fileUrl]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [categoriesRes, documentsRes] = await Promise.all([
        supabase
          .from('document_categories')
          .select('*')
          .order('name'),
        supabase
          .from('personnel_documents')
          .select('*')
          .eq('personnel_id', personnelId)
          .order('created_at', { ascending: false }),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (documentsRes.error) throw documentsRes.error;

      setCategories(
        categoriesRes.data.map((c) => ({
          id: c.id,
          name: c.name,
          businessId: c.business_id,
        }))
      );

      setDocuments(
        documentsRes.data.map((d) => ({
          id: d.id,
          personnelId: d.personnel_id,
          categoryId: d.category_id,
          name: d.name,
          fileUrl: d.file_url,
          fileSize: d.file_size,
          fileType: d.file_type,
          createdAt: d.created_at,
        }))
      );
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setDocumentName(file.name.split('.').slice(0, -1).join('.') || file.name);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${personnelId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('personnel-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('personnel-documents')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('personnel_documents')
        .insert({
          personnel_id: personnelId,
          category_id: selectedCategory && selectedCategory !== 'uncategorized' ? selectedCategory : null,
          name: documentName || selectedFile.name,
          file_url: urlData.publicUrl,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
        });

      if (insertError) throw insertError;

      toast.success('Document uploaded successfully');
      setIsUploadOpen(false);
      resetUploadForm();
      fetchData();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };


  const openEditDialog = (doc: PersonnelDocument) => {
    setDocumentToEdit(doc);
    setEditName(doc.name);
    setEditCategory(doc.categoryId || 'uncategorized');
    setIsEditOpen(true);
  };

  const handleEditDocument = async () => {
    if (!documentToEdit || !editName.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('personnel_documents')
        .update({
          name: editName.trim(),
          category_id: editCategory && editCategory !== 'uncategorized' ? editCategory : null,
        })
        .eq('id', documentToEdit.id);

      if (error) throw error;

      toast.success('Document updated');
      setIsEditOpen(false);
      setDocumentToEdit(null);
      fetchData();
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to update document');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      // Extract file path from URL
      const url = new URL(documentToDelete.fileUrl);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(pathParts.indexOf('personnel-documents') + 1).join('/');

      // Delete from storage
      await supabase.storage.from('personnel-documents').remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from('personnel_documents')
        .delete()
        .eq('id', documentToDelete.id);

      if (error) throw error;

      toast.success('Document deleted');
      setIsDeleteDialogOpen(false);
      setDocumentToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setSelectedCategory('');
    setDocumentName('');
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized';
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown';
  };

  const filteredDocuments = filterCategory === 'all'
    ? documents
    : filterCategory === 'uncategorized'
    ? documents.filter((d) => !d.categoryId)
    : documents.filter((d) => d.categoryId === filterCategory);

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-500" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-500" />
          Documents
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditSelectOpen(true)}
            className="gap-1"
            disabled={documents.length === 0}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRemoveSelectOpen(true)}
            className="gap-1 text-destructive hover:text-destructive"
            disabled={documents.length === 0}
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter by category */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Filter:</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All documents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All documents</SelectItem>
                <SelectItem value="uncategorized">Uncategorized</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Documents Table */}
        {filteredDocuments.length > 0 ? (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold">Document</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Date Uploaded</TableHead>
                  <TableHead className="font-semibold">Size</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const isImage = doc.fileType?.startsWith('image/');
                  
                  return (
                    <TableRow 
                      key={doc.id} 
                      className="group cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isImage ? (
                            <Image className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <File className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.categoryId ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            <Tag className="h-3 w-3" />
                            {getCategoryName(doc.categoryId)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Uncategorized</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(parseISO(doc.createdAt), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatFileSize(doc.fileSize)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.fileType ? doc.fileType.split('/')[1]?.toUpperCase() || doc.fileType : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const url = await getPersonnelDocumentUrl(doc.fileUrl);
                              if (url) window.open(url, '_blank');
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(doc);
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDocumentToDelete(doc);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-3">📁</div>
            <p className="text-sm">
              {filterCategory === 'all'
                ? 'No documents uploaded yet'
                : 'No documents in this category'}
            </p>
            <p className="text-xs mt-1">Upload contracts, ID documents, or other files</p>
          </div>
        )}

        {/* Document Preview Dialog */}
        <Dialog open={!!selectedDocument} onOpenChange={(open) => !open && setSelectedDocument(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Document Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedDocument && (
              <div className="space-y-6">
                {/* Document Preview */}
                <div className="border rounded-lg overflow-hidden bg-muted/20">
                  <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                    <span className="text-sm font-medium">Document Preview</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDocument(null);
                          openEditDialog(selectedDocument);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (signedUrl) window.open(signedUrl, '_blank');
                        }}
                        disabled={!signedUrl || loadingUrl}
                      >
                        {loadingUrl ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4 mr-2" />
                        )}
                        Open Full Size
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 flex justify-center">
                    {loadingUrl ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : signedUrl && selectedDocument.fileType?.startsWith('image/') ? (
                      <img
                        src={signedUrl}
                        alt={selectedDocument.name}
                        className="max-h-[400px] object-contain rounded"
                      />
                  ) : signedUrl && selectedDocument.fileType === 'application/pdf' ? (
                    <iframe
                      src={signedUrl}
                      title={selectedDocument.name}
                      className="w-full h-[500px] rounded border-0"
                    />
                    ) : (
                      <div className="flex flex-col items-center gap-4 py-8">
                        <File className="h-16 w-16 text-muted-foreground" />
                        <p className="text-muted-foreground">Document available</p>
                        <Button
                          variant="outline"
                          onClick={() => signedUrl && window.open(signedUrl, '_blank')}
                          disabled={!signedUrl}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Download Document
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                    <FileText className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Document Name</div>
                      <div className="font-medium">{selectedDocument.name}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                    <Tag className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Category</div>
                      <div className="font-medium">{getCategoryName(selectedDocument.categoryId)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                    <Calendar className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Date Uploaded</div>
                      <div className="font-medium">
                        {format(parseISO(selectedDocument.createdAt), 'dd MMMM yyyy')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                    <File className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">File Size</div>
                      <div className="font-medium">{formatFileSize(selectedDocument.fileSize)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 col-span-2">
                    <File className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">File Type</div>
                      <div className="font-medium">{selectedDocument.fileType || 'Unknown'}</div>
                    </div>
                  </div>
                </div>

                {/* Document ID */}
                <div className="text-center text-xs text-muted-foreground border-t pt-4">
                  Document ID: {selectedDocument.id}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Upload Dialog */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
              </div>
              {selectedFile && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="docName">Document Name</Label>
                    <Input
                      id="docName"
                      value={documentName}
                      onChange={(e) => setDocumentName(e.target.value)}
                      placeholder="Enter document name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category (Optional)</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uncategorized">Uncategorized</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button variant="active" onClick={handleUpload} disabled={!selectedFile || isUploading}>
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Document Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Document Name</Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter document name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCategory">Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uncategorized">Uncategorized</SelectItem>
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
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button variant="active" onClick={handleEditDocument} disabled={!editName.trim() || isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Select Dialog */}
        <Dialog open={isEditSelectOpen} onOpenChange={setIsEditSelectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Document to Edit</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-4 max-h-[400px] overflow-y-auto">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    setIsEditSelectOpen(false);
                    openEditDialog(doc);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <File className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getCategoryName(doc.categoryId)} • {format(parseISO(doc.createdAt), 'dd MMM yyyy')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditSelectOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Select Dialog */}
        <Dialog open={isRemoveSelectOpen} onOpenChange={setIsRemoveSelectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Document to Remove</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-4 max-h-[400px] overflow-y-auto">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    setIsRemoveSelectOpen(false);
                    setDocumentToDelete(doc);
                    setIsDeleteDialogOpen(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/10 transition-colors text-left group"
                >
                  <File className="h-5 w-5 text-muted-foreground group-hover:text-destructive" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate group-hover:text-destructive">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getCategoryName(doc.categoryId)} • {format(parseISO(doc.createdAt), 'dd MMM yyyy')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRemoveSelectOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{documentToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteDocument} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
