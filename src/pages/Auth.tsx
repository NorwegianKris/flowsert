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
    <div className="min-h-screen flex bg-gradient-to-br from-slate-300 via-slate-200 to-slate-400 relative overflow-hidden">
      {/* Industrial-style decorative background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-slate-500/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-slate-600/25 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />
      <div className="absolute top-1/3 right-0 w-64 h-64 bg-primary/15 rounded-full blur-3xl translate-x-1/2" />
      <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-slate-400/30 rounded-full blur-2xl" />
      
      {/* Left side - Login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-8 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-primary text-4xl font-bold mb-2 whitespace-nowrap">Personnel Compliance Simplified</h1>
          <p className="text-slate-900 text-xl">A Leverage Solution for Industrial SMBs</p>
        </div>
        <Card className="w-full max-w-md shadow-lg backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center">
            <h1 className="font-rajdhani text-4xl font-bold text-primary mb-2">
              FlowSert
            </h1>
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>
              {inviteToken 
                ? 'Complete your registration to access your profile'
                : forgotPasswordMode
                ? 'Enter your email to reset your password'
                : 'Sign in to your account or create a new one'}
            </CardDescription>
          </CardHeader>

          {forgotPasswordMode ? (
            <form onSubmit={handleForgotPassword}>
              <CardContent className="space-y-4">
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
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button type="submit" variant="active" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setForgotPasswordMode(false)}
                >
                  Back to Sign In
                </Button>
              </CardFooter>
            </form>
          ) : (
            <Tabs defaultValue={inviteToken ? 'signup' : 'signin'} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mx-4" style={{ width: 'calc(100% - 2rem)' }}>
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn}>
                  <CardContent className="space-y-4">
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
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
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
                      {errors.password && (
                        <p className="text-sm text-destructive">{errors.password}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 text-sm text-muted-foreground hover:text-primary"
                      onClick={() => setForgotPasswordMode(true)}
                    >
                      Forgot password?
                    </Button>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" variant="active" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp}>
                  <CardContent className="space-y-4">
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
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
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
                      {errors.password && (
                        <p className="text-sm text-destructive">{errors.password}</p>
                      )}
                    </div>
                    {!inviteToken && (
                      <p className="text-sm text-muted-foreground">
                        By signing up, you'll create a new business account as an admin.
                      </p>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" variant="active" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </Card>

        {/* Book a Demo section */}
        <div className="w-full max-w-md mt-8">
          <Card className="shadow-lg backdrop-blur-sm bg-card/95">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">Book a Demo</CardTitle>
              <CardDescription>
                Enter your email and we'll get in touch
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDemoSubmit} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1"
                  value={demoEmail}
                  onChange={(e) => setDemoEmail(e.target.value)}
                />
                <Button type="submit" disabled={demoSubmitting}>
                  {demoSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right side - Tab-based content */}
      <div className="hidden lg:flex flex-1 items-center justify-center px-8 py-8 relative z-10">
        <Tabs defaultValue="how-it-works" className="w-full max-w-xl">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="how-it-works">How It Works</TabsTrigger>
            <TabsTrigger value="functionality">Functionality</TabsTrigger>
          </TabsList>
          
          <TabsContent value="how-it-works">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                {/* Step 1 */}
                <div className="flex flex-col items-center">
                  <StepImageFrame 
                    stepNumber={1} 
                    image={stepImages[0]} 
                    onUpload={(file) => handleImageUpload(0, file)} 
                  />
                  <p className="text-slate-700 text-sm text-center mt-2 max-w-32">Business establishes dashboard</p>
                </div>
                
                {/* Curved arrow 1->2 */}
                <CurvedArrow className="w-16 h-10 text-slate-500 -mt-6" />
                
                {/* Step 2 */}
                <div className="flex flex-col items-center">
                  <StepImageFrame 
                    stepNumber={2} 
                    image={stepImages[1]} 
                    onUpload={(file) => handleImageUpload(1, file)} 
                  />
                  <p className="text-slate-700 text-sm text-center mt-2 max-w-32">Worker uploads to personal user profile</p>
                </div>
                
                {/* Curved arrow 2->3 */}
                <CurvedArrow className="w-16 h-10 text-slate-500 -mt-6" />
                
                {/* Step 3 */}
                <div className="flex flex-col items-center">
                  <StepImageFrame 
                    stepNumber={3} 
                    image={stepImages[2]} 
                    onUpload={(file) => handleImageUpload(2, file)} 
                  />
                  <p className="text-slate-700 text-sm text-center mt-2 max-w-32">Joint certificate transparency and collaboration</p>
                </div>
              </div>
              
              {/* Certificate tracking importance section */}
              <div className="mt-12 bg-white border-2 border-slate-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-slate-700 mb-6 text-center">
                  Tracking of Certificates is important for...
                </h3>
                <div className="space-y-4">
                  {/* Safety */}
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-primary">Safety</span>
                    <div className="flex items-center gap-2 mt-1">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-slate-600 text-sm">Right credentials and validity are critical for workforce safety</span>
                    </div>
                  </div>
                  
                  {/* Compliance */}
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-primary">Compliance</span>
                    <div className="flex items-center gap-2 mt-1">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-slate-600 text-sm">Customers and Auditors expect laws and regulations to be followed</span>
                    </div>
                  </div>
                  
                  {/* Workflow */}
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-primary">Workflow</span>
                    <div className="flex items-center gap-2 mt-1">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-slate-600 text-sm">Save time and effort chasing certificates and renewals</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="functionality">
            <div className="flex flex-col gap-4">
              <h3 className="text-2xl font-bold text-slate-700 text-center mb-4">
                Platform Features
              </h3>
              
              <div className="grid gap-4">
                <FeatureCard
                  icon={FileCheck}
                  title="Certificate Management"
                  description="Track all personnel certificates with automatic expiry alerts. Upload, categorize, and manage documentation in one place."
                />
                
                <FeatureCard
                  icon={Users}
                  title="Personnel Profiles"
                  description="Comprehensive worker profiles with contact info, next-of-kin details, and complete certificate history."
                />
                
                <FeatureCard
                  icon={Shield}
                  title="Compliance Tracking"
                  description="At-a-glance compliance status for every team member. Know instantly who needs certificate renewals."
                />
                
                <FeatureCard
                  icon={Calendar}
                  title="Project Assignment"
                  description="Assign personnel to projects and track certificate requirements. Ensure every project has qualified workers."
                />
                
                <FeatureCard
                  icon={Bell}
                  title="Automated Notifications"
                  description="Receive alerts before certificates expire. Never miss a renewal deadline again."
                />
                
                <FeatureCard
                  icon={BarChart3}
                  title="Dashboard Analytics"
                  description="Visual overview of your workforce compliance. Track expiring certificates and personnel availability."
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
