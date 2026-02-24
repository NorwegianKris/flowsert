import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert">
            <h1 className="text-3xl font-bold font-rajdhani text-foreground mb-2">Privacy Policy</h1>
            <p className="text-muted-foreground mb-8">Version 1.0 — Effective 1 February 2026</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Data Controller</h2>
            <p className="text-muted-foreground leading-relaxed">
              FlowSert AS, org. no. 935 195 894, Stavanger, Norway, is the data controller for personal data processed through the FlowSert platform. Contact: <strong>hello@flowsert.com</strong>.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. What We Collect</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Account data</strong> — name, email address, business affiliation.</li>
              <li><strong>Certificate data</strong> — certificate names, issue/expiry dates, issuing authorities, uploaded documents.</li>
              <li><strong>Usage data</strong> — login timestamps, feature usage for analytics and troubleshooting.</li>
              <li><strong>Communication data</strong> — messages sent through the in-app messaging system.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. Legal Basis (GDPR Art. 6)</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Contract</strong> (Art. 6(1)(b)) — processing necessary to provide the Service.</li>
              <li><strong>Legitimate interest</strong> (Art. 6(1)(f)) — security, fraud prevention, product improvement.</li>
              <li><strong>Consent</strong> (Art. 6(1)(a)) — optional communications and analytics cookies.</li>
              <li><strong>Legal obligation</strong> (Art. 6(1)(c)) — tax records, regulatory compliance.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. How We Use Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use personal data to: operate and improve the Service; send transactional notifications (e.g., certificate expiry alerts); provide customer support; comply with legal requirements; and generate anonymized, aggregated analytics.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Sub-Processors</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use selected third-party sub-processors to deliver the Service. A current list is maintained at{' '}
              <a href="/subprocessors" className="text-primary hover:underline">/subprocessors</a>. We will notify Customers at least 30 days before adding a new sub-processor.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. International Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Data is hosted within the EU/EEA. Where transfers outside the EEA are necessary (e.g., AI model providers), we rely on EU Standard Contractual Clauses or an adequacy decision.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">7. Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              Customer Data is retained for the duration of the subscription plus 90 days. Account data is retained for up to 12 months after account deletion for legal and audit purposes. Usage logs are retained for 12 months.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Under GDPR you have the right to: access, rectify, erase, restrict processing, data portability, and object to processing. To exercise these rights, contact <strong>hello@flowsert.com</strong>. We will respond within 30 days.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">9. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement technical and organisational measures including encryption at rest and in transit, role-based access controls, and regular security reviews. See our{' '}
              <a href="/security" className="text-primary hover:underline">Security page</a> for details.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">10. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use strictly necessary cookies for authentication and session management. We do not use tracking or advertising cookies.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">11. Changes</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this policy from time to time. Material changes will be communicated with at least 30 days' notice. The version number and effective date at the top of this page will be updated accordingly.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">12. Contact &amp; Complaints</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions or complaints, contact <strong>hello@flowsert.com</strong>. You also have the right to lodge a complaint with the Norwegian Data Protection Authority (Datatilsynet).
            </p>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
