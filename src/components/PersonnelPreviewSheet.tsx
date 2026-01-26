import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Personnel } from '@/types';
import { MapPin, Mail, Phone, Award, FileText, User, Building2, Eye, CalendarDays, Loader2, Briefcase } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { PdfViewer } from '@/components/PdfViewer';
import { cn } from '@/lib/utils';
import { getSignedUrl } from '@/lib/storageUtils';

interface PersonnelPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel: Personnel | null;
}

interface PersonnelDocument {
  id: string;
  name: string;
  fileUrl: string;
  fileType?: string;
}

interface AvailabilityRecord {
  id: string;
  date: string;
  status: string;
  notes?: string;
}

interface PreviewState {
  name: string;
  loading: boolean;
  data: ArrayBuffer | null;
  error: string | null;
}

interface PersonnelDocument {
  id: string;
  name: string;
  fileUrl: string;
  fileType?: string;
}

interface AvailabilityRecord {
  id: string;
  date: string;
  status: string;
  notes?: string;
}

export function PersonnelPreviewSheet({ open, onOpenChange, personnel }: PersonnelPreviewSheetProps) {
  const [documents, setDocuments] = useState<PersonnelDocument[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRecord[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<PreviewState | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (open && personnel?.id) {
      fetchDocuments();
      fetchAvailability();
    }
  }, [open, personnel?.id]);

  const fetchDocuments = async () => {
    if (!personnel?.id) return;
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from('personnel_documents')
        .select('id, name, file_url, file_type')
        .eq('personnel_id', personnel.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data?.map(d => ({
        id: d.id,
        name: d.name,
        fileUrl: d.file_url,
        fileType: d.file_type || undefined,
      })) || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchAvailability = async () => {
    if (!personnel?.id) return;
    setLoadingAvailability(true);
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(addMonths(currentMonth, 2));
      
      const { data, error } = await supabase
        .from('availability')
        .select('id, date, status, notes')
        .eq('personnel_id', personnel.id)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'));

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handlePreviewDocument = async (doc: { fileUrl: string; name: string }, bucket: string) => {
    setPreviewDoc({ name: doc.name, loading: true, data: null, error: null });
    try {
      const signedUrl = await getSignedUrl(bucket, doc.fileUrl);
      if (signedUrl) {
        const response = await fetch(signedUrl);
        if (!response.ok) throw new Error('Failed to fetch document');
        const arrayBuffer = await response.arrayBuffer();
        // Clone the ArrayBuffer to prevent DataCloneError
        const clonedBuffer = arrayBuffer.slice(0);
        setPreviewDoc({ name: doc.name, loading: false, data: clonedBuffer, error: null });
      }
    } catch (error) {
      console.error('Error loading document:', error);
      setPreviewDoc(prev => prev ? { ...prev, loading: false, error: 'Failed to load document' } : null);
    }
  };

  if (!personnel) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getCertificateStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: 'valid', label: 'No expiry' };
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { status: 'expired', label: 'Expired' };
    if (daysUntilExpiry <= 90) return { status: 'expiring', label: `${daysUntilExpiry}d left` };
    return { status: 'valid', label: 'Valid' };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expired': return 'bg-red-500/10 text-red-600 border-red-500/30';
      case 'expiring': return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      default: return 'bg-green-500/10 text-green-600 border-green-500/30';
    }
  };

  const validCertificates = personnel.certificates?.filter(c => {
    if (!c.expiryDate) return true;
    return new Date(c.expiryDate) >= new Date();
  }) || [];

  // Calendar modifiers matching AvailabilityCalendar
  const modifiers = {
    available: availability
      .filter((a) => a.status === 'available')
      .map((a) => new Date(a.date)),
    unavailable: availability
      .filter((a) => a.status === 'unavailable')
      .map((a) => new Date(a.date)),
    partial: availability
      .filter((a) => a.status === 'partial' || a.status === 'tentative')
      .map((a) => new Date(a.date)),
  };

  const modifiersStyles = {
    available: {
      backgroundColor: 'hsl(142 76% 36%)',
      color: 'white',
      borderRadius: '50%',
    },
    unavailable: {
      backgroundColor: 'hsl(0 72% 50%)',
      color: 'white',
      borderRadius: '50%',
    },
    partial: {
      backgroundColor: 'hsl(38 92% 50%)',
      color: 'white',
      borderRadius: '50%',
    },
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader className="pb-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={personnel.avatarUrl} alt={personnel.name} />
                <AvatarFallback className="text-lg">{getInitials(personnel.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl">{personnel.name}</SheetTitle>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {personnel.isJobSeeker ? (
                    <Badge className="bg-violet-100 text-violet-700 border-violet-200">Job Seeker</Badge>
                  ) : personnel.category === 'freelancer' ? (
                    <Badge variant="secondary">Freelancer</Badge>
                  ) : (
                    <Badge variant="default">Fixed Employee</Badge>
                  )}
                  {personnel.department && (
                    <Badge variant="outline" className="text-xs">
                      {personnel.department}
                    </Badge>
                  )}
                </div>
                
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-200px)] pr-4">
            <div className="space-y-6">
              {/* Bio */}
              {personnel.bio && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    About
                  </h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    {personnel.bio}
                  </p>
                </div>
              )}

              {/* Role */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-indigo-500" />
                  Role
                </h4>
                <p className="text-sm text-muted-foreground">
                  {personnel.role || 'No role specified'}
                </p>
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">
                  Contact
                </h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{personnel.email}</span>
                  </div>
                  {personnel.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{personnel.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{personnel.location}</span>
                  </div>
                </div>
              </div>

              {/* Details */}
              {(personnel.nationality || personnel.language) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Details
                  </h4>
                  <div className="grid gap-2 text-sm">
                    {personnel.nationality && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Nationality</span>
                        <span>{personnel.nationality}</span>
                      </div>
                    )}
                    {personnel.language && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Language</span>
                        <span>{personnel.language}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Certificates */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  Certificates
                  {validCertificates.length > 0 && (
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {validCertificates.length} valid
                    </Badge>
                  )}
                </h4>
                {personnel.certificates && personnel.certificates.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-[200px] overflow-y-auto">
                      <div className="space-y-1 p-2">
                        {personnel.certificates.map((cert) => {
                          const { status, label } = getCertificateStatus(cert.expiryDate);
                          return (
                            <div 
                              key={cert.id} 
                              className={`flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm ${cert.documentUrl ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
                              onClick={() => cert.documentUrl && handlePreviewDocument(
                                { fileUrl: cert.documentUrl, name: cert.name },
                                'certificate-documents'
                              )}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{cert.name}</p>
                                {cert.expiryDate && (
                                  <p className="text-xs text-muted-foreground">
                                    Expires: {format(new Date(cert.expiryDate), 'MMM d, yyyy')}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                <Badge variant="outline" className={`text-[10px] ${getStatusColor(status)}`}>
                                  {label}
                                </Badge>
                                {cert.documentUrl && (
                                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No certificates on file</p>
                )}
              </div>

              {/* Documents */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Documents
                  {documents.length > 0 && (
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {documents.length}
                    </Badge>
                  )}
                </h4>
                {loadingDocs ? (
                  <p className="text-sm text-muted-foreground">Loading documents...</p>
                ) : documents.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-[150px] overflow-y-auto">
                      <div className="space-y-1 p-2">
                        {documents.map((doc) => (
                          <div 
                            key={doc.id} 
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handlePreviewDocument(
                              { fileUrl: doc.fileUrl, name: doc.name },
                              'personnel-documents'
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{doc.name}</p>
                              {doc.fileType && (
                                <p className="text-xs text-muted-foreground uppercase">{doc.fileType}</p>
                              )}
                            </div>
                            <Eye className="h-3.5 w-3.5 text-muted-foreground ml-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No documents on file</p>
                )}
              </div>

              {/* Availability Calendar */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Availability
                </h4>
                {loadingAvailability ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="border rounded-lg border-border">
                    <div className="flex flex-wrap gap-3 p-3 border-b border-border">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="h-3 w-3 rounded-full bg-[hsl(142_76%_36%)]" />
                        <span className="text-muted-foreground">Available</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="h-3 w-3 rounded-full bg-[hsl(38_92%_50%)]" />
                        <span className="text-muted-foreground">Partial</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="h-3 w-3 rounded-full bg-[hsl(0_72%_50%)]" />
                        <span className="text-muted-foreground">Unavailable</span>
                      </div>
                    </div>
                    <Calendar
                      mode="single"
                      month={currentMonth}
                      onMonthChange={setCurrentMonth}
                      modifiers={modifiers}
                      modifiersStyles={modifiersStyles}
                      className="p-3 pointer-events-auto w-full"
                      classNames={{
                        months: "flex flex-col w-full",
                        month: "space-y-4 w-full",
                        caption: "flex justify-center pt-1 relative items-center",
                        caption_label: "text-sm font-medium",
                        nav: "space-x-1 flex items-center",
                        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input",
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex w-full",
                        head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] text-center",
                        row: "flex w-full mt-2",
                        cell: "flex-1 h-9 text-sm p-0 relative focus-within:relative focus-within:z-20 flex items-center justify-center",
                        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-full inline-flex items-center justify-center",
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                        day_today: "bg-accent text-accent-foreground",
                        day_outside: "text-muted-foreground opacity-50",
                        day_disabled: "text-muted-foreground opacity-50",
                        day_hidden: "invisible",
                      }}
                      numberOfMonths={1}
                    />
                  </div>
                )}
              </div>

              {/* Profile metadata */}
              <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
                {personnel.profileCode && (
                  <div className="flex justify-between">
                    <span>Profile Code</span>
                    <span className="font-mono">{personnel.profileCode}</span>
                  </div>
                )}
                {personnel.lastLoginAt && (
                  <div className="flex justify-between">
                    <span>Last login</span>
                    <span>{format(new Date(personnel.lastLoginAt), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Back to Project
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{previewDoc?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden h-[70vh]">
            {previewDoc?.loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : previewDoc?.error ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {previewDoc.error}
              </div>
            ) : previewDoc?.data ? (
              <PdfViewer pdfData={previewDoc.data} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
