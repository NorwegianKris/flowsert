import { useState } from 'react';
import { useWorkerBusinesses } from '@/hooks/useWorkerBusinesses';
import { CompanyCard } from '@/components/CompanyCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2 } from 'lucide-react';

const MAX_VISIBLE = 4;

export function MyCompanies() {
  const { businesses, loading } = useWorkerBusinesses();
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [showAllDialog, setShowAllDialog] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            My Companies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (businesses.length === 0) return null;

  const visibleBusinesses = businesses.slice(0, MAX_VISIBLE);
  const overflowCount = businesses.length - MAX_VISIBLE;

  const renderMiniCard = (biz: typeof businesses[0]) => {
    const initials = biz.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <button
        key={biz.id}
        onClick={() => setSelectedBusinessId(biz.id)}
        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-accent/50 transition-colors text-left"
      >
        <Avatar className="h-9 w-9 border border-border">
          {biz.logo_url ? (
            <AvatarImage src={biz.logo_url} alt={biz.name} />
          ) : (
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials || <Building2 className="h-4 w-4" />}
            </AvatarFallback>
          )}
        </Avatar>
        <span className="text-sm font-medium truncate">{biz.name}</span>
      </button>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            My Companies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {visibleBusinesses.map(renderMiniCard)}
          {overflowCount > 0 && (
            <button
              onClick={() => setShowAllDialog(true)}
              className="w-full p-2 text-center"
            >
              <Badge variant="secondary" className="cursor-pointer">
                +{overflowCount} more
              </Badge>
            </button>
          )}
        </CardContent>
      </Card>

      {/* Company detail dialog */}
      <Dialog open={!!selectedBusinessId} onOpenChange={(open) => !open && setSelectedBusinessId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Company Info</DialogTitle>
            <DialogDescription>View company details and shared documents.</DialogDescription>
          </DialogHeader>
          {selectedBusinessId && (
            <CompanyCard businessId={selectedBusinessId} />
          )}
        </DialogContent>
      </Dialog>

      {/* All companies dialog */}
      <Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>All Companies</DialogTitle>
            <DialogDescription>Select a company to view details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            {businesses.map(renderMiniCard)}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
