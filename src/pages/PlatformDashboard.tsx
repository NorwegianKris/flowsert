import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, LogOut } from 'lucide-react';
import dashboardBg from '@/assets/dashboard-bg-pattern.png';

export default function PlatformDashboard() {
  const { signOut } = useAuth();

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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="rounded-xl border bg-card shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-4">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Businesses</h2>
              <p className="mt-1 text-sm text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
