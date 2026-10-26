import React from 'react';
import {
  LayoutDashboard,
  WalletCards,
  Users2,
  UserCircle,
  PlusCircle,
  KeyRound,
  ShieldCheck,
  Scale,
  Sparkles,
  CalendarDays,
  Plus,
} from 'lucide-react';

export type NavTab = 'beranda' | 'papan-iuran' | 'kantong' | 'persetujuan' | 'rekonsiliasi' | 'ai-parser' | 'anggota' | 'profil';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenCreateWallet: () => void;
  onOpenJoinWallet?: () => void;
  onOpenAuditChain?: () => void;
  onOpenQuickAction?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenCreateWallet,
  onOpenJoinWallet,
  onOpenQuickAction,
}) => {
  const navItems = [
    { id: 'beranda' as NavTab, label: 'Beranda Kas', icon: LayoutDashboard },
    { id: 'papan-iuran' as NavTab, label: 'Papan Iuran', icon: CalendarDays },
    { id: 'kantong' as NavTab, label: 'Kantong Kas', icon: WalletCards },
    { id: 'persetujuan' as NavTab, label: 'Persetujuan Kas', icon: ShieldCheck },
    { id: 'rekonsiliasi' as NavTab, label: 'Rekonsiliasi Bank', icon: Scale },
    { id: 'ai-parser' as NavTab, label: 'Parser Chat AI', icon: Sparkles },
    { id: 'anggota' as NavTab, label: 'Kelola Anggota', icon: Users2 },
    { id: 'profil' as NavTab, label: 'Profil & Tema', icon: UserCircle },
  ];

  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col justify-between p-4 border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm min-h-[calc(100vh-4rem)]">
      <div className="space-y-4">
        {/* Primary Desktop Action Button */}
        {onOpenQuickAction && (
          <button
            type="button"
            onClick={onOpenQuickAction}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition-all hover:shadow-lg hover:shadow-emerald-600/35 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>+ Transaksi Baru</span>
          </button>
        )}

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          {onOpenJoinWallet && (
            <button
              onClick={onOpenJoinWallet}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              + Gabung Kode
            </button>
          )}

          <button
            onClick={onOpenCreateWallet}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-sm font-medium transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            + Buat Dompet Baru
          </button>
        </div>
      </div>

      {/* Bottom Community Trust Banner (Desktop Mockup Parity) */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 text-center space-y-1">
          <div className="flex justify-center -space-x-1 mb-1">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">
              👥
            </span>
          </div>
          <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
            Kas Komunitas Terbuka
          </p>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/70 leading-snug">
            Kelola keuangan bersama, lebih transparan.
          </p>
        </div>
      </div>
    </aside>
  );
};
