import { useState } from 'react';
import { FileDown, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExternalSharingDialog } from './ExternalSharingDialog';
import { Project } from '@/hooks/useProjects';
import { Personnel } from '@/types';

interface ActionsBellProps {
  projects: Project[];
  personnel: Personnel[];
}

export function ActionsBell({ projects, personnel }: ActionsBellProps) {
  const [externalSharingOpen, setExternalSharingOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            Actions
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setExternalSharingOpen(true)}>
            <FileDown className="h-4 w-4 mr-2" />
            External Sharing
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExternalSharingDialog
        open={externalSharingOpen}
        onOpenChange={setExternalSharingOpen}
        projects={projects}
        personnel={personnel}
      />
    </>
  );
}
