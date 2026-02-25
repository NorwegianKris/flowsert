import { useEffect, useRef } from 'react';
import forsideImg from '@/assets/forside.jpg';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  onGetInTouch: () => void;
  onBookDemo: () => void;
}

type DocType = 'cert' | 'id' | 'checklist' | 'form';
const DOC_TYPES: DocType[] = ['cert', 'id', 'checklist', 'form'];

interface FallingDoc {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  docType: DocType;
}

function createDoc(canvasW: number, canvasH: number): FallingDoc {
  const w = 55 + Math.random() * 40;
  const h = w * (1.3 + Math.random() * 0.4);
  return {
    x: Math.random() * canvasW,
    y: -h - Math.random() * canvasH * 0.6,
    w,
    h,
    speed: 0.15 + Math.random() * 0.3,
    rotation: (Math.random() - 0.5) * 0.3,
    rotationSpeed: (Math.random() - 0.5) * 0.002,
    docType: DOC_TYPES[Math.floor(Math.random() * 4)],
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
      docs = Array.from({ length: 65 }, () => {
        const d = createDoc(rect.width, rect.height);
        d.y = Math.random() * rect.height;
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
        ctx.globalAlpha = 1;
        ctx.lineCap = 'round';

        // doc body
        drawRoundRect(ctx, -d.w / 2, -d.h / 2, d.w, d.h, 4);
        ctx.fillStyle = 'hsla(215, 38%, 75%, 0.5)';
        ctx.fill();
        ctx.strokeStyle = 'hsla(215, 42%, 55%, 0.45)';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // internal details
        const detailColor = 'hsla(215, 42%, 55%, 0.45)';
        ctx.strokeStyle = detailColor;
        ctx.fillStyle = detailColor;
        ctx.lineWidth = 1.8;

        const left = -d.w / 2;
        const top = -d.h / 2;

        if (d.docType === 'cert') {
          // badge circle
          ctx.beginPath();
          ctx.arc(left + 12, top + 14, 5, 0, Math.PI * 2);
          ctx.stroke();
          // 4 lines below
          for (let i = 0; i < 4; i++) {
            const lw = d.w * (0.4 + Math.random() * 0.35);
            ctx.beginPath();
            ctx.moveTo(left + 5, top + 28 + i * 9);
            ctx.lineTo(left + 5 + lw, top + 28 + i * 9);
            ctx.stroke();
          }
        } else if (d.docType === 'id') {
          // portrait placeholder
          const pw = d.w * 0.28;
          const ph = d.w * 0.35;
          ctx.strokeRect(left + 5, top + 8, pw, ph);
          // 3 short lines to the right
          const rx = left + 5 + pw + 5;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(rx, top + 14 + i * 8);
            ctx.lineTo(rx + d.w * 0.3, top + 14 + i * 8);
            ctx.stroke();
          }
          // 2 full-width lines below
          for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            ctx.moveTo(left + 5, top + 8 + ph + 8 + i * 9);
            ctx.lineTo(left + d.w - 5, top + 8 + ph + 8 + i * 9);
            ctx.stroke();
          }
        } else if (d.docType === 'checklist') {
          // 4 rows with checkboxes
          for (let i = 0; i < 4; i++) {
            const ry = top + 10 + i * 14;
            ctx.strokeRect(left + 6, ry, 7, 7);
            // checkmark in top 2
            if (i < 2) {
              ctx.beginPath();
              ctx.moveTo(left + 7.5, ry + 4);
              ctx.lineTo(left + 9, ry + 6);
              ctx.lineTo(left + 12, ry + 1.5);
              ctx.stroke();
            }
            // line extending right
            ctx.beginPath();
            ctx.moveTo(left + 17, ry + 3.5);
            ctx.lineTo(left + d.w - 6, ry + 3.5);
            ctx.stroke();
          }
        } else {
          // form: 5 lines
          for (let i = 0; i < 5; i++) {
            const lw = d.w * (0.5 + Math.random() * 0.3);
            ctx.beginPath();
            ctx.moveTo(left + 5, top + 12 + i * 10);
            ctx.lineTo(left + 5 + lw, top + 12 + i * 10);
            ctx.stroke();
          }
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
          background: 'radial-gradient(ellipse 55% 45% at 50% 36%, hsl(209,40%,96%) 10%, hsl(209,40%,96%,0.4) 42%, transparent 100%)',
        }}
      />

      {/* Content */}
      <div className="relative flex flex-col items-center text-center max-w-[720px] px-6" style={{ zIndex: 2 }}>
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

          <img src={forsideImg} alt="FlowSert Dashboard Preview" className="w-full block" />
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
