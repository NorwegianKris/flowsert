import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Merge, Settings } from 'lucide-react';
import { WorkerGroupMergingPane } from '@/components/WorkerGroupMergingPane';
import { WorkerGroupsManageList } from '@/components/WorkerGroupsManageList';

export function WorkerGroupsManager() {
  const [activeView, setActiveView] = useState<'assign' | 'manage'>('assign');

  return (
    <div className="space-y-4">
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'assign' | 'manage')}>
        <TabsList>
          <TabsTrigger value="assign" className="gap-2">
            <Merge className="h-4 w-4" />
            <span className="hidden sm:inline">Group Workers</span>
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Manage Groups</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assign" className="mt-4">
          <WorkerGroupMergingPane />
        </TabsContent>

        <TabsContent value="manage" className="mt-4">
          <WorkerGroupsManageList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
