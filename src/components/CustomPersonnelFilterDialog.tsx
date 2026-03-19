import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Briefcase, FolderOpen, Wrench } from 'lucide-react';
import { Personnel } from '@/types';
import { useWorkerGroups, useWorkerGroupMemberCounts } from '@/hooks/useWorkerGroups';
import { SKILL_CATEGORIES } from '@/lib/skillsData';

interface CustomPersonnelFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel: Personnel[];
  selectedPersonnelIds: string[];
  selectedRoles: string[];
  selectedWorkerGroupIds: string[];
  selectedSkills: string[];
  onApply: (personnelIds: string[], roles: string[], workerGroupIds: string[], skills: string[]) => void;
}

export function CustomPersonnelFilterDialog({
  open,
  onOpenChange,
  personnel,
  selectedPersonnelIds,
  selectedRoles,
  selectedWorkerGroupIds,
  selectedSkills,
  onApply,
}: CustomPersonnelFilterDialogProps) {
  const [localPersonnelIds, setLocalPersonnelIds] = useState<string[]>(selectedPersonnelIds);
  const [localRoles, setLocalRoles] = useState<string[]>(selectedRoles);
  const [localWorkerGroupIds, setLocalWorkerGroupIds] = useState<string[]>(selectedWorkerGroupIds);
  const [localSkills, setLocalSkills] = useState<string[]>(selectedSkills);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillsSearchQuery, setSkillsSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'individuals' | 'roles' | 'groups' | 'skills'>('individuals');

  const { data: workerGroups = [] } = useWorkerGroups();
  const { data: memberCounts = [] } = useWorkerGroupMemberCounts();

  const memberCountMap = useMemo(() => {
    const map = new Map<string, number>();
    memberCounts.forEach(mc => map.set(mc.worker_group_id, mc.count));
    return map;
  }, [memberCounts]);

  const uniqueRoles = useMemo(() => {
    const roles = [...new Set(personnel.map(p => p.role))].filter(Boolean).sort();
    return roles;
  }, [personnel]);

  const filteredPersonnel = useMemo(() => {
    if (!searchQuery.trim()) return personnel;
    const query = searchQuery.toLowerCase();
    return personnel.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.role.toLowerCase().includes(query) ||
      p.email.toLowerCase().includes(query)
    );
  }, [personnel, searchQuery]);

  const filteredSkillCategories = useMemo(() => {
    if (!skillsSearchQuery.trim()) return SKILL_CATEGORIES;
    const query = skillsSearchQuery.toLowerCase();
    return SKILL_CATEGORIES
      .map(cat => ({
        ...cat,
        skills: cat.skills.filter(s => s.toLowerCase().includes(query)),
      }))
      .filter(cat => cat.skills.length > 0);
  }, [skillsSearchQuery]);

  const handlePersonnelToggle = (personnelId: string) => {
    setLocalPersonnelIds(prev => 
      prev.includes(personnelId) 
        ? prev.filter(id => id !== personnelId)
        : [...prev, personnelId]
    );
  };

  const handleRoleToggle = (role: string) => {
    setLocalRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleGroupToggle = (groupId: string) => {
    setLocalWorkerGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSkillToggle = (skill: string) => {
    setLocalSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleApply = () => {
    onApply(localPersonnelIds, localRoles, localWorkerGroupIds, localSkills);
    onOpenChange(false);
  };

  const handleClear = () => {
    setLocalPersonnelIds([]);
    setLocalRoles([]);
    setLocalWorkerGroupIds([]);
    setLocalSkills([]);
  };

  const totalSelected = localPersonnelIds.length + localRoles.length + localWorkerGroupIds.length + localSkills.length;

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setLocalPersonnelIds(selectedPersonnelIds);
      setLocalRoles(selectedRoles);
      setLocalWorkerGroupIds(selectedWorkerGroupIds);
      setLocalSkills(selectedSkills);
      setSearchQuery('');
      setSkillsSearchQuery('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Custom Filter
            {totalSelected > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalSelected} selected
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="individuals" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Individuals</span>
              {localPersonnelIds.length > 0 && (
                <Badge variant="outline" className="ml-1 h-5 px-1.5">
                  {localPersonnelIds.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-1.5">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Roles</span>
              {localRoles.length > 0 && (
                <Badge variant="outline" className="ml-1 h-5 px-1.5">
                  {localRoles.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-1.5">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Groups</span>
              {localWorkerGroupIds.length > 0 && (
                <Badge variant="outline" className="ml-1 h-5 px-1.5">
                  {localWorkerGroupIds.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="skills" className="gap-1.5">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Skills</span>
              {localSkills.length > 0 && (
                <Badge variant="outline" className="ml-1 h-5 px-1.5">
                  {localSkills.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="individuals" className="mt-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search personnel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-2">
                {filteredPersonnel.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => handlePersonnelToggle(p.id)}
                  >
                    <Checkbox
                      checked={localPersonnelIds.includes(p.id)}
                      onCheckedChange={() => handlePersonnelToggle(p.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.role}</p>
                    </div>
                    {p.category === 'freelancer' && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        Freelancer
                      </Badge>
                    )}
                  </div>
                ))}
                {filteredPersonnel.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No personnel found
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="roles" className="mt-4">
            <ScrollArea className="h-[320px] pr-4">
              <div className="space-y-2">
                {uniqueRoles.map((role) => {
                  const count = personnel.filter(p => p.role === role).length;
                  return (
                    <div
                      key={role}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleRoleToggle(role)}
                    >
                      <Checkbox
                        checked={localRoles.includes(role)}
                        onCheckedChange={() => handleRoleToggle(role)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{role}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {count} {count === 1 ? 'person' : 'people'}
                      </Badge>
                    </div>
                  );
                })}
                {uniqueRoles.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No roles found
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="groups" className="mt-4">
            <ScrollArea className="h-[320px] pr-4">
              <div className="space-y-2">
                {workerGroups.map((group) => {
                  const count = memberCountMap.get(group.id) || 0;
                  return (
                    <div
                      key={group.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleGroupToggle(group.id)}
                    >
                      <Checkbox
                        checked={localWorkerGroupIds.includes(group.id)}
                        onCheckedChange={() => handleGroupToggle(group.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{group.name}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {count} {count === 1 ? 'member' : 'members'}
                      </Badge>
                    </div>
                  );
                })}
                {workerGroups.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No worker groups defined
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="skills" className="mt-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search skills..."
                value={skillsSearchQuery}
                onChange={(e) => setSkillsSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-4">
                {filteredSkillCategories.map((category) => (
                  <div key={category.name}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                      {category.emoji} {category.name}
                    </p>
                    <div className="space-y-1">
                      {category.skills.map((skill) => (
                        <div
                          key={skill}
                          className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleSkillToggle(skill)}
                        >
                          <Checkbox
                            checked={localSkills.includes(skill)}
                            onCheckedChange={() => handleSkillToggle(skill)}
                          />
                          <p className="text-sm">{skill}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredSkillCategories.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No skills found
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-row gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleClear} disabled={totalSelected === 0}>
            Clear All
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply Filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
