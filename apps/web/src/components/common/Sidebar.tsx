import React from 'react';
import { useWallet } from '../../context/WalletContext';
import {
  LayoutDashboard,
  WalletCards,
  Users2,
  UserCircle,
  PlusCircle,
  KeyRound,
  CheckCircle2,
  ShieldCheck,
  Scale,
  Sparkles,
} from 'lucide-react';

export type NavTab = 'beranda' | 'kantong' | 'persetujuan' | 'rekonsiliasi' | 'ai-parser' | 'anggota' | 'profil';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenCreateWallet: () => void;
  onOpenJoinWallet?: () => void;
  onOpenAuditChain?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenCreateWallet,
  onOpenJoinWallet,
  onOpenAuditChain,
}) => {
  const { activeWallet } = useWallet();

  const navItems = [
    { id: 'beranda' as NavTab, label: 'Beranda Kas', icon: LayoutDashboard },
    { id: 'kantong' as NavTab, label: 'Kantong Kas', icon: WalletCards },
    { id: 'persetujuan' as NavTab, label: 'Persetujuan Kas', icon: ShieldCheck },
    { id: 'rekonsiliasi' as NavTab, label: 'Rekonsiliasi Bank', icon: Scale },
    { id: 'ai-parser' as NavTab, label: 'Parser Chat AI', icon: Sparkles },
    { id: 'anggota' as NavTab, label: 'Kelola Anggota', icon: Users2 },
    { id: 'profil' as NavTab, label: 'Profil & Tema', icon: UserCircle },
  ];

  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col justify-between p-4 border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
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
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
            >
              <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              + Gabung Kode
            </button>
          )}

          <button
            onClick={onOpenCreateWallet}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-sm font-medium transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            + Buat Dompet Baru
          </button>
        </div>
      </div>

      {/* Active Wallet Info Card */}
      {activeWallet && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <span className="font-semibold uppercase tracking-wider">Aturan Komunitas</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Persetujuan M-of-N: <span className="font-bold">{activeWallet.requiredApprovals} dari {activeWallet.memberCount} Anggota</span>
          </p>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Peran Anda: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{activeWallet.myRole}</span>
          </div>

          {onOpenAuditChain && (
            <button
              onClick={onOpenAuditChain}
              className="w-full mt-1.5 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors border border-indigo-200/50 dark:border-indigo-800/40"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Audit Rantai SHA-256</span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
