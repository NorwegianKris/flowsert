import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import { Personnel } from '@/types';
import { useBusinessAcknowledgements } from '@/hooks/useDataAcknowledgement';
import { format } from 'date-fns';

interface DataAcknowledgementsManagerProps {
  personnel: Personnel[];
  businessId: string | undefined;
  onPersonnelClick: (person: Personnel) => void;
}

export function DataAcknowledgementsManager({
  personnel,
  businessId,
  onPersonnelClick,
}: DataAcknowledgementsManagerProps) {
  const { acknowledgements, loading } = useBusinessAcknowledgements(businessId);
  const [missingOnly, setMissingOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);

  // Build a map of personnel_id -> latest acknowledgement
  const ackMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const ack of acknowledgements) {
      const existing = map.get(ack.personnel_id);
      if (!existing || new Date(ack.acknowledged_at) > new Date(existing.acknowledged_at)) {
        map.set(ack.personnel_id, ack);
      }
    }
    return map;
  }, [acknowledgements]);

  const filteredPersonnel = useMemo(() => {
    return personnel.filter((p) => {
      // Type filter
      if (typeFilter === 'employees' && p.category === 'freelancer') return false;
      if (typeFilter === 'freelancers' && p.category !== 'freelancer') return false;

      // Missing only
      if (missingOnly && ackMap.has(p.id)) return false;

      return true;
    });
  }, [personnel, typeFilter, missingOnly, ackMap]);

  const acknowledgedCount = personnel.filter((p) => ackMap.has(p.id)).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Privacy & Data
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Coverage indicator */}
            <div className="text-sm text-muted-foreground">
              Acknowledgement coverage:{' '}
              <span className="font-semibold text-foreground">
                {acknowledgedCount} of {personnel.length}
              </span>{' '}
              personnel acknowledged
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="missing-only"
                  checked={missingOnly}
                  onCheckedChange={setMissingOnly}
                />
                <Label htmlFor="missing-only" className="text-sm">
                  Missing acknowledgement only
                </Label>
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Personnel</SelectItem>
                  <SelectItem value="employees">Employees</SelectItem>
                  <SelectItem value="freelancers">Freelancers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Acknowledged</TableHead>
                    <TableHead>Acknowledged at</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPersonnel.map((p) => {
                    const ack = ackMap.get(p.id);
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer"
                        onClick={() => onPersonnelClick(p)}
                      >
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {p.category === 'freelancer' ? 'Freelancer' : 'Employee'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ack ? (
                            <span className="flex items-center gap-1 text-[hsl(var(--status-valid))]">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Yes
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-destructive">
                              <XCircle className="h-3.5 w-3.5" />
                              No
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ack
                            ? format(new Date(ack.acknowledged_at), 'dd MMM yyyy · HH:mm')
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ack?.acknowledgement_version || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.userId ? 'Self-registered' : 'Invited'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredPersonnel.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No personnel match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
