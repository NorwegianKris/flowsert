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
import { getPersonnelDocumentUrl, downloadAsBlob } from '@/lib/storageUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PdfViewer } from '@/components/PdfViewer';
import {
  Plus,
  FileText,
  Trash2,
  Download,
  Pencil,
  Tag,
  Lock,
  File,
  Image,
  ExternalLink,
  Calendar,
  Loader2,
  Info,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
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
  isProfileActivated?: boolean;
}

export function PersonnelDocuments({ personnelId, isProfileActivated = true }: PersonnelDocumentsProps) {
  const canAccessDocuments = isProfileActivated;
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [documents, setDocuments] = useState<PersonnelDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditSelectOpen, setIsEditSelectOpen] = useState(false);
  const [isRemoveSelectOpen, setIsRemoveSelectOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<PersonnelDocument | null>(null);
  const [highlightedDoc, setHighlightedDoc] = useState<PersonnelDocument | null>(null);
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
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobRevoke, setBlobRevoke] = useState<(() => void) | null>(null);
  const [imgRotation, setImgRotation] = useState(0);
  const [imgZoom, setImgZoom] = useState(1);

  useEffect(() => {
    fetchData();
  }, [personnelId]);

  // Load document data when document is selected (only if activated)
  useEffect(() => {
    // Cleanup previous blob URL
    if (blobRevoke) {
      blobRevoke();
      setBlobRevoke(null);
    }
    setBlobUrl(null);
    setPdfData(null);
    setSignedUrl(null);
    setImgRotation(0);
    setImgZoom(1);

    if (!selectedDocument?.fileUrl || !canAccessDocuments) {
      return;
    }

    setLoadingUrl(true);

    const loadDocument = async () => {
      try {
        // Extract file path - handle both full URLs (legacy) and relative paths (new)
        let filePath = selectedDocument.fileUrl;
        if (filePath.includes('/storage/v1/object/')) {
          // Legacy full URL format
          const url = new URL(filePath);
          const pathParts = url.pathname.split('/');
          filePath = pathParts.slice(pathParts.indexOf('personnel-documents') + 1).join('/');
        }

        const isPdf = selectedDocument.fileType === 'application/pdf';
        const isImage = selectedDocument.fileType?.startsWith('image/');

        if (isPdf) {
          // Download PDF as ArrayBuffer for PdfViewer
          const { data, error } = await supabase.storage
            .from('personnel-documents')
            .download(filePath);

          if (error) throw error;

          const arrayBuffer = await data.arrayBuffer();
          setPdfData(arrayBuffer);
        } else if (isImage) {
          // Use blob URL for images (bypasses ad blockers)
          const result = await downloadAsBlob('personnel-documents', filePath);
          if (result) {
            setBlobUrl(result.blobUrl);
            setBlobRevoke(() => result.revoke);
          } else {
            // Fallback to signed URL
            const signedUrlResult = await getPersonnelDocumentUrl(selectedDocument.fileUrl);
            setSignedUrl(signedUrlResult);
          }
        } else {
          // For other files, get signed URL
          const signedUrlResult = await getPersonnelDocumentUrl(selectedDocument.fileUrl);
          setSignedUrl(signedUrlResult);
        }
      } catch (error) {
        console.error('Error loading document:', error);
        // Fallback to signed URL
        const signedUrlResult = await getPersonnelDocumentUrl(selectedDocument.fileUrl);
        setSignedUrl(signedUrlResult);
      } finally {
        setLoadingUrl(false);
      }
    };

    loadDocument();

    // Cleanup on unmount
    return () => {
      if (blobRevoke) {
        blobRevoke();
      }
    };
  }, [selectedDocument?.fileUrl, selectedDocument?.fileType, canAccessDocuments]);

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

      // Store the relative path, not public URL (bucket is private)
      const { error: insertError } = await supabase
        .from('personnel_documents')
        .insert({
          personnel_id: personnelId,
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
      // Extract file path - handle both full URLs (legacy) and relative paths (new)
      let filePath = documentToDelete.fileUrl;
      if (filePath.includes('/storage/v1/object/')) {
        // Legacy full URL format
        const url = new URL(filePath);
        const pathParts = url.pathname.split('/');
        filePath = pathParts.slice(pathParts.indexOf('personnel-documents') + 1).join('/');
      }

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
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-500" />
          Documents
        </CardTitle>
        <div className="flex flex-wrap gap-2 justify-end">
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
            onClick={() => {
              if (highlightedDoc) openEditDialog(highlightedDoc);
            }}
            className="gap-1"
            disabled={!highlightedDoc}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!highlightedDoc) return;
              const url = await getPersonnelDocumentUrl(highlightedDoc.fileUrl);
              if (url) {
                const link = document.createElement('a');
                link.href = url;
                link.download = highlightedDoc.name;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } else {
                toast.error('Failed to download document');
              }
            }}
            className="gap-1"
            disabled={!highlightedDoc}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (highlightedDoc) {
                setDocumentToDelete(highlightedDoc);
                setIsDeleteDialogOpen(true);
              }
            }}
            className="gap-1 text-destructive hover:text-destructive"
            disabled={!highlightedDoc}
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tip message for documents section */}
        <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-300 text-sm">
            <strong>Tip:</strong> This section is for supporting documents only (e.g., CV, ID, contracts). 
            Certificates should be uploaded in the <strong>Certificates</strong> section above for proper tracking and expiry notifications.
          </AlertDescription>
        </Alert>

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
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="font-semibold text-white">Document</TableHead>
                  <TableHead className="font-semibold text-white">Category</TableHead>
                  <TableHead className="font-semibold text-white">Date Uploaded</TableHead>
                  <TableHead className="font-semibold text-white">Size</TableHead>
                  <TableHead className="font-semibold text-white">Type</TableHead>
                  <TableHead className="font-semibold text-white w-28">Actions</TableHead>
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
                          {canAccessDocuments ? (
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
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-500 cursor-not-allowed"
                              disabled
                              title="Document access locked - activate profile first"
                            >
                              <Lock className="h-4 w-4" />
                            </Button>
                          )}
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
                      {canAccessDocuments && (
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
                      )}
                    </div>
                  </div>
                  <div className="p-4 flex justify-center">
                    {!canAccessDocuments ? (
                      <div className="flex flex-col items-center gap-4 py-8 text-center">
                        <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30">
                          <Lock className="h-12 w-12 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="space-y-2">
                          <p className="font-medium text-foreground">Document Access Locked</p>
                          <p className="text-sm text-muted-foreground max-w-sm">
                            Activate this profile to view and download documents. 
                            Activated profiles count toward billing.
                          </p>
                        </div>
                      </div>
                    ) : loadingUrl ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : selectedDocument.fileType?.startsWith('image/') && (blobUrl || signedUrl) ? (
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-1 mb-2 p-2 bg-muted/50 rounded-lg">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImgRotation(r => (r - 90 + 360) % 360)} title="Rotate left">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImgRotation(r => (r + 90) % 360)} title="Rotate right">
                            <RotateCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImgZoom(z => Math.max(0.5, z - 0.2))} disabled={imgZoom <= 0.5}>
                            <ZoomOut className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground px-2">{Math.round(imgZoom * 100)}%</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImgZoom(z => Math.min(3, z + 0.2))} disabled={imgZoom >= 3}>
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="overflow-auto max-h-[400px] flex justify-center">
                          <img
                            src={blobUrl || signedUrl || ''}
                            alt={selectedDocument.name}
                            className="object-contain rounded"
                            style={{ transform: `rotate(${imgRotation}deg) scale(${imgZoom})`, transition: 'transform 0.2s' }}
                          />
                        </div>
                      </div>
                    ) : pdfData && selectedDocument.fileType === 'application/pdf' ? (
                      <div className="flex flex-col gap-4 w-full">
                        <PdfViewer pdfData={pdfData} />
                        <div className="flex justify-center">
                          <Button
                            variant="outline"
                            onClick={async () => {
                              const url = await getPersonnelDocumentUrl(selectedDocument.fileUrl);
                              if (url) window.open(url, '_blank');
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                        </div>
                      </div>
                    ) : signedUrl ? (
                      <div className="flex flex-col items-center gap-4 py-8">
                        <File className="h-16 w-16 text-muted-foreground" />
                        <p className="text-muted-foreground">Document available</p>
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
              <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
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
              <Button onClick={handleEditDocument} disabled={!editName.trim() || isSaving}>
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
