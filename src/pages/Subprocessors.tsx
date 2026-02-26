import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';

export default function Subprocessors() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert">
            <h1 className="text-3xl font-bold font-rajdhani text-foreground mb-2">Sub-Processors</h1>
            <p className="text-muted-foreground mb-8">Version 1.0 — Last updated: February 2026</p>

            <p className="text-muted-foreground leading-relaxed mb-6">
              FlowSert uses the following third-party sub-processors to deliver the Service. We notify Customers at least 30 days before adding a new sub-processor.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground border-b border-border">Sub-Processor</th>
                    <th className="text-left p-3 font-semibold text-foreground border-b border-border">Purpose</th>
                    <th className="text-left p-3 font-semibold text-foreground border-b border-border">Location</th>
                    <th className="text-left p-3 font-semibold text-foreground border-b border-border">Transfer Basis</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="p-3 font-medium">Supabase Inc.</td>
                    <td className="p-3">Database hosting, authentication, file storage, edge functions</td>
                    <td className="p-3">EU (Frankfurt)</td>
                    <td className="p-3">EU Adequacy</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-3 font-medium">Vercel Inc.</td>
                    <td className="p-3">Frontend hosting and CDN</td>
                    <td className="p-3">Global (EU primary)</td>
                    <td className="p-3">SCCs</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-3 font-medium">Resend Inc.</td>
                    <td className="p-3">Transactional email delivery</td>
                    <td className="p-3">US</td>
                    <td className="p-3">SCCs</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-3 font-medium">OpenAI LLC</td>
                    <td className="p-3">AI-assisted certificate data extraction</td>
                    <td className="p-3">US</td>
                    <td className="p-3">SCCs</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">Google LLC</td>
                    <td className="p-3">AI model inference (Gemini)</td>
                    <td className="p-3">US / EU</td>
                    <td className="p-3">SCCs</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Change Notification</h2>
            <p className="text-muted-foreground leading-relaxed">
              We will notify Customers via email at least 30 days before engaging a new sub-processor. If a Customer objects to a new sub-processor, they may terminate their subscription in accordance with the Terms of Service.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Questions about our sub-processors? Contact us at <strong>hello@flowsert.com</strong>.
            </p>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
