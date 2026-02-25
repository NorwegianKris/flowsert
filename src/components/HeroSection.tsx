import { useEffect, useRef } from 'react';
import forsideImg from '@/assets/forside.jpg';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  onGetInTouch: () => void;
  onBookDemo: () => void;
}

type DocType = 'cert' | 'id' | 'checklist' | 'form' | 'badge' | 'passport';
const DOC_TYPES: DocType[] = ['cert', 'id', 'checklist', 'form', 'badge', 'passport'];

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
  const w = 60 + Math.random() * 40;
  const h = w * (1.3 + Math.random() * 0.4);
  return {
    x: Math.random() * canvasW,
    y: -h - Math.random() * 200,
    w,
    h,
    speed: 0.3 + Math.random() * 0.9,
    rotation: (Math.random() - 0.5) * (50 * Math.PI / 180),
    rotationSpeed: (Math.random() - 0.5) * 0.002,
    docType: DOC_TYPES[Math.floor(Math.random() * DOC_TYPES.length)],
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
      const count = 78;
      docs = Array.from({ length: count }, () => {
        const d = createDoc(rect.width, rect.height);
        d.x = Math.random() * rect.width;
        d.y = Math.random() * rect.height * 1.5 - rect.height * 0.5;
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

        const hw = d.w / 2;
        const hh = d.h / 2;
        const left = -hw;
        const top = -hh;

        // drop shadow
        drawRoundRect(ctx, left + 2, top + 2, d.w, d.h, 4);
        ctx.fillStyle = 'hsla(220, 40%, 70%, 0.15)';
        ctx.fill();

        // card body
        drawRoundRect(ctx, left, top, d.w, d.h, 4);
        ctx.fillStyle = 'hsla(220, 40%, 97%, 0.75)';
        ctx.fill();
        ctx.strokeStyle = 'hsla(220, 50%, 75%, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // detail defaults
        const detailColor = 'hsla(220, 30%, 65%, 0.7)';
        ctx.strokeStyle = detailColor;
        ctx.fillStyle = detailColor;
        ctx.lineWidth = 1.8;

        const pad = 6;

        if (d.docType === 'cert') {
          // header bar
          const barH = d.h * 0.28;
          ctx.fillStyle = 'hsla(243, 60%, 88%, 0.8)';
          drawRoundRect(ctx, left, top, d.w, barH, 4);
          ctx.fill();
          // clip bottom corners of header to card
          ctx.fillRect(left, top + barH - 4, d.w, 4);

          // circle/star in header
          ctx.beginPath();
          ctx.arc(0, top + barH / 2, 8, 0, Math.PI * 2);
          ctx.strokeStyle = 'hsla(243, 70%, 55%, 0.9)';
          ctx.lineWidth = 1.8;
          ctx.stroke();

          // 4 lines below header
          ctx.strokeStyle = detailColor;
          const widths = [0.85, 0.70, 0.80, 0.55];
          const lineAreaTop = top + barH + 8;
          const lineAreaH = d.h - barH - 14;
          const spacing = lineAreaH / 4;
          for (let i = 0; i < 4; i++) {
            const lw = d.w * widths[i];
            const ly = lineAreaTop + i * spacing;
            ctx.beginPath();
            ctx.moveTo(-lw / 2, ly);
            ctx.lineTo(lw / 2, ly);
            ctx.stroke();
          }
        } else if (d.docType === 'id') {
          // portrait rect
          const pw = d.w * 0.30;
          const ph = d.h * 0.45;
          const px = left + pad;
          const py = top + pad;
          ctx.strokeStyle = detailColor;
          ctx.strokeRect(px, py, pw, ph);

          // silhouette: head circle
          const cx = px + pw / 2;
          const headR = pw * 0.22;
          const headY = py + ph * 0.32;
          ctx.beginPath();
          ctx.arc(cx, headY, headR, 0, Math.PI * 2);
          ctx.stroke();
          // shoulders arc
          ctx.beginPath();
          ctx.arc(cx, headY + headR + pw * 0.38, pw * 0.35, Math.PI, 0);
          ctx.stroke();

          // 3 short lines to the right
          const rx = px + pw + 6;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(rx, py + 8 + i * 10);
            ctx.lineTo(rx + d.w * 0.32, py + 8 + i * 10);
            ctx.stroke();
          }

          // divider
          const divY = py + ph + 8;
          ctx.beginPath();
          ctx.moveTo(left + pad, divY);
          ctx.lineTo(left + d.w - pad, divY);
          ctx.stroke();

          // 2 full-width lines below
          for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            ctx.moveTo(left + pad, divY + 10 + i * 10);
            ctx.lineTo(left + d.w - pad, divY + 10 + i * 10);
            ctx.stroke();
          }
        } else if (d.docType === 'checklist') {
          // header line
          ctx.beginPath();
          ctx.moveTo(left + pad, top + 10);
          ctx.lineTo(left + d.w * 0.65, top + 10);
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.lineWidth = 1.8;

          // 4 checkbox rows
          for (let i = 0; i < 4; i++) {
            const ry = top + 22 + i * 16;
            // rounded checkbox 8×8
            drawRoundRect(ctx, left + pad, ry, 8, 8, 1.5);
            ctx.stroke();
            // checkmark in first 3
            if (i < 3) {
              ctx.beginPath();
              ctx.moveTo(left + pad + 1.5, ry + 4.5);
              ctx.lineTo(left + pad + 3.5, ry + 6.5);
              ctx.lineTo(left + pad + 6.5, ry + 1.5);
              ctx.stroke();
            }
            // line extending right
            const lw = d.w * (i % 2 === 0 ? 0.75 : 0.90);
            ctx.beginPath();
            ctx.moveTo(left + pad + 12, ry + 4);
            ctx.lineTo(left + pad + 12 + lw - pad - 18, ry + 4);
            ctx.stroke();
          }
        } else if (d.docType === 'form') {
          // form: 5 lines of alternating widths
          const widths = [0.75, 0.90, 0.60, 0.85, 0.70];
          for (let i = 0; i < 5; i++) {
            const lw = (d.w - pad * 2) * widths[i];
            const ly = top + 10 + i * ((d.h - 20) / 5);
            ctx.beginPath();
            ctx.moveTo(left + pad, ly);
            ctx.lineTo(left + pad + lw, ly);
            ctx.stroke();
          }
        } else if (d.docType === 'badge') {
          // badge: large circle + 2 short lines below
          const cr = d.w * 0.35;
          const cy = top + pad + cr + 4;
          ctx.beginPath();
          ctx.arc(0, cy, cr, 0, Math.PI * 2);
          ctx.stroke();
          // 2 short centered lines below circle
          const lineY1 = cy + cr + 10;
          const lineY2 = lineY1 + 10;
          const shortW = d.w * 0.4;
          ctx.beginPath();
          ctx.moveTo(-shortW / 2, lineY1);
          ctx.lineTo(shortW / 2, lineY1);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-shortW / 2, lineY2);
          ctx.lineTo(shortW / 2, lineY2);
          ctx.stroke();
        } else {
          // passport: thick title, divider, 2x3 grid
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(left + pad, top + 10);
          ctx.lineTo(left + d.w * 0.60, top + 10);
          ctx.stroke();

          // divider
          ctx.lineWidth = 1;
          const divY = top + 20;
          ctx.beginPath();
          ctx.moveTo(left + pad, divY);
          ctx.lineTo(left + d.w - pad, divY);
          ctx.stroke();

          // 2 rows x 3 cols grid of small rects
          ctx.lineWidth = 1.8;
          const gridTop = divY + 6;
          const cellW = (d.w - pad * 2 - 8) / 3;
          const cellH = (d.h - (gridTop - top) - pad - 4) / 2;
          for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 3; c++) {
              const cx = left + pad + c * (cellW + 4);
              const cy = gridTop + r * (cellH + 4);
              ctx.strokeRect(cx, cy, cellW, cellH);
            }
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
