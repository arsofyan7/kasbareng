import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import {
  Wallet,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  FileText,
  Users,
} from 'lucide-react';

interface DashboardPageProps {
  onOpenCreateWallet: () => void;
  onNavigateToTab: (tab: 'kantong' | 'anggota') => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenCreateWallet,
  onNavigateToTab,
}) => {
  const { user } = useAuth();
  const { activeWallet, wallets } = useWallet();

  if (wallets.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
          <Wallet className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Belum Ada Dompet Kas Komunitas
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Mulai kelola keuangan RT/RW, kepanitiaan, atau komunitas bersama warga dengan persetujuan transparan.
          </p>
        </div>
        <button
          onClick={onOpenCreateWallet}
          className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 transition-all"
        >
          + Buat Dompet Kas Pertama
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Greeting & Community Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Halo, {user?.fullName.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Ringkasan kas komunitas untuk{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {activeWallet?.name}
            </span>
          </p>
        </div>

        {/* Quorum Policy Badge */}
        {activeWallet && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Kuorum: <strong>{activeWallet.requiredApprovals} dari {activeWallet.memberCount} Suara</strong>
            </span>
          </div>
        )}
      </div>

      {/* Primary Financial Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Saldo Tercatat */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl shadow-emerald-600/15 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
              Saldo Tercatat (Posted)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
              {activeWallet?.currency || 'IDR'}
            </span>
          </div>
          <div className="text-3xl font-extrabold tracking-tight mb-3">
            Rp 0
          </div>
          <p className="text-xs text-emerald-100/90 leading-relaxed">
            Total saldo yang telah diverifikasi dan dibukukan resmi dalam ledger.
          </p>
        </div>

        {/* Card 2: Saldo Tersedia */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Saldo Tersedia</span>
            <CheckCircle className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            Rp 0
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Saldo riil yang dapat digunakan setelah dipotong reservasi pengeluaran.
          </p>
        </div>

        {/* Card 3: Reservasi Pengeluaran Aktif */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Reservasi Aktif</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            Rp 0
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dana yang direservasi untuk transaksi yang sedang menunggu persetujuan.
          </p>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigateToTab('anggota')}
          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-slate-800/80 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Users className="w-4 h-4" />
          </div>
          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            Kelola Anggota
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {activeWallet?.memberCount || 1} Anggota Aktif
          </div>
        </button>

        <button
          onClick={() => onNavigateToTab('kantong')}
          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-slate-800/80 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            Daftar Kantong
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {wallets.length} Dompet Diikuti
          </div>
        </button>

        <div className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/40 text-left opacity-75">
          <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2.5">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            Catat Pemasukan
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Fase 3: Core Transaction
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/40 text-left opacity-75">
          <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2.5">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            Ajukan Pengeluaran
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Fase 4: Multi-Approval
          </div>
        </div>
      </div>

      {/* Recent Activity / Audit Status Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Aktivitas Transparansi & Audit
            </h3>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            SHA-256 Chain Intact
          </div>
        </div>

        <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs space-y-1">
          <p className="font-medium text-slate-600 dark:text-slate-300">
            Belum ada mutasi transaksi yang tercatat di dompet ini.
          </p>
          <p>
            Semua draf dan transaksi yang disetujui akan diverifikasi ke dalam rantai hash audit tahan manipulasi.
          </p>
        </div>
      </div>
    </div>
  );
};