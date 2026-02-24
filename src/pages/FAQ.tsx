import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import heroBgPattern from '@/assets/hero-bg-pattern.png';

const faqs = [
  {
    question: "What is FlowSert?",
    answer: "FlowSert is a comprehensive personnel certificate management platform that helps businesses track, manage, and verify employee certifications and qualifications. It provides real-time visibility into certification status and expiration dates."
  },
  {
    question: "How do I add personnel to my organization?",
    answer: "You can add personnel through the Admin Dashboard by navigating to the Personnel section and clicking 'Add Personnel'. You can also invite workers via email, and they'll receive a link to join your organization."
  },
  {
    question: "Can I track certificate expiration dates?",
    answer: "Yes! FlowSert automatically tracks all certificate expiration dates and provides visual indicators for certificates that are expiring soon or have already expired. You can also set up notifications to stay ahead of renewals."
  },
  {
    question: "How do workers access their profiles?",
    answer: "Workers receive an invitation link via email. Once they click the link and create their account, they can access their personal dashboard to view and update their information, certificates, and documents."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. FlowSert uses enterprise-grade security with encrypted data storage, secure authentication, and role-based access controls. Your sensitive information is protected at all times."
  },
  {
    question: "Can I manage multiple projects?",
    answer: "Yes, FlowSert includes full project management capabilities. You can create projects, assign personnel, track required certifications per project, and monitor compliance across your entire organization."
  },
  {
    question: "What file formats are supported for document uploads?",
    answer: "FlowSert supports common document formats including PDF, JPG, PNG, and other standard file types. Each uploaded document is securely stored and easily accessible from the personnel or project profile."
  },
  {
    question: "How do I contact support?",
    answer: "You can reach our support team through the Contact Us page, or by using the feedback feature within the application. We aim to respond to all inquiries within 24 hours."
  }
];

export default function FAQ() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero Section - document pattern */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url(${heroBgPattern})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold font-rajdhani text-foreground mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Find answers to common questions about FlowSert and how it can help your business.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section - lavender */}
      <section className="py-8 pb-24 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-card border border-border/50 rounded-lg px-6 data-[state=open]:shadow-sm"
                >
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Section - document pattern */}
      <section className="py-16 relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url(${heroBgPattern})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-2xl font-bold font-rajdhani text-foreground mb-4">Still have questions?</h2>
          <p className="text-muted-foreground mb-6">Our team is here to help you get started.</p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/contact')}>
              Contact Us
            </Button>
            <Button onClick={() => navigate('/contact')}>
              Get Started
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
