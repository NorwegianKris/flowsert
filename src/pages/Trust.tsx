import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';
import { Link } from 'react-router-dom';
import { Shield, FileText, Users, Globe } from 'lucide-react';

export default function Trust() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold font-rajdhani text-foreground mb-2">Trust Center</h1>
            <p className="text-muted-foreground mb-10">
              Transparency is fundamental to how we operate. Here you'll find everything about how FlowSert handles your data.
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              <Link to="/terms" className="block p-6 bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <FileText className="h-8 w-8 text-primary mb-3" />
                <h2 className="text-lg font-semibold text-foreground mb-1">Terms of Service</h2>
                <p className="text-sm text-muted-foreground">Our agreement with you — plain and clear.</p>
              </Link>

              <Link to="/privacy" className="block p-6 bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <Shield className="h-8 w-8 text-primary mb-3" />
                <h2 className="text-lg font-semibold text-foreground mb-1">Privacy Policy</h2>
                <p className="text-sm text-muted-foreground">How we collect, use, and protect your personal data.</p>
              </Link>

              <Link to="/subprocessors" className="block p-6 bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <Users className="h-8 w-8 text-primary mb-3" />
                <h2 className="text-lg font-semibold text-foreground mb-1">Sub-Processors</h2>
                <p className="text-sm text-muted-foreground">Third parties that help us deliver the Service.</p>
              </Link>

              <Link to="/security" className="block p-6 bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <Globe className="h-8 w-8 text-primary mb-3" />
                <h2 className="text-lg font-semibold text-foreground mb-1">Security</h2>
                <p className="text-sm text-muted-foreground">Technical and organisational measures we implement.</p>
              </Link>
            </div>

            <div className="mt-12 p-6 bg-primary/5 rounded-lg border border-border/50">
              <h2 className="text-lg font-semibold text-foreground mb-2">Questions?</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                If you have any questions about our practices, please reach out at <strong>hello@flowsert.com</strong>.
              </p>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
