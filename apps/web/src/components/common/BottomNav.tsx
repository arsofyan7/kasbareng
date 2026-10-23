import React from 'react';
import { NavTab } from './Sidebar';
import {
  LayoutDashboard,
  WalletCards,
  Users2,
  UserCircle,
  ShieldCheck,
  Scale,
  CalendarDays,
} from 'lucide-react';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'beranda' as NavTab, label: 'Beranda', icon: LayoutDashboard },
    { id: 'papan-iuran' as NavTab, label: 'Iuran', icon: CalendarDays },
    { id: 'persetujuan' as NavTab, label: 'Persetujuan', icon: ShieldCheck },
    { id: 'kantong' as NavTab, label: 'Kantong', icon: WalletCards },
    { id: 'rekonsiliasi' as NavTab, label: 'Rekon', icon: Scale },
    { id: 'anggota' as NavTab, label: 'Anggota', icon: Users2 },
    { id: 'profil' as NavTab, label: 'Profil', icon: UserCircle },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe transition-colors">
      <div className="grid grid-cols-7 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] ${
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