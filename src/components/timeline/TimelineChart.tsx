import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { format, differenceInDays } from 'date-fns';
import { TimelineEvent, TimelineRange } from './types';

interface TimelineChartProps {
  events: TimelineEvent[];
  range: TimelineRange;
}

interface ChartDataPoint {
  x: number;
  y: number;
  event: TimelineEvent;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload[0]) return null;
  
  const event = payload[0].payload.event as TimelineEvent;
  
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 max-w-xs">
      <p className="font-semibold text-foreground truncate">{event.personnelName}</p>
      <p className="text-sm text-muted-foreground truncate">{event.certificateName}</p>
      <div className="mt-2 flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: event.color }}
        />
        <span className="text-sm text-foreground">
          {format(event.expiryDate, 'MMM d, yyyy')}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {event.daysUntilExpiry < 0 
          ? `${Math.abs(event.daysUntilExpiry)} days overdue`
          : event.daysUntilExpiry === 0
          ? 'Expires today'
          : `${event.daysUntilExpiry} days remaining`
        }
      </p>
    </div>
  );
}

export function TimelineChart({ events, range }: TimelineChartProps) {
  const navigate = useNavigate();
  
  // Convert events to chart data with jitter for overlapping dates
  const chartData = useMemo((): ChartDataPoint[] => {
    const dateGroups = new Map<string, TimelineEvent[]>();
    
    // Group events by date
    events.forEach(event => {
      const dateKey = format(event.expiryDate, 'yyyy-MM-dd');
      const existing = dateGroups.get(dateKey) || [];
      existing.push(event);
      dateGroups.set(dateKey, existing);
    });
    
    // Create data points with vertical jitter for overlapping dates
    const points: ChartDataPoint[] = [];
    
    dateGroups.forEach((groupEvents) => {
      groupEvents.forEach((event, index) => {
        const totalInGroup = groupEvents.length;
        // Spread points vertically when there are multiple on same date
        const yOffset = totalInGroup > 1 
          ? ((index / (totalInGroup - 1)) - 0.5) * 0.8 
          : 0;
        
        points.push({
          x: event.expiryDate.getTime(),
          y: 0.5 + yOffset, // Center at 0.5 with jitter
          event,
        });
      });
    });
    
    return points;
  }, [events]);
  
  const handleClick = (data: ChartDataPoint) => {
    navigate(`/admin?tab=personnel&personnelId=${data.event.personnelId}`);
  };
  
  // Calculate domain for x-axis
  const xDomain = [range.start.getTime(), range.end.getTime()];
  
  // Calculate today's position for reference line
  const today = new Date().getTime();
  
  // Format tick labels based on range span
  const rangeSpanDays = differenceInDays(range.end, range.start);
  const tickFormatter = (value: number) => {
    const date = new Date(value);
    if (rangeSpanDays <= 30) {
      return format(date, 'MMM d');
    } else if (rangeSpanDays <= 90) {
      return format(date, 'MMM d');
    } else {
      return format(date, 'MMM yyyy');
    }
  };
  
  if (events.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
        No certificate expiry events in the selected date range
      </div>
    );
  }
  
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis
          type="number"
          dataKey="x"
          domain={xDomain}
          tickFormatter={tickFormatter}
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          type="number"
          dataKey="y"
          domain={[0, 1]}
          hide
        />
        <Tooltip content={<CustomTooltip />} />
        
        {/* Today reference line */}
        {today >= xDomain[0] && today <= xDomain[1] && (
          <ReferenceLine
            x={today}
            stroke="hsl(var(--primary))"
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{
              value: 'Today',
              position: 'top',
              fill: 'hsl(var(--primary))',
              fontSize: 11,
            }}
          />
        )}
        
        <Scatter
          data={chartData}
          onClick={(data) => handleClick(data)}
          cursor="pointer"
        >
          {chartData.map((point, index) => (
            <Cell
              key={`cell-${index}`}
              fill={point.event.color}
              stroke={point.event.color}
              strokeWidth={2}
              r={8}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
