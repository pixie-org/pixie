import { Code, Grid3x3, Home } from 'lucide-react';
import ChatWidget from './ChatWidget';
import logo from '@/assets/logo.png';

type ViewType = 'showcase' | 'tools';

interface SideMenuProps {
  onViewChange: (view: ViewType) => void;
}

export default function SideMenu({ onViewChange }: SideMenuProps) {
  const projectId = "123";

  const menuItems = [
    { icon: Home, label: 'Home', view: 'showcase' as const },
    { icon: Code, label: 'Tools', view: 'tools' as const },
    { icon: Grid3x3, label: 'Widgets', view: 'showcase' as const }
  ];

  return (
    <div className="w-full max-w-[30%] bg-gray-950 text-gray-100 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg flex items-center justify-center bg-white">
            <img src={logo} alt="Logo" className="h-10 w-auto image-shadow rounded-lg" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="space-y-1">
            {menuItems.map((item, index) => (
              <button
                key={index}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-gray-800 text-gray-300"
                onClick={() => onViewChange(item.view)}
              >
                <item.icon size={20} />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat widget - fixed height */}
        <div className="border-t border-gray-700 flex flex-col" style={{ height: '80%' }}>
          <div className="p-2 pl-5 border-b border-gray-800">
            <span className="text-sm font-medium text-gray-300">Assistant</span>
          </div>
          <div className="flex-1 min-h-0">
            <ChatWidget />
          </div>
        </div>
      </div>
    </div>
  );
}