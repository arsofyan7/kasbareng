import React from 'react';
import { NavTab } from './Sidebar';
import {
  LayoutDashboard,
  CalendarDays,
  ShieldCheck,
  UserCircle,
  Plus,
} from 'lucide-react';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenQuickAction: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickAction,
}) => {
  const leftTabs = [
    { id: 'beranda' as NavTab, label: 'Beranda', icon: LayoutDashboard },
    { id: 'papan-iuran' as NavTab, label: 'Iuran', icon: CalendarDays },
  ];

  const rightTabs = [
    { id: 'persetujuan' as NavTab, label: 'Persetujuan', icon: ShieldCheck },
    { id: 'profil' as NavTab, label: 'Profil', icon: UserCircle },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe transition-colors shadow-lg shadow-slate-950/10">
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {/* Left Tabs */}
        {leftTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] cursor-pointer ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
                )}
              </div>
              <span className="text-[11px]">{tab.label}</span>
            </button>
          );
        })}

        {/* Center Protruding Action Button (Ala E-Wallet) */}
        <div className="flex flex-col items-center justify-center relative">
          <button
            type="button"
            onClick={onOpenQuickAction}
            aria-label="Aksi Cepat Kas"
            className="relative -top-3.5 w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/40 border-4 border-slate-50 dark:border-slate-950 flex items-center justify-center transition-all active:scale-90 hover:scale-105 cursor-pointer ring-2 ring-emerald-500/20"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 -mt-2.5">
            Aksi
          </span>
        </div>

        {/* Right Tabs */}
        {rightTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] cursor-pointer ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
                )}
              </div>
              <span className="text-[11px]">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};