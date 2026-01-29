import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Mail, Loader2, UserPlus, Check, AlertTriangle, Link2 } from 'lucide-react';
import { InviteAdminDialog } from './InviteAdminDialog';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  personnelId: string | null;
  personnelName: string | null;
  hasUnlinkedProfile: boolean;
  unlinkedPersonnelId: string | null;
}

export function AdminOverview() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const { profile, isSuperadmin } = useAuth();

  const fetchAdmins = async () => {
    if (!profile?.business_id) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch all admin user roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      if (!adminRoles || adminRoles.length === 0) {
        setAdmins([]);
        setLoading(false);
        return;
      }

      const adminUserIds = adminRoles.map((r) => r.user_id);

      // 2. Fetch profiles for these admin users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, business_id')
        .in('id', adminUserIds)
        .eq('business_id', profile.business_id);

      if (profilesError) throw profilesError;

      // 3. Fetch all personnel in the business
      const { data: personnel, error: personnelError } = await supabase
        .from('personnel')
        .select('id, name, email, user_id')
        .eq('business_id', profile.business_id);

      if (personnelError) throw personnelError;

      // 4. Map admins with their personnel linking status
      const mappedAdmins: AdminUser[] = (profiles || []).map((p) => {
        // Check if there's a personnel record linked by user_id
        const linkedPersonnel = personnel?.find(per => per.user_id === p.id);
        
        // Check if there's a personnel record with matching email but not linked
        const matchingUnlinkedPersonnel = personnel?.find(
          per => per.email.toLowerCase() === p.email.toLowerCase() && !per.user_id
        );

        return {
          id: p.id,
          email: p.email,
          fullName: p.full_name,
          personnelId: linkedPersonnel?.id || null,
          personnelName: linkedPersonnel?.name || null,
          hasUnlinkedProfile: !!matchingUnlinkedPersonnel,
          unlinkedPersonnelId: matchingUnlinkedPersonnel?.id || null,
        };
      });

      setAdmins(mappedAdmins);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Failed to load admin users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, [profile?.business_id]);

  const handleLinkPersonnel = async (adminUserId: string, personnelId: string) => {
    setActionLoading(adminUserId);
    try {
      const { error } = await supabase
        .from('personnel')
        .update({ user_id: adminUserId })
        .eq('id', personnelId);

      if (error) throw error;

      toast.success('Personnel profile linked successfully');
      await fetchAdmins();
    } catch (error) {
      console.error('Error linking personnel:', error);
      toast.error('Failed to link personnel profile');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreatePersonnelProfile = async (admin: AdminUser) => {
    if (!profile?.business_id) return;
    
    setActionLoading(admin.id);
    try {
      const { error } = await supabase
        .from('personnel')
        .insert({
          name: admin.fullName || admin.email.split('@')[0],
          email: admin.email,
          phone: '',
          role: 'Administrator',
          location: 'Not specified',
          business_id: profile.business_id,
          user_id: admin.id,
          is_job_seeker: false,
          activated: true,
        });

      if (error) throw error;

      toast.success('Personnel profile created successfully');
      await fetchAdmins();
    } catch (error) {
      console.error('Error creating personnel profile:', error);
      toast.error('Failed to create personnel profile');
    } finally {
      setActionLoading(null);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const renderLinkStatus = (admin: AdminUser) => {
    if (admin.personnelId) {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
          <Check className="h-3 w-3" />
          Profile Linked
        </Badge>
      );
    }

    if (admin.hasUnlinkedProfile) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Unlinked
          </Badge>
          {isSuperadmin && admin.unlinkedPersonnelId && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => handleLinkPersonnel(admin.id, admin.unlinkedPersonnelId!)}
              disabled={actionLoading === admin.id}
            >
              {actionLoading === admin.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Link2 className="h-3 w-3" />
              )}
              Link Profile
            </Button>
          )}
        </div>
      );
    }

    if (isSuperadmin) {
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => handleCreatePersonnelProfile(admin)}
          disabled={actionLoading === admin.id}
        >
          {actionLoading === admin.id ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <UserPlus className="h-3 w-3" />
          )}
          Create Profile
        </Button>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Admin Users
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-500" />
            Admin Users
            <Badge variant="secondary" className="ml-2">
              {admins.length}
          </Badge>
          </CardTitle>
          {isSuperadmin && (
            <Button
              size="sm"
              onClick={() => setInviteDialogOpen(true)}
              className="gap-1"
            >
              <UserPlus className="h-4 w-4" />
              Invite Admin
            </Button>
          )}
        </CardHeader>
      <CardContent>
        {admins.length === 0 ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">👔</div>
            <p className="text-muted-foreground">No admin users found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {admins.map((admin) => {
              const isSuperadminUser = admin.email === 'kmu@live.no';
              return (
                <div
                  key={admin.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(admin.fullName, admin.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {admin.fullName || 'No name set'}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{admin.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {isSuperadminUser && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                        Superadmin
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      Admin
                    </Badge>
                    {renderLinkStatus(admin)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </CardContent>
      </Card>

      <InviteAdminDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </>
  );
}
