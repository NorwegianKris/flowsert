import { Shield, Users, Award, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/PublicHeader';
import heroBgPattern from '@/assets/hero-bg-pattern.png';

export default function About() {
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
              About FlowSert
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              FlowSert is a comprehensive personnel certificate management platform designed to streamline 
              the way businesses track, manage, and verify employee certifications and qualifications.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section - lavender */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold font-rajdhani text-foreground mb-4">Our Mission</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We believe that managing personnel certifications shouldn't be a complex, time-consuming task. 
                  Our mission is to provide businesses with an intuitive, efficient solution that ensures 
                  compliance and keeps teams qualified.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  From small teams to large enterprises, FlowSert adapts to your needs, providing 
                  real-time visibility into certification status and expiration dates.
                </p>
              </div>
              <div className="bg-card rounded-xl p-8 border border-border/50 shadow-sm">
                <Target className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Our Goal</h3>
                <p className="text-muted-foreground">
                  To be the leading platform for workforce certification management, 
                  helping businesses maintain compliance effortlessly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section - document pattern */}
      <section className="py-16 relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url(${heroBgPattern})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold font-rajdhani text-foreground mb-12 text-center">Our Values</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Security First</h3>
                <p className="text-muted-foreground text-sm">
                  Your data is protected with enterprise-grade security and encryption.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">User Focused</h3>
                <p className="text-muted-foreground text-sm">
                  Designed with real users in mind, making complex tasks simple and intuitive.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Excellence</h3>
                <p className="text-muted-foreground text-sm">
                  We strive for excellence in every feature and every interaction.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - lavender */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold font-rajdhani text-foreground mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-6">Join industrial businesses managing their certifications with FlowSert.</p>
          <Button onClick={() => navigate('/contact')} size="lg">
            Get Started
          </Button>
        </div>
      </section>
    </div>
  );
}
