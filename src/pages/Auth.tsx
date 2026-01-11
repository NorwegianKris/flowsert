import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { z } from 'zod';

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

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [stepImages, setStepImages] = useState<(string | null)[]>([null, null, null]);
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const inviteToken = searchParams.get('invite');

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

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

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <div className="flex-1 flex flex-col items-center justify-start pt-8 px-4 relative z-10">
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
                : 'Sign in to your account or create a new one'}
            </CardDescription>
          </CardHeader>

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
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
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
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
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
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1"
                />
                <Button type="button">
                  Submit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right side - Tab-based content */}
      <div className="hidden lg:flex flex-1 items-start justify-center pt-32 relative z-10">
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
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <p className="text-slate-500 text-lg">Functionality content coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
