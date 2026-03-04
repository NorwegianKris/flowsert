import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ClipboardList, X, Copy, FileDown, CheckCircle } from 'lucide-react';
import { Personnel } from '@/types';
import { getDaysUntilExpiry } from '@/lib/certificateUtils';
import { usePersonnelWorkerGroups } from '@/hooks/usePersonnelWorkerGroups';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { generateCompliancePlanPdf } from '@/lib/compliancePlanPdf';

interface CompliancePlanGeneratorProps {
  personnel: Personnel[];
  personnelFilter: 'all' | 'employees' | 'freelancers' | 'custom';
  customPersonnelIds?: string[];
  customRoles?: string[];
  customWorkerGroupIds?: string[];
  businessName?: string;
}

interface PlanCertEntry {
  personnelName: string;
  personnelId: string;
  certName: string;
  category: string;
  issuingAuthority: string;
  expiryDate: string;
  daysRemaining: number;
}

const PERIOD_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '6 months' },
];

function getDaysBadgeClass(days: number): string {
  if (days < 0) return 'bg-destructive text-destructive-foreground';
  if (days < 30) return 'bg-[hsl(25,95%,53%)] text-destructive-foreground'; // amber
  if (days <= 60) return 'bg-[hsl(48,96%,53%)] text-foreground'; // yellow
  return 'bg-active text-active-foreground'; // green
}

function getDaysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today';
  return `${days}d`;
}

export function CompliancePlanGenerator({
  personnel,
  personnelFilter,
  customPersonnelIds = [],
  customRoles = [],
  customWorkerGroupIds = [],
  businessName,
}: CompliancePlanGeneratorProps) {
  const [period, setPeriod] = useState('90');
  const [planVisible, setPlanVisible] = useState(false);
  const { data: personnelWorkerGroups = [] } = usePersonnelWorkerGroups();

  // Resolve worker group membership
  const workerGroupPersonnelIds = useMemo(() => {
    if (customWorkerGroupIds.length === 0) return new Set<string>();
    const groupSet = new Set(customWorkerGroupIds);
    return new Set(
      personnelWorkerGroups
        .filter(pwg => groupSet.has(pwg.worker_group_id))
        .map(pwg => pwg.personnel_id)
    );
  }, [customWorkerGroupIds, personnelWorkerGroups]);

  // Filter personnel
  const filteredPersonnel = useMemo(() => {
    if (personnelFilter === 'all') return personnel;
    if (personnelFilter === 'employees') return personnel.filter(p => p.category === 'employee');
    if (personnelFilter === 'freelancers') return personnel.filter(p => p.category === 'freelancer');
    if (personnelFilter === 'custom') {
      return personnel.filter(p =>
        customPersonnelIds.includes(p.id) ||
        customRoles.includes(p.role) ||
        workerGroupPersonnelIds.has(p.id)
      );
    }
    return personnel;
  }, [personnel, personnelFilter, customPersonnelIds, customRoles, workerGroupPersonnelIds]);

  const periodDays = parseInt(period);

  // Build plan entries
  const planEntries = useMemo((): PlanCertEntry[] => {
    const entries: PlanCertEntry[] = [];
    filteredPersonnel.forEach(p => {
      p.certificates.forEach(cert => {
        const days = getDaysUntilExpiry(cert.expiryDate);
        if (days === null) return;
        if (days <= periodDays || days < 0) {
          entries.push({
            personnelName: p.name,
            personnelId: p.id,
            certName: cert.name,
            category: cert.category || '—',
            issuingAuthority: cert.issuingAuthority || '—',
            expiryDate: cert.expiryDate!,
            daysRemaining: days,
          });
        }
      });
    });
    entries.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return entries;
  }, [filteredPersonnel, periodDays]);

  // Next upcoming expiry (for "all clear" message)
  const nextExpiry = useMemo(() => {
    let earliest: string | null = null;
    filteredPersonnel.forEach(p => {
      p.certificates.forEach(cert => {
        const days = getDaysUntilExpiry(cert.expiryDate);
        if (days === null || days < 0) return;
        if (!earliest || cert.expiryDate! < earliest) {
          earliest = cert.expiryDate!;
        }
      });
    });
    return earliest;
  }, [filteredPersonnel]);

  // Summary stats
  const summary = useMemo(() => {
    const overdue = planEntries.filter(e => e.daysRemaining < 0).length;
    const expiring = planEntries.filter(e => e.daysRemaining >= 0).length;
    const affectedPersonnel = new Set(planEntries.map(e => e.personnelId)).size;
    const categories = new Set(planEntries.map(e => e.category).filter(c => c !== '—')).size;
    return { overdue, expiring, total: planEntries.length, affectedPersonnel, categories };
  }, [planEntries]);

  // Grouped by personnel
  const byPersonnel = useMemo(() => {
    const map = new Map<string, PlanCertEntry[]>();
    planEntries.forEach(e => {
      const arr = map.get(e.personnelName) || [];
      arr.push(e);
      map.set(e.personnelName, arr);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [planEntries]);

  // Grouped by issuer
  const byIssuer = useMemo(() => {
    const map = new Map<string, PlanCertEntry[]>();
    planEntries.forEach(e => {
      const arr = map.get(e.issuingAuthority) || [];
      arr.push(e);
      map.set(e.issuingAuthority, arr);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [planEntries]);

  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label || period;
  const filterLabel =
    personnelFilter === 'all' ? 'All Personnel' :
    personnelFilter === 'employees' ? 'Employees' :
    personnelFilter === 'freelancers' ? 'Freelancers' : 'Custom Filter';

  const handleGenerate = () => setPlanVisible(true);

  const handleCopy = () => {
    const lines: string[] = [];
    lines.push(`COMPLIANCE PLAN — NEXT ${periodLabel.toUpperCase()}`);
    lines.push(`Generated: ${format(new Date(), 'd MMM yyyy HH:mm')}`);
    lines.push(`Filter: ${filterLabel}`);
    lines.push('');
    lines.push(`Summary: ${summary.total} certificates, ${summary.affectedPersonnel} personnel, ${summary.categories} categories. ${summary.overdue} overdue.`);
    lines.push('');
    lines.push('Priority List:');
    planEntries.forEach(e => {
      lines.push(`  ${e.personnelName} | ${e.certName} | ${e.category} | ${e.issuingAuthority} | ${format(parseISO(e.expiryDate), 'd MMM yyyy')} | ${getDaysLabel(e.daysRemaining)}`);
    });
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Plan copied to clipboard');
  };

  const handlePdf = async () => {
    try {
      const doc = await generateCompliancePlanPdf({
        entries: planEntries,
        periodLabel,
        filterLabel,
        businessName,
        summary,
        byPersonnel,
        byIssuer,
      });
      doc.save(`compliance-plan-${period}d-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF downloaded');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="space-y-0">
      {/* Trigger bar */}
      <div className="flex items-center justify-between p-3 border rounded-lg bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          <span className="font-medium text-sm">Generate Compliance Plan</span>
        </div>
        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            value={period}
            onValueChange={v => v && setPeriod(v)}
            className="gap-0"
          >
            {PERIOD_OPTIONS.map(opt => (
              <ToggleGroupItem
                key={opt.value}
                value={opt.value}
                className="text-xs px-3 h-8 border border-primary-foreground/30 text-primary-foreground data-[state=on]:bg-primary-foreground data-[state=on]:text-primary"
              >
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleGenerate}
          >
            Generate
          </Button>
        </div>
      </div>

      {/* Plan output */}
      {planVisible && (
        <div className="border border-t-0 rounded-b-lg p-4 space-y-6 bg-card">
          {/* Top actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-1" /> Copy to clipboard
              </Button>
              <Button size="sm" variant="outline" onClick={handlePdf}>
                <FileDown className="h-4 w-4 mr-1" /> Download as PDF
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setPlanVisible(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Edge case: no personnel */}
          {filteredPersonnel.length === 0 && (
            <p className="text-sm text-muted-foreground">No personnel match the current filter.</p>
          )}

          {/* Edge case: all clear */}
          {filteredPersonnel.length > 0 && planEntries.length === 0 && (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-5 w-5 text-active" />
              <span>
                All clear — no certificates expiring within {periodLabel}.
                {nextExpiry && (
                  <> Next expiry: <strong>{format(parseISO(nextExpiry), 'd MMM yyyy')}</strong>.</>
                )}
              </span>
            </div>
          )}

          {planEntries.length > 0 && (
            <>
              {/* 1. Summary */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  className={
                    summary.overdue > 0
                      ? 'bg-destructive text-destructive-foreground'
                      : summary.expiring > 0
                      ? 'bg-[hsl(25,95%,53%)] text-destructive-foreground'
                      : 'bg-active text-active-foreground'
                  }
                >
                  {summary.overdue > 0 ? 'Action Required' : summary.expiring > 0 ? 'Expiring Soon' : 'All Clear'}
                </Badge>
                <span className="text-sm">
                  {summary.total} certificate{summary.total !== 1 ? 's' : ''} expiring within {periodLabel}, affecting {summary.affectedPersonnel} personnel across {summary.categories} categor{summary.categories !== 1 ? 'ies' : 'y'}.
                  {summary.overdue > 0 && (
                    <strong className="text-destructive"> {summary.overdue} already overdue.</strong>
                  )}
                </span>
              </div>

              {/* 2. Priority list */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Priority List</h3>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Personnel</TableHead>
                        <TableHead>Certificate</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Issuing Authority</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planEntries.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{e.personnelName}</TableCell>
                          <TableCell>{e.certName}</TableCell>
                          <TableCell>{e.category}</TableCell>
                          <TableCell>{e.issuingAuthority}</TableCell>
                          <TableCell>{format(parseISO(e.expiryDate), 'd MMM yyyy')}</TableCell>
                          <TableCell>
                            <Badge className={getDaysBadgeClass(e.daysRemaining)}>
                              {getDaysLabel(e.daysRemaining)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* 3. Grouped by personnel */}
              <div>
                <h3 className="text-sm font-semibold mb-2">By Personnel</h3>
                <Accordion type="multiple" className="border rounded-md">
                  {byPersonnel.map(([name, entries]) => (
                    <AccordionItem key={name} value={name}>
                      <AccordionTrigger className="px-4 text-sm">
                        {name} — {entries.length} certificate{entries.length !== 1 ? 's' : ''}
                      </AccordionTrigger>
                      <AccordionContent className="px-4">
                        <ul className="space-y-1 text-sm">
                          {entries.map((e, i) => (
                            <li key={i} className="flex items-center justify-between">
                              <span>{e.certName} · {e.issuingAuthority}</span>
                              <span className="flex items-center gap-2">
                                <span className="text-muted-foreground">{format(parseISO(e.expiryDate), 'd MMM yyyy')}</span>
                                <Badge className={getDaysBadgeClass(e.daysRemaining)}>
                                  {getDaysLabel(e.daysRemaining)}
                                </Badge>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              {/* 4. Grouped by issuer */}
              <div>
                <h3 className="text-sm font-semibold mb-2">By Issuing Authority</h3>
                <Accordion type="multiple" className="border rounded-md">
                  {byIssuer.map(([issuer, entries]) => {
                    const uniquePersonnel = new Set(entries.map(e => e.personnelId)).size;
                    return (
                      <AccordionItem key={issuer} value={issuer}>
                        <AccordionTrigger className="px-4 text-sm">
                          {issuer} — {entries.length} certificate{entries.length !== 1 ? 's' : ''}, {uniquePersonnel} personnel
                        </AccordionTrigger>
                        <AccordionContent className="px-4">
                          <ul className="space-y-1 text-sm">
                            {entries.map((e, i) => (
                              <li key={i} className="flex items-center justify-between">
                                <span>{e.personnelName} · {e.certName}</span>
                                <span className="flex items-center gap-2">
                                  <span className="text-muted-foreground">{format(parseISO(e.expiryDate), 'd MMM yyyy')}</span>
                                  <Badge className={getDaysBadgeClass(e.daysRemaining)}>
                                    {getDaysLabel(e.daysRemaining)}
                                  </Badge>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
