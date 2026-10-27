import React, { useEffect } from 'react';
import { useWallet } from '../../context/WalletContext';
import { NavTab } from './Sidebar';
import {
  X,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Lock,
  WalletCards,
  Scale,
  Users2,
  ChevronRight,
} from 'lucide-react';

interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIncome: () => void;
  onSelectExpense: () => void;
  onSelectAiChat: () => void;
  onNavigateTab?: (tab: NavTab) => void;
}

export const QuickActionSheet: React.FC<QuickActionSheetProps> = ({
  isOpen,
  onClose,
  onSelectIncome,
  onSelectExpense,
  onSelectAiChat,
  onNavigateTab,
}) => {
  const { activeWallet } = useWallet();
  const isManagerOrAdmin = activeWallet?.myRole === 'ADMIN' || activeWallet?.myRole === 'PENGELOLA';
  const isWarga = activeWallet?.myRole === 'WARGA';

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Dimmed Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / Modal Container */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl border border-slate-300 dark:border-slate-700 z-10 overflow-hidden transform transition-all duration-300 animate-in slide-in-from-bottom sm:zoom-in-95">
        {/* Mobile Drag Handle */}
        <div className="flex sm:hidden justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="p-5 pb-3 sm:p-6 sm:pb-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                Aksi Cepat Kas
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pilih transaksi atau bantuan pencatatan untuk{' '}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {activeWallet?.name || 'Dompet Kas Bersama'}
              </span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Main Action Cards */}
        <div className="p-5 sm:p-6 space-y-3">
          {/* Action 1: Catat Pemasukan / Lapor Iuran */}
          <button
            type="button"
            onClick={onSelectIncome}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 text-left transition-all group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {isWarga ? 'Lapor Setoran / Iuran Mandiri' : 'Catat Pemasukan Kas'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  + Kas
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed truncate">
                {isWarga
                  ? 'Setor mandiri & lampirkan bukti transfer bank'
                  : 'Pemasukan kas langsung, setoran anggota, atau donasi'}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Action 2: Ajukan Pengeluaran Kas */}
          {isManagerOrAdmin ? (
            <button
              type="button"
              onClick={onSelectExpense}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-rose-300 dark:border-rose-700/80 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-900/30 text-left transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/25 group-hover:scale-105 transition-transform">
                <TrendingDown className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Ajukan Pengeluaran Kas
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300">
                    Kuorum M-of-N
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed truncate">
                  Pengeluaran kas bersama dengan persetujuan bertingkat
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ) : (
            <div className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 opacity-60 text-left cursor-not-allowed">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                    Pengeluaran Kas
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Khusus Pengurus
                  </span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                  Anggota dapat melapor setoran atau pemasukan mandiri
                </p>
              </div>
            </div>
          )}

          {/* Action 3: Chatting / Parser Chat AI */}
          <button
            type="button"
            onClick={onSelectAiChat}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-purple-300 dark:border-purple-700/80 bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-100/60 dark:hover:bg-purple-900/30 text-left transition-all group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Catat via Chat AI
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300">
                  ✨ AI Cerdas
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed truncate">
                Tempel obrolan WhatsApp untuk ekstraksi draf kas otomatis
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        </div>

        {/* Extra Shortcuts Navigation Row */}
        {onNavigateTab && (
          <div className="px-5 py-3 sm:px-6 sm:py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('kantong')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <WalletCards className="w-4 h-4 text-emerald-500" />
              <span>Kantong Kas</span>
            </button>

            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />

            <button
              type="button"
              onClick={() => onNavigateTab('rekonsiliasi')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <Scale className="w-4 h-4 text-sky-500" />
              <span>Rekonsiliasi</span>
            </button>

            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />

            <button
              type="button"
              onClick={() => onNavigateTab('anggota')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <Users2 className="w-4 h-4 text-purple-500" />
              <span>Anggota</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
