import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { getProjectDocumentUrl, downloadAsBlob, getSignedUrl, extractStoragePath } from '@/lib/storageUtils';
import { PdfViewer } from '@/components/PdfViewer';
import {
  Upload,
  FileText,
  Folder,
  Plus,
  Trash2,
  Download,
  FolderPlus,
  X,
  File,
  Image,
  Loader2,
  Building2,
} from 'lucide-react';

interface DocumentCategory {
  id: string;
  name: string;
  projectId: string;
}

interface ProjectDocument {
  id: string;
  projectId: string;
  categoryId: string | null;
  name: string;
  fileUrl: string;
  fileSize: number | null;
  fileType: string | null;
  createdAt: string;
}

interface BusinessDocument {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number | null;
  fileType: string | null;
  createdAt: string;
}

interface ProjectDocumentsProps {
  projectId: string;
  businessId?: string;
}

export function ProjectDocuments({ projectId, businessId }: ProjectDocumentsProps) {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<ProjectDocument | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [documentName, setDocumentName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedDocument, setSelectedDocument] = useState<ProjectDocument | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobRevoke, setBlobRevoke] = useState<(() => void) | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [businessDocuments, setBusinessDocuments] = useState<BusinessDocument[]>([]);

  // Load document data when document is selected
  useEffect(() => {
    // Cleanup previous blob URL
    if (blobRevoke) {
      blobRevoke();
      setBlobRevoke(null);
    }
    setBlobUrl(null);
    setPdfData(null);
    setSignedUrl(null);

    if (!selectedDocument?.fileUrl) {
      return;
    }

    setLoadingDocument(true);

    const loadDocument = async () => {
      try {
        // Extract file path — handle both full URLs (legacy) and relative paths (new)
        const filePath = extractStoragePath(selectedDocument.fileUrl, 'project-documents');

        const isPdf = selectedDocument.fileType === 'application/pdf';
        const isImage = selectedDocument.fileType?.startsWith('image/');

        if (isPdf) {
          // Download PDF as ArrayBuffer for PdfViewer
          const { data, error } = await supabase.storage
            .from('project-documents')
            .download(filePath);

          if (error) throw error;

          const arrayBuffer = await data.arrayBuffer();
          setPdfData(arrayBuffer);
        } else if (isImage) {
          // Use blob URL for images (bypasses ad blockers)
          const result = await downloadAsBlob('project-documents', filePath);
          if (result) {
            setBlobUrl(result.blobUrl);
            setBlobRevoke(() => result.revoke);
          } else {
            // Fallback to signed URL
            const signedUrlResult = await getProjectDocumentUrl(selectedDocument.fileUrl);
            setSignedUrl(signedUrlResult);
          }
        } else {
          // For other files, get signed URL
          const signedUrlResult = await getProjectDocumentUrl(selectedDocument.fileUrl);
          setSignedUrl(signedUrlResult);
        }
      } catch (error) {
        console.error('Error loading document:', error);
        // Fallback to signed URL
        const signedUrlResult = await getProjectDocumentUrl(selectedDocument.fileUrl);
        setSignedUrl(signedUrlResult);
      } finally {
        setLoadingDocument(false);
      }
    };

    loadDocument();

    // Cleanup on unmount
    return () => {
      if (blobRevoke) {
        blobRevoke();
      }
    };
  }, [selectedDocument?.fileUrl, selectedDocument?.fileType]);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  useEffect(() => {
    if (businessId) fetchBusinessDocuments();
  }, [businessId]);

  const fetchBusinessDocuments = async () => {
    if (!businessId) return;
    try {
      const { data, error } = await supabase
        .from('business_documents')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const docsWithUrls = await Promise.all(
        (data || []).map(async (doc) => {
          const signed = await getSignedUrl('business-documents', doc.file_url);
          return {
            id: doc.id,
            name: doc.name,
            fileUrl: signed || doc.file_url,
            fileSize: doc.file_size,
            fileType: doc.file_type,
            createdAt: doc.created_at,
          } as BusinessDocument;
        })
      );
      setBusinessDocuments(docsWithUrls);
    } catch (error) {
      console.error('Error fetching business documents:', error);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [categoriesRes, documentsRes] = await Promise.all([
        supabase
          .from('project_document_categories')
          .select('*')
          .eq('project_id', projectId)
          .order('name'),
        supabase
          .from('project_documents')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (documentsRes.error) throw documentsRes.error;

      setCategories(
        categoriesRes.data.map((c) => ({
          id: c.id,
          name: c.name,
          projectId: c.project_id,
        }))
      );

      setDocuments(
        documentsRes.data.map((d) => ({
          id: d.id,
          projectId: d.project_id,
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
      const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('project-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('project_documents')
        .insert({
          project_id: projectId,
          category_id: selectedCategory && selectedCategory !== 'uncategorized' ? selectedCategory : null,
          name: documentName || selectedFile.name,
          file_url: fileName,
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

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      const { error } = await supabase
        .from('project_document_categories')
        .insert({
          project_id: projectId,
          name: newCategoryName.trim(),
        });

      if (error) throw error;

      toast.success('Category created');
      setIsCategoryDialogOpen(false);
      setNewCategoryName('');
      fetchData();
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      // Extract file path — handle both full URLs (legacy) and relative paths (new)
      const filePath = extractStoragePath(documentToDelete.fileUrl, 'project-documents');

      // Delete from storage
      await supabase.storage.from('project-documents').remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from('project_documents')
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setIsUploadOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCategoryDialogOpen(true)}
          className="gap-2"
        >
          <FolderPlus className="h-4 w-4" />
          New Category
        </Button>
      </div>

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

      {/* Company Documents Section */}
      {businessDocuments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span className="font-medium">Company Documents</span>
          </div>
          {businessDocuments.map((doc) => {
            const isImage = doc.fileType?.startsWith('image/');
            return (
              <div
                key={`biz-${doc.id}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors group cursor-pointer"
                onClick={() => doc.fileUrl && window.open(doc.fileUrl, '_blank')}
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  {isImage ? (
                    <Image className="h-5 w-5 text-primary" />
                  ) : (
                    <FileText className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="h-3 w-3 mr-1" />
                      Company
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (doc.fileUrl) window.open(doc.fileUrl, '_blank');
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Documents List */}
      {filteredDocuments.length > 0 ? (
        <div className="space-y-2">
          {filteredDocuments.map((doc) => {
            const isImage = doc.fileType?.startsWith('image/');
            
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group cursor-pointer"
                onClick={() => setSelectedDocument(doc)}
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  {isImage ? (
                    <Image className="h-5 w-5 text-primary" />
                  ) : (
                    <FileText className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>•</span>
                    <Badge variant="secondary" className="text-xs">
                      <Folder className="h-3 w-3 mr-1" />
                      {getCategoryName(doc.categoryId)}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const url = await getProjectDocumentUrl(doc.fileUrl);
                      if (url) window.open(url, '_blank');
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDocumentToDelete(doc);
                      setIsDeleteDialogOpen(true);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📄</div>
          <p className="text-muted-foreground text-sm">
            {filterCategory === 'all'
              ? 'No documents uploaded yet'
              : 'No documents in this category'}
          </p>
        </div>
      )}

      {/* Document Preview Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={(open) => !open && setSelectedDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {selectedDocument?.name || 'Document Preview'}
            </DialogTitle>
            <DialogDescription>
              {selectedDocument?.fileType ? `${selectedDocument.fileType} • ` : ''}
              {selectedDocument && formatFileSize(selectedDocument.fileSize)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-4">
              {/* Document Preview */}
              <div className="border rounded-lg overflow-hidden bg-muted/20">
                <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                  <span className="text-sm font-medium">Document Preview</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const url = await getProjectDocumentUrl(selectedDocument.fileUrl);
                      if (url) window.open(url, '_blank');
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                <div className="p-4 flex justify-center">
                  {loadingDocument ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : selectedDocument.fileType?.startsWith('image/') && (blobUrl || signedUrl) ? (
                    <img
                      src={blobUrl || signedUrl || ''}
                      alt={selectedDocument.name}
                      className="max-h-[400px] object-contain rounded"
                    />
                  ) : pdfData && selectedDocument.fileType === 'application/pdf' ? (
                    <div className="flex flex-col gap-4 w-full">
                      <PdfViewer pdfData={pdfData} />
                    </div>
                  ) : signedUrl ? (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <File className="h-16 w-16 text-muted-foreground" />
                      <p className="text-muted-foreground">Document available for download</p>
                      <Button
                        variant="outline"
                        onClick={() => window.open(signedUrl, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Document
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <File className="h-16 w-16 text-muted-foreground" />
                      <p className="text-muted-foreground">Loading document...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Document Details */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">
                  <Folder className="h-3 w-3 mr-1" />
                  {getCategoryName(selectedDocument.categoryId)}
                </Badge>
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
            <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Contracts, Reports, Plans"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory}>Create</Button>
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
    </div>
  );
}