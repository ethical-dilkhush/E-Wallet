import { Menu } from 'lucide-react';

export default function Topbar({ onMenuClick, title }) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        </div>
      </div>
    </header>
  );
}
