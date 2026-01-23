import flowsertLogo from '@/assets/flowsert-logo.png';

interface LogoProps {
  className?: string;
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-5 ${className}`}>
      {/* Icon cropped from original logo using overflow hidden - 2x size */}
      <div className="h-28 w-28 overflow-hidden flex-shrink-0 relative">
        <img 
          src={flowsertLogo} 
          alt="" 
          className="absolute h-28 w-auto max-w-none"
          style={{ 
            left: 0,
            transform: 'scale(1.1)',
            transformOrigin: 'left center'
          }}
        />
      </div>
      {/* Crisp text matching original logo style - 2x size */}
      <span className="text-5xl font-semibold text-[#1e293b] tracking-tight" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
        FlowSert
      </span>
    </div>
  );
}
