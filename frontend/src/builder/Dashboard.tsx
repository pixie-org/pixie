import { useState } from 'react';
import SideMenu from './SideMenu';
import Showcase from './Showcase';
import ToolsViewer from './ToolsViewer';

type ViewType = 'showcase' | 'tools';

export default function Dashboard() {
  const [activeView, setActiveView] = useState<ViewType>('showcase');

  return (
    <div className="flex h-screen w-screen bg-gray-900 overflow-hidden">
      <SideMenu onViewChange={setActiveView} />
      <div className="flex-1 overflow-auto">
        {activeView === 'showcase' ? <Showcase /> : <ToolsViewer projectId="123" />}
      </div>
    </div>
  );
}