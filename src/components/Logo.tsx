import flowsertLogo from '@/assets/flowsert-logo.png';

interface LogoProps {
  className?: string;
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon cropped from original logo */}
      <div className="h-14 w-14 overflow-hidden flex-shrink-0 relative">
        <img 
          src={flowsertLogo} 
          alt="" 
          className="absolute h-14 w-auto max-w-none"
          style={{ 
            left: 0,
            transform: 'scale(1.1)',
            transformOrigin: 'left center'
          }}
        />
      </div>
      {/* Crisp text with gradient on "Flow" */}
      <span className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
        <span 
          style={{ 
            background: 'linear-gradient(to right, #C4B5FD, #6366F1, #4338CA)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          Flow
        </span>
        <span className="text-[#1e293b]">Sert</span>
      </span>
    </div>
  );
}
