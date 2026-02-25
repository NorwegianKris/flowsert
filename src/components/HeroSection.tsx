import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  onGetInTouch: () => void;
  onBookDemo: () => void;
}

interface FallingDoc {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  lines: number;
}

function createDoc(canvasW: number, canvasH: number): FallingDoc {
  const w = 38 + Math.random() * 28;
  const h = w * (1.3 + Math.random() * 0.4);
  return {
    x: Math.random() * canvasW,
    y: -h - Math.random() * canvasH * 0.6,
    w,
    h,
    speed: 0.15 + Math.random() * 0.3,
    rotation: (Math.random() - 0.5) * 0.3,
    rotationSpeed: (Math.random() - 0.5) * 0.002,
    opacity: 0.06 + Math.random() * 0.09,
    lines: 2 + Math.floor(Math.random() * 2),
  };
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default function HeroSection({ onGetInTouch, onBookDemo }: HeroSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let docs: FallingDoc[] = [];
    let animId: number;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const init = () => {
      resize();
      const rect = canvas.getBoundingClientRect();
      docs = Array.from({ length: 18 }, () => {
        const d = createDoc(rect.width, rect.height);
        d.y = Math.random() * rect.height; // spread initially
        return d;
      });
    };

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      for (const d of docs) {
        d.y += d.speed;
        d.rotation += d.rotationSpeed;

        if (d.y > rect.height + d.h) {
          Object.assign(d, createDoc(rect.width, rect.height));
        }

        ctx.save();
        ctx.translate(d.x + d.w / 2, d.y + d.h / 2);
        ctx.rotate(d.rotation);
        ctx.globalAlpha = d.opacity;

        // doc body
        drawRoundRect(ctx, -d.w / 2, -d.h / 2, d.w, d.h, 4);
        ctx.fillStyle = 'hsl(243, 30%, 96%)';
        ctx.fill();
        ctx.strokeStyle = 'hsl(243, 40%, 82%)';
        ctx.lineWidth = 0.7;
        ctx.stroke();

        // text lines
        const lineY0 = -d.h / 2 + d.h * 0.28;
        for (let i = 0; i < d.lines; i++) {
          const lw = d.w * (0.5 + Math.random() * 0.3);
          ctx.fillStyle = 'hsl(243, 40%, 78%)';
          ctx.fillRect(-d.w / 2 + 5, lineY0 + i * 7, lw, 2.5);
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(draw);
    };

    init();
    draw();

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-start" style={{ minHeight: 'calc(100vh - 73px)', paddingTop: '96px', paddingBottom: '64px' }}>
      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: 'radial-gradient(ellipse 55% 45% at 50% 36%, hsl(209,40%,96%) 20%, hsl(209,40%,96%,0.4) 52%, transparent 100%)',
        }}
      />

      {/* Content */}
      <div className="relative flex flex-col items-center text-center max-w-[720px] px-6" style={{ zIndex: 2 }}>
        {/* Badge */}
        <div
          className="inline-flex items-center gap-[7px] border border-border rounded-full px-3.5 py-[5px] pl-2.5 font-mono text-[0.73rem] font-semibold text-primary mb-[26px] backdrop-blur-[8px]"
          style={{
            background: 'rgba(255,255,255,0.78)',
            letterSpacing: '0.02em',
            opacity: 0,
            animation: 'fadeUp 0.55s 0.1s ease forwards',
          }}
        >
          <span className="w-[7px] h-[7px] rounded-full bg-primary flex-shrink-0" style={{ boxShadow: '0 0 0 3px hsl(243,75%,41%,0.18)' }} />
          Smart Compliance Platform
        </div>

        {/* Headline */}
        <h1
          className="font-rajdhani font-bold text-foreground mb-5 leading-[1.09]"
          style={{
            fontSize: 'clamp(2.5rem, 5.8vw, 4rem)',
            letterSpacing: '-0.01em',
            opacity: 0,
            animation: 'fadeUp 0.65s 0.22s ease forwards',
          }}
        >
          Make personnel<br />
          compliance{' '}
          <span
            className="inline-block bg-clip-text"
            style={{
              backgroundImage: 'linear-gradient(to right, #4338CA 0%, #4338CA 15%, #6366F1 30%, #C4B5FD 45%, #ffffff 50%, #C4B5FD 55%, #6366F1 70%, #4338CA 85%, #4338CA 100%)',
              backgroundSize: '300% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'flowShimmer 3.5s 1.2s ease-in-out infinite',
            }}
          >
            flow
          </span>
        </h1>

        {/* Subhead */}
        <p
          className="text-muted-foreground max-w-[500px] mb-[34px]"
          style={{
            fontSize: '1.05rem',
            lineHeight: 1.65,
            opacity: 0,
            animation: 'fadeUp 0.65s 0.36s ease forwards',
          }}
        >
          Transform your hiring and compliance operations with smart certificate management software—built for industrial SMEs.
        </p>

        {/* CTA Row */}
        <div
          className="flex gap-3 items-center justify-center flex-wrap mb-[52px]"
          style={{ opacity: 0, animation: 'fadeUp 0.65s 0.5s ease forwards' }}
        >
          <button
            onClick={onGetInTouch}
            className="inline-flex items-center gap-[7px] bg-primary text-primary-foreground font-bold rounded-lg cursor-pointer border-none"
            style={{
              fontSize: '0.92rem',
              padding: '12px 22px',
              letterSpacing: '0.01em',
              boxShadow: '0 4px 18px hsl(243,75%,41%,0.30)',
              transition: 'background 0.15s, transform 0.15s, box-shadow 0.15s',
            }}
          >
            Get in Touch <span>→</span>
          </button>
          <button
            onClick={onBookDemo}
            className="inline-flex items-center gap-[7px] text-foreground font-bold rounded-lg cursor-pointer backdrop-blur-[6px]"
            style={{
              fontSize: '0.92rem',
              padding: '11px 22px',
              letterSpacing: '0.01em',
              background: 'rgba(255,255,255,0.72)',
              border: '1.5px solid hsl(220,20%,88%)',
              transition: 'border-color 0.15s, background 0.15s, transform 0.15s',
            }}
          >
            Book a Demo
          </button>
        </div>
      </div>

      {/* Dashboard Card */}
      <div
        className="relative w-full max-w-[660px] px-6"
        style={{ zIndex: 2, opacity: 0, animation: 'fadeUp 0.8s 0.62s ease forwards' }}
      >
        <div
          className="overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.82)',
            border: '1px solid rgba(255,255,255,0.92)',
            borderRadius: '14px',
            backdropFilter: 'blur(14px)',
            boxShadow: '0 1px 0 rgba(255,255,255,1) inset, 0 2px 8px hsl(243,75%,41%,0.04), 0 20px 55px rgba(10,18,60,0.10)',
          }}
        >
          {/* Titlebar */}
          <div className="flex items-center gap-2 px-3.5 py-[9px] border-b border-border" style={{ background: 'rgba(247,248,252,0.92)' }}>
            <div className="flex gap-[5px]">
              <div className="w-[10px] h-[10px] rounded-full" style={{ background: '#ff5f57' }} />
              <div className="w-[10px] h-[10px] rounded-full" style={{ background: '#febc2e' }} />
              <div className="w-[10px] h-[10px] rounded-full" style={{ background: '#29c840' }} />
            </div>
            <span className="font-mono text-[0.68rem] text-muted-foreground ml-1">FlowSert Dashboard</span>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <div className="flex-1 py-[9px] text-[0.76rem] font-semibold text-center flex items-center justify-center gap-[5px] bg-primary text-primary-foreground/88">
              👤 Personnel
            </div>
            <div
              className="flex-1 py-[9px] text-[0.76rem] font-semibold text-center flex items-center justify-center gap-[5px] bg-card text-foreground"
              style={{ boxShadow: 'inset 0 -2px 0 hsl(243,75%,41%)' }}
            >
              🗂 Overview
            </div>
            <div className="flex-1 py-[9px] text-[0.76rem] font-semibold text-center flex items-center justify-center gap-[5px] bg-primary text-primary-foreground/88">
              📁 Projects
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-5 px-[18px] py-3 border-b border-border flex-wrap">
            <div className="flex flex-col gap-[2px]">
              <span className="font-rajdhani text-[1.3rem] font-bold leading-none text-foreground">393</span>
              <span className="text-[0.62rem] font-medium text-muted-foreground">Total Certificates</span>
            </div>
            <div className="flex flex-col gap-[2px]">
              <span className="font-rajdhani text-[1.3rem] font-bold leading-none text-foreground">358</span>
              <span className="text-[0.62rem] font-medium text-muted-foreground">Valid</span>
            </div>
            <div className="flex flex-col gap-[2px]">
              <span className="font-rajdhani text-[1.3rem] font-bold leading-none" style={{ color: 'hsl(14,82%,52%)' }}>26</span>
              <span className="text-[0.62rem] font-medium text-muted-foreground">Expired</span>
            </div>
            <div className="ml-auto flex gap-[5px]">
              <span
                className="text-[0.67rem] font-semibold px-[9px] py-[3px] rounded-[20px] bg-primary text-primary-foreground border-transparent"
              >
                All
              </span>
              <span
                className="text-[0.67rem] font-semibold px-[9px] py-[3px] rounded-[20px] border"
                style={{ background: 'rgba(99,102,241,0.07)', color: 'hsl(243,75%,41%)', borderColor: 'rgba(99,102,241,0.14)' }}
              >
                Employees
              </span>
              <span
                className="text-[0.67rem] font-semibold px-[9px] py-[3px] rounded-[20px] border"
                style={{ background: 'rgba(99,102,241,0.07)', color: 'hsl(243,75%,41%)', borderColor: 'rgba(99,102,241,0.14)' }}
              >
                Freelancers
              </span>
            </div>
          </div>

          {/* Expiry label */}
          <div className="px-[18px] pt-[10px] pb-[5px] text-[0.73rem] font-bold text-foreground flex items-baseline gap-[5px]">
            ⏱ Expiry Timeline
            <span className="text-[0.62rem] font-normal text-muted-foreground">Click any group or lane to view affected certificates and personnel</span>
          </div>

          {/* Expiry Grid */}
          <div className="grid grid-cols-4 gap-[7px] px-3.5 pb-3.5 pt-[5px]">
            {/* Overdue */}
            <div className="rounded-lg p-[10px]" style={{ background: 'hsl(0,80%,97%)', border: '1px solid hsl(0,65%,88%)' }}>
              <div className="text-[0.68rem] font-bold mb-[5px]" style={{ color: 'hsl(0,68%,44%)' }}>⚠ Overdue</div>
              <div className="font-rajdhani text-[1.2rem] font-bold text-foreground mb-[1px]">26</div>
              <div className="text-muted-foreground text-[0.61rem] leading-[1.4]">certificates<br />9 personnel affected</div>
              <div className="mt-[6px] pt-[5px] text-muted-foreground text-[0.6rem]" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>Certificates past expiry date</div>
            </div>
            {/* 30 days */}
            <div className="rounded-lg p-[10px]" style={{ background: 'hsl(30,88%,97%)', border: '1px solid hsl(30,75%,87%)' }}>
              <div className="text-[0.68rem] font-bold mb-[5px]" style={{ color: 'hsl(25,82%,40%)' }}>🔶 Next 30 Days</div>
              <div className="font-rajdhani text-[1.2rem] font-bold text-foreground mb-[1px]">4</div>
              <div className="text-muted-foreground text-[0.61rem] leading-[1.4]">certificates<br />4 personnel affected</div>
              <div className="mt-[6px] pt-[5px] text-muted-foreground text-[0.6rem]" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>Expiring within 30 days</div>
            </div>
            {/* 31-60 */}
            <div className="rounded-lg p-[10px]" style={{ background: 'hsl(46,95%,97%)', border: '1px solid hsl(46,85%,86%)' }}>
              <div className="text-[0.68rem] font-bold mb-[5px]" style={{ color: 'hsl(38,78%,38%)' }}>🔷 31–60 Days</div>
              <div className="font-rajdhani text-[1.2rem] font-bold text-foreground mb-[1px]">5</div>
              <div className="text-muted-foreground text-[0.61rem] leading-[1.4]">certificates<br />5 personnel affected</div>
              <div className="mt-[6px] pt-[5px] text-muted-foreground text-[0.6rem]" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>Expiring in 31 to 60 days</div>
            </div>
            {/* 61-90 */}
            <div className="rounded-lg p-[10px]" style={{ background: 'hsl(142,50%,96%)', border: '1px solid hsl(142,40%,84%)' }}>
              <div className="text-[0.68rem] font-bold mb-[5px]" style={{ color: 'hsl(142,50%,30%)' }}>✅ 61–90 Days</div>
              <div className="font-rajdhani text-[1.2rem] font-bold text-foreground mb-[1px]">6</div>
              <div className="text-muted-foreground text-[0.61rem] leading-[1.4]">certificates<br />5 personnel affected</div>
              <div className="mt-[6px] pt-[5px] text-muted-foreground text-[0.6rem]" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>Expiring in 61 to 90 days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Industry Strip */}
      <div
        className="relative flex gap-[10px] items-center justify-center flex-wrap mt-[30px]"
        style={{ zIndex: 2, opacity: 0, animation: 'fadeUp 0.65s 0.82s ease forwards' }}
      >
        <span className="font-mono text-[0.975rem] font-normal uppercase tracking-[0.12em] text-muted-foreground opacity-65">Offshore</span>
        <div className="w-px h-4 bg-muted-foreground opacity-[0.28]" />
        <span className="font-mono text-[0.975rem] font-normal uppercase tracking-[0.12em] text-muted-foreground opacity-65">Maritime</span>
        <div className="w-px h-4 bg-muted-foreground opacity-[0.28]" />
        <span className="font-mono text-[0.975rem] font-normal uppercase tracking-[0.12em] text-muted-foreground opacity-65">Industry</span>
        <div className="w-px h-4 bg-muted-foreground opacity-[0.28]" />
        <span className="font-mono text-[0.975rem] font-normal uppercase tracking-[0.12em] text-muted-foreground opacity-65">Construction</span>
      </div>
    </div>
  );
}
