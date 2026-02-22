import { format, parseISO } from 'date-fns';
import { ComplianceBar as ComplianceBarType } from './types';
import { complianceColor, complianceLabel, dateToX } from './utils';
import { LANE_HEIGHT } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ComplianceLaneProps {
  bars: ComplianceBarType[];
  projectStart: string;
  projectEnd: string;
  totalWidth: number;
  onScrollToCertificates?: () => void;
}

export function ComplianceLane({
  bars,
  projectStart,
  projectEnd,
  totalWidth,
  onScrollToCertificates,
}: ComplianceLaneProps) {
  // Show a summary bar per certificate spanning the project duration
  // Color indicates worst status
  const laneRows = bars.length > 0 ? bars.length : 1;
  const rowHeight = 16;

  return (
    <div className="flex items-stretch">
      {/* Label */}
      <div className="w-[160px] flex-shrink-0 flex items-center pl-8 pr-3 py-0.5 border-r border-border/30">
        <span className="text-[10px] text-muted-foreground truncate">Compliance</span>
      </div>

      {/* Lane */}
      <div
        className="relative flex-1 bg-emerald-500/[0.03] cursor-pointer"
        style={{ minHeight: Math.max(LANE_HEIGHT, laneRows * (rowHeight + 2) + 4), width: totalWidth }}
        onClick={onScrollToCertificates}
      >
        {bars.map((bar, i) => {
          // Each certificate bar spans the full project width, colored by status
          const expiry = bar.certificate.expiryDate ? parseISO(bar.certificate.expiryDate) : null;
          const projEnd = parseISO(projectEnd);
          const projStart = parseISO(projectStart);

          // Bar goes from project start to min(expiry, projEnd) for expired/warning
          let barEnd = totalWidth;
          if (expiry && bar.status === 'warning') {
            barEnd = dateToX(expiry, projectStart, projectEnd, totalWidth);
          } else if (expiry && bar.status === 'expired') {
            barEnd = Math.max(dateToX(expiry, projectStart, projectEnd, totalWidth), 8);
          }

          const barStart = 0;
          const width = Math.max(barEnd - barStart, 6);

          return (
            <Tooltip key={bar.certificate.id || i}>
              <TooltipTrigger asChild>
                <div
                  className={`absolute rounded-sm ${complianceColor(bar.status)} hover:opacity-80 transition-opacity`}
                  style={{
                    left: barStart,
                    width,
                    top: 2 + i * (rowHeight + 2),
                    height: rowHeight,
                  }}
                >
                  <span className="text-[9px] text-white px-1 truncate block leading-[16px]">
                    {[bar.certificate.category, bar.certificate.name, bar.certificate.issuingAuthority]
                      .filter(Boolean)
                      .join(' – ')}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">
                  {[bar.certificate.category, bar.certificate.name, bar.certificate.issuingAuthority]
                    .filter(Boolean)
                    .join(' – ')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {expiry
                    ? `Expires: ${format(expiry, 'MMM d, yyyy')}`
                    : 'No expiry date'}
                </p>
                <p className="text-xs">{complianceLabel(bar.status)}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {bars.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground/60">No certificates</span>
          </div>
        )}
      </div>
    </div>
  );
}
