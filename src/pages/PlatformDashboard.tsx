import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Building2, LogOut, Plus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import dashboardBg from '@/assets/dashboard-bg-pattern.png';
import CreateBusinessDialog from '@/components/CreateBusinessDialog';
import BusinessDetailSheet from '@/components/BusinessDetailSheet';

interface PlatformBusiness {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
  is_test: boolean;
  tier: string;
  active_personnel_count: number;
}

export default function PlatformDashboard() {
  const { signOut, session } = useAuth();
  const [businesses, setBusinesses] = useState<PlatformBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchBusinesses = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'list-platform-businesses',
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );
      if (error) throw error;
      setBusinesses(data || []);
    } catch (err) {
      console.error('Failed to fetch businesses:', err);
      toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (session?.access_token) {
      fetchBusinesses();
    }
  }, [session?.access_token, fetchBusinesses]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        backgroundImage: `url(${dashboardBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur-sm">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="h-8 w-px bg-border" />
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              FlowSert Platform
            </h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-foreground">Businesses</h2>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Business
          </Button>
          <CreateBusinessDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onCreated={fetchBusinesses}
          />
        </div>

        <Card className="rounded-xl border bg-card shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : businesses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  No businesses yet
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Click "Add Business" to create the first one.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Personnel</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businesses.map((biz) => (
                    <TableRow key={biz.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            {biz.logo_url ? (
                              <AvatarImage src={biz.logo_url} alt={biz.name} />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-primary">
                              <Building2 className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">
                            {biz.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {biz.tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {biz.active_personnel_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(biz.created_at)}
                      </TableCell>
                      <TableCell>
                        {biz.is_test ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            Test
                          </Badge>
                        ) : (
                          <Badge variant="active">Active</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
