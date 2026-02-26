import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';
import { Shield, Lock, Eye, Server } from 'lucide-react';

export default function SecurityPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold font-rajdhani text-foreground mb-2">Security</h1>
            <p className="text-muted-foreground mb-10">Version 1.0 — Last updated: February 2026</p>

            <p className="text-muted-foreground leading-relaxed mb-8">
              Protecting your data is a core priority at FlowSert. This page describes the technical and organisational measures we implement to keep your data safe.
            </p>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-1">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Encryption</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    All data is encrypted in transit (TLS 1.2+) and at rest (AES-256). Database backups are encrypted and stored in the EU.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-1">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Access Control</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Role-based access controls (RBAC) enforce the principle of least privilege. Row-level security (RLS) policies ensure users can only access data they are authorized to see. All administrative actions are logged.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-1">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Monitoring &amp; Incident Response</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    We monitor infrastructure and application logs continuously. Anomalous activity triggers automated alerts. In the event of a data breach, we will notify affected Customers within 72 hours as required by GDPR.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-1">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Infrastructure</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    The Service is hosted on EU-based infrastructure (Frankfurt) with automatic failover and daily backups retained for 30 days. Our hosting provider maintains SOC 2 Type II and ISO 27001 certifications.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-1">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Data Backup &amp; Recovery</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Automated daily backups are retained for 30 days and stored encrypted in the EU. Point-in-time recovery is available. Backup integrity is verified regularly through automated restoration tests.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-1">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Employee Security</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    All team members undergo security awareness training and follow least-privilege access principles. Access to production systems is limited, logged, and requires multi-factor authentication.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-1">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Vendor Management</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    We assess the security posture of all sub-processors before onboarding and review them annually. Sub-processors are contractually bound by Data Processing Agreements that include Standard Contractual Clauses where required. See our <a href="/subprocessors" className="text-primary hover:underline">Sub-Processors</a> page for the current list.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 p-6 bg-primary/5 rounded-lg border border-border/50">
              <h2 className="text-lg font-semibold text-foreground mb-2">Responsible Disclosure</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                If you discover a security vulnerability, please report it to <strong>hello@flowsert.com</strong>. We ask that you give us reasonable time to address the issue before public disclosure.
              </p>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
