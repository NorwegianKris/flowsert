import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Shield, FileCheck, Users, BarChart3, Calendar, Bell } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

// Curved arrow SVG component
const CurvedArrow = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 60 40" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M5 20 Q30 5 50 20" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
      fill="none"
    />
    <path 
      d="M45 15 L50 20 L45 25" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

// Step image frame component
const StepImageFrame = ({ 
  stepNumber, 
  image, 
  onUpload 
}: { 
  stepNumber: number; 
  image: string | null;
  onUpload: (file: File) => void;
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="relative">
      {/* Step number badge */}
      <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm shadow-md z-10">
        {stepNumber}
      </div>
      
      {/* Image frame */}
      <label className="block cursor-pointer">
        <div className="w-32 h-32 border-2 border-slate-400 rounded-lg bg-card/80 backdrop-blur-sm shadow-md overflow-hidden flex items-center justify-center hover:border-primary transition-colors">
          {image ? (
            <img src={image} alt={`Step ${stepNumber}`} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-muted-foreground">
              <Upload className="w-6 h-6 mb-1" />
              <span className="text-xs">Upload</span>
            </div>
          )}
        </div>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="hidden" 
        />
      </label>
    </div>
  );
};

// Feature card component
const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) => (
  <div className="bg-card/80 backdrop-blur-sm rounded-lg p-4 border border-border/50 shadow-sm">
    <div className="flex items-start gap-3">
      <div className="p-2 bg-primary/10 rounded-lg">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h4 className="font-semibold text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  </div>
);

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [stepImages, setStepImages] = useState<(string | null)[]>([null, null, null]);
  const [demoEmail, setDemoEmail] = useState('');
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // FIXED: Changed from 'invite' to 'token' to match InviteWorkerDialog/InviteAdminDialog
  const inviteToken = searchParams.get('token');
  const isPasswordReset = searchParams.get('type') === 'recovery';

  useEffect(() => {
    if (!loading && user && !isPasswordReset) {
      navigate('/');
    }
  }, [user, loading, navigate, isPasswordReset]);

  // Handle password reset mode
  useEffect(() => {
    if (isPasswordReset) {
      setResetPasswordMode(true);
    }
  }, [isPasswordReset]);

  const handleImageUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newImages = [...stepImages];
      newImages[index] = e.target?.result as string;
      setStepImages(newImages);
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    if (!forgotPasswordMode) {
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
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
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
      setForgotPasswordMode(false);
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

    setDemoSubmitting(true);
    
    // Use type assertion since demo_requests was just added and types haven't regenerated
    const { error } = await (supabase as any)
      .from('demo_requests')
      .insert({ email: demoEmail });

    setDemoSubmitting(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit demo request. Please try again.',
      });
    } else {
      toast({
        title: 'Demo request submitted',
        description: "We'll be in touch soon!",
      });
      setDemoEmail('');
    }
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-300 via-slate-200 to-slate-400 p-4">
        <Card className="w-full max-w-md shadow-lg backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center">
            <h1 className="font-rajdhani text-4xl font-bold text-primary mb-2">
              FlowSert
            </h1>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>
              Enter your new password below
            </CardDescription>
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-300 via-slate-200 to-slate-400 relative overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="w-full px-6 py-4 flex items-center justify-between relative z-20">
        <h1 className="font-rajdhani text-2xl font-bold text-primary">FlowSert</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate('/about')}>
            About
          </Button>
          <Button variant="ghost" onClick={() => navigate('/faq')}>
            FAQ
          </Button>
          <Button variant="ghost" onClick={() => navigate('/contact')}>
            Contact Us
          </Button>
        </div>
      </nav>

      {/* Industrial-style decorative background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-slate-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-slate-600/15 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />
      <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-8 py-8 relative z-10">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          
          {/* Left side - Hero text + Login */}
          <div className="flex flex-col items-center lg:items-start space-y-8">
            {/* Hero Section */}
            <div className="text-center lg:text-left space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold font-rajdhani text-foreground leading-tight">
                Personnel Compliance
                <span className="block text-primary">Simplified</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-md">
                The smart solution for tracking certifications, managing personnel, and ensuring workforce compliance.
              </p>
            </div>

            {/* Compact Login Card */}
            <Card className="w-full max-w-sm shadow-lg backdrop-blur-sm bg-card/95 animate-fade-in">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">
                  {inviteToken 
                    ? 'Complete Registration'
                    : forgotPasswordMode
                    ? 'Reset Password'
                    : 'Get Started'}
                </CardTitle>
                <CardDescription className="text-sm">
                  {inviteToken 
                    ? 'Create your account to access your profile'
                    : forgotPasswordMode
                    ? 'Enter your email to reset'
                    : 'Sign in or create an account'}
                </CardDescription>
              </CardHeader>

              {forgotPasswordMode ? (
                <form onSubmit={handleForgotPassword}>
                  <CardContent className="space-y-3 pt-0">
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-email" className="text-sm">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-9"
                        required
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive">{errors.email}</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2 pt-0">
                    <Button type="submit" className="w-full h-9" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Send Reset Link
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setForgotPasswordMode(false)}
                    >
                      Back to Sign In
                    </Button>
                  </CardFooter>
                </form>
              ) : (
                <Tabs defaultValue={inviteToken ? 'signup' : 'signin'} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mx-4 h-8" style={{ width: 'calc(100% - 2rem)' }}>
                    <TabsTrigger value="signin" className="text-sm">Sign In</TabsTrigger>
                    <TabsTrigger value="signup" className="text-sm">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin" className="mt-3">
                    <form onSubmit={handleSignIn}>
                      <CardContent className="space-y-3 pt-0">
                        <div className="space-y-1.5">
                          <Label htmlFor="signin-email" className="text-sm">Email</Label>
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-9"
                            required
                          />
                          {errors.email && (
                            <p className="text-xs text-destructive">{errors.email}</p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="signin-password" className="text-sm">Password</Label>
                          <Input
                            id="signin-password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-9"
                            required
                          />
                          {errors.password && (
                            <p className="text-xs text-destructive">{errors.password}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="link"
                          className="px-0 text-xs text-muted-foreground hover:text-primary h-auto py-0"
                          onClick={() => setForgotPasswordMode(true)}
                        >
                          Forgot password?
                        </Button>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button type="submit" className="w-full h-9" disabled={isLoading}>
                          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Sign In
                        </Button>
                      </CardFooter>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="mt-3">
                    <form onSubmit={handleSignUp}>
                      <CardContent className="space-y-3 pt-0">
                        <div className="space-y-1.5">
                          <Label htmlFor="signup-name" className="text-sm">Full Name</Label>
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="signup-email" className="text-sm">Email</Label>
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-9"
                            required
                          />
                          {errors.email && (
                            <p className="text-xs text-destructive">{errors.email}</p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="signup-password" className="text-sm">Password</Label>
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-9"
                            required
                          />
                          {errors.password && (
                            <p className="text-xs text-destructive">{errors.password}</p>
                          )}
                        </div>
                        {!inviteToken && (
                          <p className="text-xs text-muted-foreground">
                            Creates a new business account as admin.
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button type="submit" className="w-full h-9" disabled={isLoading}>
                          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Create Account
                        </Button>
                      </CardFooter>
                    </form>
                  </TabsContent>
                </Tabs>
              )}
            </Card>

            {/* Book a Demo - Compact */}
            <div className="w-full max-w-sm">
              <div className="flex items-center gap-3 p-4 bg-card/80 backdrop-blur-sm rounded-lg border border-border/50">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Want a demo?</p>
                  <form onSubmit={handleDemoSubmit} className="flex gap-2 mt-2">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      className="h-8 text-sm flex-1"
                      value={demoEmail}
                      onChange={(e) => setDemoEmail(e.target.value)}
                    />
                    <Button type="submit" size="sm" className="h-8" disabled={demoSubmitting}>
                      {demoSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Submit'}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - How It Works */}
          <div className="hidden lg:flex flex-col items-center justify-center">
            <div className="bg-card/90 backdrop-blur-sm rounded-2xl p-8 border border-border/50 shadow-xl animate-fade-in">
              <h3 className="text-xl font-semibold text-foreground text-center mb-8">How It Works</h3>
              
              <div className="flex items-start gap-4">
                {/* Step 1 */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="absolute -top-2 -left-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xs z-10">1</div>
                    <div className="w-24 h-24 bg-primary/10 rounded-xl flex items-center justify-center border-2 border-primary/20">
                      <Users className="w-10 h-10 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 max-w-[100px] leading-tight">
                    Set up your business dashboard
                  </p>
                </div>
                
                {/* Arrow 1 */}
                <div className="flex items-center pt-8">
                  <CurvedArrow className="w-12 h-8 text-muted-foreground/50" />
                </div>
                
                {/* Step 2 */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="absolute -top-2 -left-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xs z-10">2</div>
                    <div className="w-24 h-24 bg-primary/10 rounded-xl flex items-center justify-center border-2 border-primary/20">
                      <FileCheck className="w-10 h-10 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 max-w-[100px] leading-tight">
                    Workers upload certificates
                  </p>
                </div>
                
                {/* Arrow 2 */}
                <div className="flex items-center pt-8">
                  <CurvedArrow className="w-12 h-8 text-muted-foreground/50" />
                </div>
                
                {/* Step 3 */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="absolute -top-2 -left-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xs z-10">3</div>
                    <div className="w-24 h-24 bg-primary/10 rounded-xl flex items-center justify-center border-2 border-primary/20">
                      <Shield className="w-10 h-10 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 max-w-[100px] leading-tight">
                    Full compliance visibility
                  </p>
                </div>
              </div>

              {/* Benefits */}
              <div className="mt-10 pt-8 border-t border-border/50">
                <h4 className="text-sm font-medium text-foreground mb-4 text-center">Why Certificate Tracking Matters</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-background/50 rounded-lg">
                    <Shield className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-xs font-medium text-foreground">Safety</p>
                    <p className="text-xs text-muted-foreground mt-1">Valid credentials protect your team</p>
                  </div>
                  <div className="text-center p-3 bg-background/50 rounded-lg">
                    <FileCheck className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-xs font-medium text-foreground">Compliance</p>
                    <p className="text-xs text-muted-foreground mt-1">Meet regulatory requirements</p>
                  </div>
                  <div className="text-center p-3 bg-background/50 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-xs font-medium text-foreground">Efficiency</p>
                    <p className="text-xs text-muted-foreground mt-1">Save time on renewals</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
