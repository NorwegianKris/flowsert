import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, CheckCircle, XCircle, ChevronDown, Search, ChevronDownIcon, ShieldAlert } from 'lucide-react';
import { Personnel } from '@/types';
import { useBusinessAcknowledgements } from '@/hooks/useDataAcknowledgement';
import { format } from 'date-fns';
import { RequestReAcknowledgementDialog } from './RequestReAcknowledgementDialog';
import { useBusinessInfo } from '@/hooks/useBusinessInfo';

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
  const { business, refetch: refetchBusiness } = useBusinessInfo();
  const [searchQuery, setSearchQuery] = useState('');
  const [missingOnly, setMissingOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [reAckOpen, setReAckOpen] = useState(false);
  const PAGE_SIZE = 10;

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
      // Search filter
      if (searchQuery.trim() && !p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) return false;

      // Type filter
      if (typeFilter === 'employees' && p.category === 'freelancer') return false;
      if (typeFilter === 'freelancers' && p.category !== 'freelancer') return false;

      // Missing only
      if (missingOnly && ackMap.has(p.id)) return false;

      return true;
    });
  }, [personnel, typeFilter, missingOnly, ackMap, searchQuery]);

  const visiblePersonnel = useMemo(() => {
    return showAll ? filteredPersonnel : filteredPersonnel.slice(0, PAGE_SIZE);
  }, [filteredPersonnel, showAll]);

  const acknowledgedCount = personnel.filter((p) => ackMap.has(p.id)).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-lg font-semibold flex items-center justify-between">
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
            {/* Coverage indicator + action */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Acknowledgement coverage:{' '}
                <span className="font-semibold text-foreground">
                  {acknowledgedCount} of {personnel.length}
                </span>{' '}
                personnel acknowledged
                <span className="ml-2 text-xs">(v{business?.required_ack_version || '1.0'})</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setReAckOpen(true)}>
                <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
                Request Re-acknowledgement
              </Button>
            </div>

            <RequestReAcknowledgementDialog
              open={reAckOpen}
              onOpenChange={setReAckOpen}
              personnel={personnel}
              currentVersion={business?.required_ack_version || '1.0'}
              onSuccess={refetchBusiness}
            />

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowAll(false); }}
                  className="pl-9"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="missing-only"
                  checked={missingOnly}
                  onCheckedChange={setMissingOnly}
                />
                <Label htmlFor="missing-only" className="text-sm">
                  Missing only
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
              <>
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
                    {visiblePersonnel.map((p) => {
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
                {!showAll && filteredPersonnel.length > PAGE_SIZE && (
                  <Button
                    variant="ghost"
                    className="w-full mt-2"
                    onClick={() => setShowAll(true)}
                  >
                    <ChevronDownIcon className="h-4 w-4 mr-1" />
                    View more ({filteredPersonnel.length - PAGE_SIZE} remaining)
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
