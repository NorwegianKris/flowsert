import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'worker' | 'manager';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  business_id: string | null;
  terms_accepted_at: string | null;
  terms_version: string | null;
  privacy_version: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  businessId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string, inviteToken?: string, jobSeekerToken?: string, jobSeekerRole?: string) => Promise<{ data: any; error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isWorker: boolean;
  isSuperadmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Track if we've already fetched data for this user to prevent double fetches
  const fetchedUserIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchUserData = useCallback(async (userId: string) => {
    // Prevent duplicate fetches for the same user
    if (fetchedUserIdRef.current === userId) {
      return;
    }
    fetchedUserIdRef.current = userId;

    try {
      // Fetch profile and role in parallel for faster loading
      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      if (!isMountedRef.current) return;

      if (profileResult.error) throw profileResult.error;
      if (roleResult.error) throw roleResult.error;

      // Batch state updates
      setProfile(profileResult.data as Profile | null);
      setRole(roleResult.data?.role as AppRole || null);

      // Update last_login_at for workers (fire and forget, don't await)
      if (roleResult.data?.role === 'worker') {
        supabase
          .from('personnel')
          .update({ last_login_at: new Date().toISOString() })
          .eq('user_id', userId)
          .then(() => {});
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Get initial session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMountedRef.current) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Then set up listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMountedRef.current) return;
        
        // Detect session expiry: SIGNED_OUT while user was previously logged in
        if (event === 'SIGNED_OUT' && fetchedUserIdRef.current) {
          fetchedUserIdRef.current = null;
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          setLoading(false);
          window.location.replace('/auth');
          return;
        }
        
        // For token refresh events where user hasn't changed, just update
        // the session reference silently without triggering user re-renders
        if (event !== 'SIGNED_OUT' && fetchedUserIdRef.current === session?.user?.id) {
          setSession(session);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Only fetch if it's a different user
          if (fetchedUserIdRef.current !== session.user.id) {
            setLoading(true);
            fetchUserData(session.user.id);
          }
        } else {
          // Clear data on sign out
          fetchedUserIdRef.current = null;
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // Session guard: periodically verify the session is still valid
    const sessionGuardInterval = setInterval(async () => {
      if (!isMountedRef.current || !fetchedUserIdRef.current) return;
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession && fetchedUserIdRef.current) {
          console.warn('Session expired, redirecting to login');
          fetchedUserIdRef.current = null;
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          setLoading(false);
          window.location.replace('/auth');
        }
      } catch (err) {
        console.error('Session guard check failed:', err);
      }
    }, 60_000);

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
      clearInterval(sessionGuardInterval);
    };
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName?: string, inviteToken?: string, jobSeekerToken?: string, jobSeekerRole?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://app.flowsert.com/auth/callback',
        data: { 
          full_name: fullName,
          invite_token: inviteToken || undefined,
          job_seeker_token: jobSeekerToken || undefined,
          job_seeker_role: jobSeekerRole || undefined
        }
      }
    });
    return { data, error: error as Error | null };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Global signout failed, clearing local session:', error.message);
        // Fallback to local-only signout
        await supabase.auth.signOut({ scope: 'local' });
      }
    } catch (error) {
      console.error('SignOut error:', error);
    } finally {
      // Always clear local state
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    fetchedUserIdRef.current = null;
    await fetchUserData(user.id);
  }, [user, fetchUserData]);

  // Superadmin is determined by email - only kmu@live.no can be superadmin
  const isSuperadmin = profile?.email === 'kmu@live.no';

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    businessId: profile?.business_id ?? null,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    isAdmin: role === 'admin',
    isWorker: role === 'worker',
    isSuperadmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
