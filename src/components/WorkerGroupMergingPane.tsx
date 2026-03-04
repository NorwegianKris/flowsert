import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Search, ArrowRight, Users, Check, Plus } from 'lucide-react';
import { usePersonnel } from '@/hooks/usePersonnel';
import { useWorkerGroups, useWorkerGroupMemberCounts } from '@/hooks/useWorkerGroups';
import { usePersonnelWorkerGroups, useAssignPersonnelToGroup } from '@/hooks/usePersonnelWorkerGroups';

export function WorkerGroupMergingPane() {
  const { personnel, loading: loadingPersonnel } = usePersonnel();
  const { data: groups = [], isLoading: loadingGroups } = useWorkerGroups();
  const { data: junctionRows = [], isLoading: loadingJunction } = usePersonnelWorkerGroups();
  const { data: memberCounts = [] } = useWorkerGroupMemberCounts();
  const assignMutation = useAssignPersonnelToGroup();

  const [leftSearch, setLeftSearch] = useState('');
  const [rightSearch, setRightSearch] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState<Set<string>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showGrouped, setShowGrouped] = useState(false);

  // Build personnel -> groups map
  const personnelGroupsMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const row of junctionRows) {
      if (!map.has(row.personnel_id)) map.set(row.personnel_id, new Set());
      map.get(row.personnel_id)!.add(row.worker_group_id);
    }
    return map;
  }, [junctionRows]);

  // Build group name lookup
  const groupNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) map.set(g.id, g.name);
    return map;
  }, [groups]);

  // Member count lookup
  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const mc of memberCounts) map.set(mc.worker_group_id, mc.count);
    return map;
  }, [memberCounts]);

  // Filter personnel
  const filteredPersonnel = useMemo(() => {
    return personnel.filter((p) => {
      const isGrouped = personnelGroupsMap.has(p.id);
      if (!showGrouped && isGrouped) return false;
      if (leftSearch) {
        const q = leftSearch.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q);
      }
      return true;
    });
  }, [personnel, leftSearch, showGrouped, personnelGroupsMap]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (rightSearch) {
        return g.name.toLowerCase().includes(rightSearch.toLowerCase());
      }
      return true;
    });
  }, [groups, rightSearch]);

  const togglePersonnel = (id: string) => {
    setSelectedPersonnel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canAssign = selectedPersonnel.size > 0 && selectedGroup !== null;

  const handleAssign = async () => {
    if (!canAssign || !selectedGroup) return;
    await assignMutation.mutateAsync({
      personnelIds: Array.from(selectedPersonnel),
      workerGroupId: selectedGroup,
    });
    setSelectedPersonnel(new Set());
  };

  if (loadingPersonnel || loadingGroups || loadingJunction) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No groups yet</p>
        <p className="text-sm mt-1">Create your first group in the "Manage Groups" tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{personnel.length} workers</span>
        <span>•</span>
        <span>{groups.length} groups</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] gap-4 lg:gap-0">
        {/* Left: Personnel */}
        <div className="border rounded-lg flex flex-col h-[500px]">
          <div className="p-3 border-b bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Personnel</h3>
              <Badge variant="secondary">{filteredPersonnel.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={leftSearch}
                  onChange={(e) => setLeftSearch(e.target.value)}
                  className="pl-9 h-8 bg-white dark:bg-card"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="show-grouped" checked={showGrouped} onCheckedChange={setShowGrouped} />
                <Label htmlFor="show-grouped" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                  Show grouped
                </Label>
              </div>
            </div>
            {selectedPersonnel.size > 0 && (
              <p className="text-xs text-muted-foreground">{selectedPersonnel.size} selected</p>
            )}
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {filteredPersonnel.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">{leftSearch ? 'No matching personnel.' : 'All personnel are grouped.'}</p>
                </div>
              ) : (
                filteredPersonnel.map((p) => {
                  const isSelected = selectedPersonnel.has(p.id);
                  const pGroups = personnelGroupsMap.get(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`p-3 cursor-pointer transition-all ${isSelected ? 'bg-primary/10' : 'bg-white dark:bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20'}`}
                      onClick={() => togglePersonnel(p.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => togglePersonnel(p.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{p.name}</span>
                          <p className="text-xs text-muted-foreground">{p.role}</p>
                          {pGroups && pGroups.size > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Array.from(pGroups).map((gid) => (
                                <Badge key={gid} variant="outline" className="text-[10px] px-1.5 py-0">
                                  {groupNameMap.get(gid) || 'Unknown'}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Center: Action Area */}
        <div className="flex flex-col items-center justify-center px-4 py-6 lg:py-0">
          <div className="flex flex-col items-center gap-4 text-center">
            <Button size="icon" className="rounded-full hidden lg:flex" disabled>
              <ArrowRight className="h-4 w-4" />
            </Button>
            
            <div className="text-xs text-muted-foreground max-w-[200px]">
              Select personnel on the left, then group them into a worker group on the right.
            </div>

            <div className="flex flex-col gap-2 w-full">
              <Button
                size="sm"
                onClick={handleAssign}
                disabled={!canAssign || assignMutation.isPending}
                className="w-full"
              >
                {assignMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Group into Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAssign}
                disabled={!canAssign || assignMutation.isPending}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create & Group
              </Button>
            </div>

            {selectedPersonnel.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPersonnel(new Set())}
                className="text-xs"
              >
                Clear selection
              </Button>
            )}
          </div>
        </div>

        {/* Right: Groups */}
        <div className="border rounded-lg flex flex-col h-[500px]">
          <div className="p-3 border-b bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Worker Groups</h3>
              <Badge variant="secondary">{filteredGroups.length}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={rightSearch}
                onChange={(e) => setRightSearch(e.target.value)}
                className="pl-9 h-8 bg-white dark:bg-card"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {filteredGroups.map((g) => {
                const isSelected = selectedGroup === g.id;
                const count = countMap.get(g.id) || 0;
                return (
                  <div
                    key={g.id}
                    className={`p-3 cursor-pointer transition-all ${isSelected ? 'bg-primary/10 ring-2 ring-primary ring-inset' : 'bg-white dark:bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20'}`}
                    onClick={() => setSelectedGroup(isSelected ? null : g.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{g.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {count} {count === 1 ? 'member' : 'members'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
