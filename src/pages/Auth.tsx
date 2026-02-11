import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, FileCheck, Users, BarChart3, Clock, CheckCircle, ArrowRight, ChevronDown } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import heroBgPattern from '@/assets/hero-bg-pattern.png';
import technoDiveWorker from '@/assets/techno-dive-worker.jpg';
import technoDiveDiver from '@/assets/techno-dive-diver.jpg';
import dashboardPreview from '@/assets/dashboard-preview.png';
import { PublicHeader } from '@/components/PublicHeader';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoMessage, setDemoMessage] = useState('');
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationDetails, setInvitationDetails] = useState<{
    email: string;
    role: string;
    businessName: string;
  } | null>(null);
  const [jobSeekerDetails, setJobSeekerDetails] = useState<{
    businessName: string;
    logoUrl: string | null;
  } | null>(null);
  const [workerCategories, setWorkerCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [storyExpanded, setStoryExpanded] = useState(false);
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const inviteToken = searchParams.get('token');
  const jobSeekerToken = searchParams.get('job_seeker_token');
  const businessNameParam = searchParams.get('business_name');
  const isPasswordReset = searchParams.get('type') === 'recovery';

  useEffect(() => {
    if (!loading && user && !isPasswordReset) {
      navigate('/');
    }
  }, [user, loading, navigate, isPasswordReset]);

  useEffect(() => {
    if (isPasswordReset) {
      setResetPasswordMode(true);
    }
  }, [isPasswordReset]);

  // Auto-open dialog and fetch invitation details for invite tokens
  useEffect(() => {
    if (inviteToken) {
      setAuthMode('signup');
      setAuthDialogOpen(true);
      setInvitationLoading(true);
      
      // Fetch invitation details using the RPC function
      const fetchInvitation = async () => {
        try {
          const { data, error } = await supabase.rpc('get_invitation_by_token', {
            lookup_token: inviteToken
          });
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            const invitation = data[0];
            // Business name is now included in the RPC response
            setInvitationDetails({
              email: invitation.email,
              role: invitation.role,
              businessName: invitation.business_name || 'Unknown Business'
            });
            setEmail(invitation.email);
          } else {
            toast({
              variant: 'destructive',
              title: 'Invalid Invitation',
              description: 'This invitation link is invalid or has expired.',
            });
          }
        } catch (error) {
          console.error('Error fetching invitation:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load invitation details.',
          });
        } finally {
          setInvitationLoading(false);
        }
      };
      
      fetchInvitation();
    }
  }, [inviteToken, toast]);

  // Handle job seeker token
  useEffect(() => {
    if (jobSeekerToken) {
      setAuthMode('signup');
      setAuthDialogOpen(true);
      
      // If business name is provided in URL, we still need to fetch the logo
      // So we continue to fetch the invitation details
      
      setInvitationLoading(true);
      
      const fetchJobSeekerInvitation = async () => {
        try {
          const { data, error } = await (supabase as any).rpc('get_freelancer_invitation_by_token', {
            lookup_token: jobSeekerToken
          });
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            const invitation = data[0];
            // Fetch business name and logo
            const { data: businessData } = await supabase
              .from('businesses')
              .select('name, logo_url')
              .eq('id', invitation.business_id)
              .single();
            
            setJobSeekerDetails({
              businessName: businessData?.name || businessNameParam || 'Unknown Business',
              logoUrl: businessData?.logo_url || null
            });
            
            // Fetch worker categories for role dropdown
            const { data: categoriesData } = await (supabase as any).rpc('get_worker_categories_for_freelancer_token', {
              lookup_token: jobSeekerToken
            });
            
            if (categoriesData && Array.isArray(categoriesData)) {
              setWorkerCategories(categoriesData);
            }
          } else if (businessNameParam) {
            // Fallback if no invitation data but we have business name from URL
            setJobSeekerDetails({
              businessName: businessNameParam,
              logoUrl: null
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Invalid Link',
              description: 'This freelancer signup link is invalid or inactive.',
            });
          }
        } catch (error) {
          console.error('Error fetching job seeker invitation:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load signup details.',
          });
        } finally {
          setInvitationLoading(false);
        }
      };
      
      fetchJobSeekerInvitation();
    }
  }, [jobSeekerToken, businessNameParam, toast]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    if (authMode !== 'forgot') {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please try again.'
          : error.message,
      });
    } else {
      setAuthDialogOpen(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Validate email matches invitation if using invite token
    if (inviteToken && invitationDetails && email !== invitationDetails.email) {
      toast({
        variant: 'destructive',
        title: 'Email mismatch',
        description: 'Please use the email address the invitation was sent to.',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(email, password, fullName, inviteToken || undefined, jobSeekerToken || undefined, selectedRole || undefined);
    setIsLoading(false);

    if (error) {
      let message = error.message;
      if (error.message.includes('already registered')) {
        message = 'An account with this email already exists. Please sign in instead.';
      }
      toast({
        variant: 'destructive',
        title: 'Sign up failed',
        description: message,
      });
    } else {
      toast({
        title: 'Account created',
        description: 'You have been signed in automatically.',
      });
      setAuthDialogOpen(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0].message });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?type=recovery`,
    });
    setIsLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: 'Reset email sent',
        description: 'Check your inbox for the password reset link.',
      });
      setAuthMode('signin');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are identical.',
      });
      return;
    }

    const passwordResult = passwordSchema.safeParse(newPassword);
    if (!passwordResult.success) {
      toast({
        variant: 'destructive',
        title: 'Invalid password',
        description: passwordResult.error.errors[0].message,
      });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: 'Password updated',
        description: 'Your password has been reset successfully.',
      });
      setResetPasswordMode(false);
      navigate('/');
    }
  };

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailResult = emailSchema.safeParse(demoEmail);
    if (!emailResult.success) {
      toast({
        variant: 'destructive',
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
      });
      return;
    }

    if (!demoName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Name required',
        description: 'Please enter your name.',
      });
      return;
    }

    setDemoSubmitting(true);
    
    try {
      const { error } = await supabase.functions.invoke('send-demo-request', {
        body: {
          name: demoName,
          email: demoEmail,
          message: demoMessage || undefined
        }
      });

      if (error) throw error;

      toast({
        title: 'Demo request submitted',
        description: "We'll be in touch soon!",
      });
      setDemoName('');
      setDemoEmail('');
      setDemoMessage('');
      setDemoDialogOpen(false);
    } catch (error) {
      console.error('Error submitting demo request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit demo request. Please try again.',
      });
    } finally {
      setDemoSubmitting(false);
    }
  };

  const openAuthDialog = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthDialogOpen(true);
    setErrors({});
    setEmail('');
    setPassword('');
    setFullName('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Password Reset Mode
  if (resetPasswordMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <h1 className="font-rajdhani text-3xl font-bold text-primary mb-2">FlowSert</h1>
            <CardTitle className="text-xl">Reset Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <form onSubmit={handleResetPassword}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader openAuthDialog={openAuthDialog} />

      {/* Hero + Product Preview with Background */}
      <div className="relative overflow-hidden min-h-[calc(100vh-73px)] flex flex-col justify-center">
        {/* Background Pattern */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url(${heroBgPattern})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        {/* Hero Section */}
        <section className="pt-8 pb-4 md:pt-12 md:pb-6 relative z-10">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-[4.5rem] md:text-[5.625rem] lg:text-[6.75rem] font-bold font-rajdhani text-foreground mb-6 leading-[1.1] tracking-tight">
                Make personnel
                <span className="block">
                  compliance{' '}
                  <span 
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage: 'linear-gradient(to right, #C4B5FD, #6366F1, #4338CA)',
                    }}
                  >
                    flow
                  </span>
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl mx-auto">
                Transform your work, hiring and compliance operations with smart certificate management software—built for industrial SMEs.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Button size="lg" onClick={() => navigate('/contact')} className="h-11 px-6 text-base gap-2">
                  Get in Touch <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => setDemoDialogOpen(true)} className="h-11 px-6 text-base">
                  Book a Demo
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Product Preview */}
        <section className="pb-8 md:pb-12 relative z-10">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="bg-card rounded-2xl border border-border/50 shadow-2xl shadow-primary/5 overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b border-border/50 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="ml-4 text-xs text-muted-foreground">FlowSert Dashboard</span>
              </div>
              <img 
                src={dashboardPreview} 
                alt="FlowSert Dashboard Preview" 
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </div>
        </section>
      </div>

      {/* How It Works Section */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-rajdhani text-foreground mb-4 text-center">How It Works</h2>
            <p className="text-muted-foreground text-center mb-14 max-w-xl mx-auto">
              Get your team up and running in minutes with our simple three-step process.
            </p>
            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center group">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 relative group-hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(135deg, #C4B5FD 0%, #6366F1 50%, #4338CA 100%)' }}>
                  <Users className="h-9 w-9 text-white" />
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #6366F1, #4338CA)' }}>1</div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Set Up Your Team</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Create your business account and invite your personnel to join the platform.
                </p>
              </div>
              <div className="text-center group">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 relative group-hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(135deg, #C4B5FD 0%, #6366F1 50%, #4338CA 100%)' }}>
                  <FileCheck className="h-9 w-9 text-white" />
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #6366F1, #4338CA)' }}>2</div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Upload Certificates</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Workers upload their certificates and documentation to their personal profiles.
                </p>
              </div>
              <div className="text-center group">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 relative group-hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(135deg, #C4B5FD 0%, #6366F1 50%, #4338CA 100%)' }}>
                  <Shield className="h-9 w-9 text-white" />
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #6366F1, #4338CA)' }}>3</div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Stay Compliant</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Get full visibility into certification status and never miss a renewal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 relative overflow-hidden">
        {/* Background Pattern */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url(${heroBgPattern})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-rajdhani text-foreground mb-12 text-center">Platform Features</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4 p-4">
                <div className="p-3 bg-primary/10 rounded-lg shrink-0 text-2xl">
                  👥
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Personnel overview</h4>
                  <p className="text-sm text-muted-foreground mt-1">See your workforce, roles, and competencies in one structured view.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4">
                <div className="p-3 bg-primary/10 rounded-lg shrink-0 text-2xl">
                  📜
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Certificate tracking</h4>
                  <p className="text-sm text-muted-foreground mt-1">Track certificates with issue and expiry dates, clearly marked as valid, expiring, or expired.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4">
                <div className="p-3 bg-primary/10 rounded-lg shrink-0 text-2xl">
                  🙋
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Worker self-service</h4>
                  <p className="text-sm text-muted-foreground mt-1">Workers upload and update their own certificates, keeping data accurate and up to date.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4">
                <div className="p-3 bg-primary/10 rounded-lg shrink-0 text-2xl">
                  ✅
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Project compliance</h4>
                  <p className="text-sm text-muted-foreground mt-1">Verify required competencies and certificates per project at a glance - for internal control and external sharing.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4">
                <div className="p-3 bg-primary/10 rounded-lg shrink-0 text-2xl">
                  🤖
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">AI-assisted support</h4>
                  <p className="text-sm text-muted-foreground mt-1">An AI chatbot helps identify certificate details and answer document-related questions, with human confirmation.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4">
                <div className="p-3 bg-primary/10 rounded-lg shrink-0 text-2xl">
                  📥
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Freelancer funnel</h4>
                  <p className="text-sm text-muted-foreground mt-1">Receive freelancer applications and certificate submissions in one structured flow, instead of emails and cold calls.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Story Section */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              {/* Polaroid Images */}
              <div className="order-2 md:order-1">
                <div className="relative h-[380px] flex justify-center">
                  {/* Back Polaroid */}
                  <div 
                    className="absolute left-1/2 -translate-x-[85%] top-0 w-48 md:w-56 bg-card rounded-sm shadow-xl border border-border/30 p-2 pb-8 transform -rotate-6 hover:rotate-0 transition-transform duration-300"
                    style={{ boxShadow: '0 10px 30px -10px hsl(var(--foreground) / 0.15)' }}
                  >
                    <div className="aspect-[4/3] bg-muted rounded-sm overflow-hidden">
                      <img 
                        src={technoDiveWorker} 
                        alt="Techno Dive worker inspecting equipment" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  
                  {/* Front Polaroid */}
                  <div 
                    className="absolute left-1/2 -translate-x-[30%] top-20 w-48 md:w-56 bg-card rounded-sm shadow-2xl border border-border/30 p-2 pb-8 transform rotate-3 hover:rotate-0 transition-transform duration-300 z-10"
                    style={{ boxShadow: '0 15px 40px -10px hsl(var(--foreground) / 0.2)' }}
                  >
                    <div className="aspect-[4/3] bg-muted rounded-sm overflow-hidden">
                      <img 
                        src={technoDiveDiver} 
                        alt="Techno Dive professional diver with equipment" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="order-1 md:order-2">
                <h2 className="text-2xl md:text-3xl font-bold font-rajdhani text-foreground mb-6 leading-tight">
                  How Techno Dive keeps personnel compliance under control
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Techno Dive, a Norwegian subsea contractor, manages certified personnel across multiple projects, where accurate tracking of certificates and expiry dates is critical to safe and efficient operations.
                  </p>
                  <p>
                    Before FlowSert, certificates were scattered across emails and folders, with expiry dates tracked manually — making it difficult to maintain a reliable and up-to-date overview.
                  </p>
                  {!storyExpanded && (
                    <div className="flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setStoryExpanded(true)}
                        className="text-primary hover:text-primary/80 gap-1"
                      >
                        Read more
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {storyExpanded && (
                    <>
                      <p>
                        With FlowSert, employees and freelancers all register their certificates in a shared system. Workers upload documentation themselves, while admins monitor certificate validity and compliance across projects in real time.
                      </p>
                      <p>
                        The result is a clearer overview, reduced administrative overhead, and fewer last-minute surprises related to expiring certificates — supporting better work flow in day-to-day operations.
                      </p>
                      <div className="flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setStoryExpanded(false)}
                          className="text-primary hover:text-primary/80 gap-1"
                        >
                          Show less
                          <ChevronDown className="h-4 w-4 rotate-180" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why It Matters Section */}
      <section className="py-16 relative overflow-hidden">
        {/* Background Pattern */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url(${heroBgPattern})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-rajdhani text-foreground mb-4 text-center">Why Certificate Tracking Matters</h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              For industrial businesses, maintaining proper certifications isn't just about compliance—it's about safety, efficiency, and peace of mind.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #C4B5FD 0%, #6366F1 50%, #4338CA 100%)' }}>
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Safety First</h3>
                <p className="text-muted-foreground text-sm">
                  Ensure every worker has valid credentials before stepping on site. Protect your team with verified qualifications.
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #C4B5FD 0%, #6366F1 50%, #4338CA 100%)' }}>
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Stay Compliant</h3>
                <p className="text-muted-foreground text-sm">
                  Meet regulatory requirements and pass audits with confidence. Keep documentation organized and accessible.
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #C4B5FD 0%, #6366F1 50%, #4338CA 100%)' }}>
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Save Time</h3>
                <p className="text-muted-foreground text-sm">
                  Stop chasing certificates and renewal dates. Automated tracking lets you focus on what matters.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary/5">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-rajdhani text-foreground mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join businesses managing their certifications smarter with FlowSert.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" onClick={() => navigate('/contact')} className="h-12 px-8">
              Get in Touch
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/contact')} className="h-12 px-8">
              Book a Demo
            </Button>
          </div>
          
        </div>
      </section>

      {/* Auth Dialog */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center font-rajdhani text-2xl">
              {authMode === 'signin' && 'Welcome Back'}
              {authMode === 'signup' && (inviteToken ? 'Complete Registration' : jobSeekerToken ? 'Freelancer Registration' : 'Create Account')}
              {authMode === 'forgot' && 'Reset Password'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {authMode === 'signin' && 'Sign in to access your dashboard'}
              {authMode === 'signup' && (inviteToken ? 'Complete your registration to join' : jobSeekerToken ? 'Create your profile to showcase your skills and experience' : 'Start managing your certifications')}
              {authMode === 'forgot' && 'Enter your email to receive a reset link'}
            </DialogDescription>
          </DialogHeader>

          {authMode === 'forgot' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setAuthMode('signin')}
              >
                Back to Sign In
              </Button>
            </form>
          ) : authMode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              <Button
                type="button"
                variant="link"
                className="px-0 text-sm text-muted-foreground hover:text-primary"
                onClick={() => setAuthMode('forgot')}
              >
                Forgot password?
              </Button>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setAuthMode('signup')}
                >
                  Sign up
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Show invitation context */}
              {inviteToken && invitationLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              {inviteToken && invitationDetails && (
                <div className="rounded-lg bg-primary/10 p-4 text-center">
                  <p className="text-sm text-foreground">
                    You're joining <strong>{invitationDetails.businessName}</strong> as{' '}
                    <span className="capitalize">{invitationDetails.role}</span>
                  </p>
                </div>
              )}
              {jobSeekerToken && jobSeekerDetails && (
                <div className="rounded-lg bg-primary/5 border border-border p-4 text-center space-y-3">
                  {jobSeekerDetails.logoUrl && (
                    <div className="flex justify-center">
                      <img 
                        src={jobSeekerDetails.logoUrl} 
                        alt={`${jobSeekerDetails.businessName} logo`}
                        className="h-12 w-auto object-contain"
                      />
                    </div>
                  )}
                  <p className="text-sm font-medium text-foreground">
                    Register as a Freelancer with <strong>{jobSeekerDetails.businessName}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Complete your profile with all relevant certificates and documents to increase your chances of being hired. A detailed profile helps employers see your qualifications quickly.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              {/* Job Role dropdown for freelancers */}
              {jobSeekerToken && workerCategories.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="signup-role">Job Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger id="signup-role">
                      <SelectValue placeholder="Select your job role" />
                    </SelectTrigger>
                    <SelectContent>
                      {workerCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select the role that best matches your expertise
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  readOnly={!!invitationDetails}
                  className={invitationDetails ? 'bg-muted cursor-not-allowed' : ''}
                />
                {invitationDetails && (
                  <p className="text-xs text-muted-foreground">
                    This email is linked to your invitation and cannot be changed.
                  </p>
                )}
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              {!inviteToken && !jobSeekerToken && (
                <p className="text-sm text-muted-foreground">
                  By signing up, you'll create a new business account as an admin.
                </p>
              )}
              {jobSeekerToken && (
                <p className="text-sm text-muted-foreground">
                  After registration, upload your certificates and documents to stand out to employers.
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading || (!!inviteToken && !invitationDetails)}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setAuthMode('signin')}
                >
                  Sign in
                </button>
              </p>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Demo Dialog */}
      <Dialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center font-rajdhani text-2xl">Book a Demo</DialogTitle>
            <DialogDescription className="text-center">
              Fill in your details and we'll get in touch to schedule a demo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDemoSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="demo-name">Name</Label>
              <Input
                id="demo-name"
                type="text"
                placeholder="Your name"
                value={demoName}
                onChange={(e) => setDemoName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-email">Email</Label>
              <Input
                id="demo-email"
                type="email"
                placeholder="you@example.com"
                value={demoEmail}
                onChange={(e) => setDemoEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-message">Message (optional)</Label>
              <Textarea
                id="demo-message"
                placeholder="Tell us about your needs..."
                value={demoMessage}
                onChange={(e) => setDemoMessage(e.target.value)}
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full" disabled={demoSubmitting}>
              {demoSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
