import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert">
            <h1 className="text-3xl font-bold font-rajdhani text-foreground mb-2">Terms of Service</h1>
            <p className="text-muted-foreground mb-8">Version 1.0 — Effective 1 February 2026</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms of Service ("Terms") govern your use of FlowSert, a personnel certificate management platform operated by FlowSert AS, org. no. 935 195 894, Stavanger, Norway ("we", "us", "FlowSert"). By accessing or using the Service you agree to these Terms.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. Definitions</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Service</strong> — the FlowSert web application and related APIs.</li>
              <li><strong>Customer</strong> — the business entity that subscribes to the Service.</li>
              <li><strong>User</strong> — any individual granted access by a Customer (admins, managers, workers).</li>
              <li><strong>Customer Data</strong> — all data uploaded or entered by the Customer or its Users.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. Account &amp; Access</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must provide accurate information when creating an account. You are responsible for safeguarding your credentials and for all activity under your account. Notify us immediately at <strong>hello@flowsert.com</strong> if you suspect unauthorized access.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may use the Service only for lawful purposes and in compliance with these Terms. You shall not: (a) reverse-engineer, copy, or create derivative works of the Service; (b) upload malicious content; (c) attempt to gain unauthorized access to any part of the Service; or (d) use the Service to store or process data you do not have the right to process.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Customer Data &amp; Ownership</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Customer retains all rights to Customer Data. We will not access Customer Data except to provide and improve the Service, comply with law, or as directed by the Customer. Upon termination, Customer Data will be deleted within 90 days unless legally required to retain it.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All rights in the Service (software, design, trademarks) remain with FlowSert. These Terms do not grant you any rights to our intellectual property except a limited, non-exclusive, non-transferable licence to use the Service during the subscription period.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">7. Subscription &amp; Payment</h2>
            <p className="text-muted-foreground leading-relaxed">
              Access to the Service requires a paid subscription as described on our website or in an individual agreement. Fees are invoiced in advance and are non-refundable except as required by law. We may change pricing with 30 days' notice before the next billing period.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">8. Availability &amp; Support</h2>
            <p className="text-muted-foreground leading-relaxed">
              We target 99.5 % uptime (measured monthly, excluding scheduled maintenance). Support is available via email at <strong>hello@flowsert.com</strong> during Norwegian business hours. We do not guarantee specific response or resolution times unless agreed separately.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, FlowSert's aggregate liability for any claims arising from these Terms or the Service shall not exceed the fees paid by the Customer in the 12 months preceding the event giving rise to the claim. We are not liable for indirect, incidental, or consequential damages.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">10. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              Either party may terminate the subscription by giving 30 days' written notice before the end of the current billing period. We may suspend access immediately if you breach these Terms. Sections 5, 6, 9, and 12 survive termination.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">11. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. Material changes will be communicated with at least 30 days' notice via email or in-app notification. Continued use after the effective date constitutes acceptance.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">12. Governing Law &amp; Disputes</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of Norway. Any dispute arising from these Terms shall be settled by the Stavanger District Court as the agreed venue.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">13. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Questions about these Terms? Contact us at <strong>hello@flowsert.com</strong>.
            </p>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
