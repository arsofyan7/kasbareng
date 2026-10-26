import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import {
  Wallet,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  PlusCircle,
  KeyRound,
  CalendarDays,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Coins,
} from 'lucide-react';
import { Transaction, TransactionType, TransactionState, WalletSummary, ApiResponse } from '../types';
import { RecordTransactionModal } from '../components/common/RecordTransactionModal';
import { TransactionDetailModal } from '../components/common/TransactionDetailModal';
import { NavTab } from '../components/common/Sidebar';

interface DashboardPageProps {
  onOpenCreateWallet: () => void;
  onOpenJoinWallet?: () => void;
  onNavigateToTab: (tab: NavTab) => void;
  onOpenRecordModal?: (type: TransactionType) => void;
  refreshTrigger?: number;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenCreateWallet,
  onOpenJoinWallet,
  onNavigateToTab,
  onOpenRecordModal,
  refreshTrigger,
}) => {
  const { token, user } = useAuth();
  const { activeWallet, wallets } = useWallet();

  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

  // Modals
  const [recordModalOpen, setRecordModalOpen] = useState<boolean>(false);
  const [recordType, setRecordType] = useState<TransactionType>('INCOME');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Financial Privacy: Show/Hide Balance State
  const [showBalance, setShowBalance] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kasbareng_show_balance') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleShowBalance = () => {
    setShowBalance((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('kasbareng_show_balance', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const formatAmount = (amount: number) => {
    if (!showBalance) return 'Rp ••••••••';
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const fetchDashboardData = useCallback(async () => {
    if (!token || !activeWallet) return;
    setIsLoading(true);

    try {
      // 1. Fetch balance summary
      const sumRes = await fetch(`/api/v1/wallets/${activeWallet.id}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sumJson: ApiResponse<WalletSummary> = await sumRes.json();
      if (sumRes.ok && sumJson.data) {
        setSummary(sumJson.data);
      }

      // 2. Fetch recent transactions
      const txRes = await fetch(`/api/v1/wallets/${activeWallet.id}/transactions?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const txJson: ApiResponse<Transaction[]> = await txRes.json();
      if (txRes.ok && txJson.data) {
        setTransactions(txJson.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, activeWallet]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, refreshTrigger]);

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
            Gabung ke kas warga yang sudah ada dengan kode undangan, atau buat dompet kas baru untuk RT/RW/organisasi Anda.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {onOpenJoinWallet && (
            <button
              onClick={onOpenJoinWallet}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              Gabung Komunitas (Pakai Kode)
            </button>
          )}
          <button
            onClick={onOpenCreateWallet}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            + Buat Dompet Baru (Admin)
          </button>
        </div>
      </div>
    );
  }

  const openRecordModal = (t: TransactionType) => {
    if (onOpenRecordModal) {
      onOpenRecordModal(t);
    } else {
      setRecordType(t);
      setRecordModalOpen(true);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (activeFilter === 'INCOME') return tx.type === 'INCOME';
    if (activeFilter === 'EXPENSE') return tx.type === 'EXPENSE';
    return true;
  });

  const getStateBadge = (state: TransactionState, type?: TransactionType) => {
    switch (state) {
      case 'DRAFT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Draf
          </span>
        );
      case 'SUBMITTED':
        if (type === 'INCOME') {
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Menunggu Verifikasi
            </span>
          );
        }
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            Menunggu Kuorum
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            Menunggu Kuorum
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/20">
            Disetujui
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            Selesai
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
            Dibatalkan
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            Ditolak
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {state}
          </span>
        );
    }
  };

  const isManagerOrAdmin = activeWallet?.myRole === 'ADMIN' || activeWallet?.myRole === 'PENGELOLA';

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Greeting & Community Header with Adaptive Ambient Banner */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border border-emerald-500/20 dark:border-emerald-800/40 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Subtle Community Skyline / Building Silhouette Vector Artwork */}
        <div className="absolute right-0 bottom-0 pointer-events-none opacity-20 dark:opacity-10 translate-x-2 translate-y-1 select-none hidden sm:block">
          <svg width="240" height="90" viewBox="0 0 240 90" fill="currentColor" className="text-emerald-700 dark:text-emerald-300">
            {/* Tree left */}
            <circle cx="20" cy="55" r="16" />
            <rect x="18" y="65" width="4" height="20" fill="currentColor" />
            {/* Small house */}
            <path d="M40 85 L40 50 L60 35 L80 50 L80 85 Z" />
            <rect x="52" y="62" width="16" height="23" className="text-white dark:text-slate-950" fill="currentColor" opacity="0.4" />
            {/* Community Hall / School Building */}
            <path d="M85 85 L85 40 L145 40 L145 85 Z" />
            <polygon points="115,20 80,40 150,40" />
            <circle cx="115" cy="30" r="4" className="text-white dark:text-slate-950" fill="currentColor" opacity="0.5" />
            <rect x="92" y="48" width="10" height="12" rx="2" className="text-white dark:text-slate-950" fill="currentColor" opacity="0.4" />
            <rect x="108" y="48" width="14" height="12" rx="2" className="text-white dark:text-slate-950" fill="currentColor" opacity="0.4" />
            <rect x="128" y="48" width="10" height="12" rx="2" className="text-white dark:text-slate-950" fill="currentColor" opacity="0.4" />
            <rect x="108" y="68" width="14" height="17" className="text-white dark:text-slate-950" fill="currentColor" opacity="0.6" />
            {/* Tree right */}
            <circle cx="170" cy="52" r="18" />
            <rect x="168" y="65" width="5" height="20" fill="currentColor" />
            <circle cx="205" cy="58" r="14" />
            <rect x="203" y="68" width="4" height="17" fill="currentColor" />
            {/* Ground line */}
            <rect x="0" y="84" width="240" height="6" rx="2" opacity="0.3" />
          </svg>
        </div>

        <div className="z-10 space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Halo, {user?.fullName.split(' ')[0]} <span>👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Berikut ringkasan kas komunitas{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {activeWallet?.name}
            </span>
          </p>
        </div>

        {/* Quorum Policy & Audit Badges */}
        {activeWallet && (
          <div className="z-10 self-start sm:self-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-emerald-200/80 dark:border-emerald-800/60 shadow-sm text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Kuorum: <strong>{activeWallet.requiredApprovals} dari {activeWallet.memberCount} Suara</strong>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-500 opacity-60" />
            </div>
          </div>
        )}
      </div>

      {/* Primary Financial Balance Cards (Live Calculated via Ledger Algorithm) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Saldo Tercatat */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-800 text-white shadow-xl shadow-emerald-600/20 relative overflow-hidden flex flex-col justify-between min-h-[175px]">
          {/* Decorative Coin Ring Stack Artwork (Bottom-Right, exactly like mockup) */}
          <div className="absolute -right-3 -bottom-5 w-32 h-32 pointer-events-none select-none opacity-25">
            <svg viewBox="0 0 100 100" fill="none" className="w-full h-full text-white">
              <circle cx="65" cy="65" r="30" stroke="currentColor" strokeWidth="4" />
              <circle cx="65" cy="65" r="22" stroke="currentColor" strokeWidth="3" />
              <circle cx="45" cy="72" r="24" stroke="currentColor" strokeWidth="3" />
              <circle cx="45" cy="72" r="16" stroke="currentColor" strokeWidth="2" />
              <circle cx="75" cy="40" r="18" stroke="currentColor" strokeWidth="3" />
            </svg>
          </div>
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />

          {/* Top: Label + Eye Privacy Button + Currency Pill */}
          <div className="flex items-center justify-between mb-2 z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
                Saldo Tercatat (Posted)
              </span>
              <button
                type="button"
                onClick={toggleShowBalance}
                className="p-1 rounded-lg hover:bg-white/15 text-emerald-100 transition-colors cursor-pointer"
                title={showBalance ? 'Sembunyikan Saldo' : 'Tampilkan Saldo'}
                aria-label="Toggle visibility saldo"
              >
                {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white flex items-center gap-1">
              {activeWallet?.currency || 'IDR'}
              <ChevronDown className="w-3 h-3 text-emerald-200" />
            </span>
          </div>

          {/* Balance Display */}
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 z-10">
            {formatAmount(summary?.postedBalance || 0)}
          </div>

          {/* Subtitle */}
          <p className="text-xs text-emerald-100/90 leading-relaxed z-10 mt-auto">
            Total saldo yang telah diverifikasi dan dibukukan resmi dalam ledger.
          </p>
        </div>

        {/* Card 2: Saldo Tersedia */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/40 dark:hover:border-emerald-500/30 transition-all flex flex-col justify-between min-h-[175px] group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="font-semibold uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400">
                Saldo Tersedia
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
          </div>

          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white my-1">
            {formatAmount(summary?.availableBalance || 0)}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-auto">
            Saldo riil yang dapat digunakan setelah dipotong reservasi pengeluaran.
          </p>
        </div>

        {/* Card 3: Reservasi Pengeluaran Aktif */}
        <div
          onClick={() => onNavigateToTab('persetujuan')}
          className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-500/40 dark:hover:border-amber-500/30 transition-all flex flex-col justify-between min-h-[175px] group cursor-pointer"
          title="Klik untuk melihat transaksi yang menunggu kuorum"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <Coins className="w-4 h-4" />
              </div>
              <span className="font-semibold uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400">
                Reservasi Aktif
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
          </div>

          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white my-1">
            {formatAmount(summary?.activeReservations || 0)}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-auto">
            Dana yang direservasi untuk transaksi yang sedang menunggu persetujuan.
          </p>
        </div>
      </div>

      {/* Quick Navigation Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Shortcut 1: Papan Iuran */}
        <button
          type="button"
          onClick={() => onNavigateToTab('papan-iuran')}
          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/60 hover:bg-emerald-50/20 dark:hover:bg-slate-800/80 text-left transition-all group cursor-pointer shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <CalendarDays className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Lihat Rekap
            </span>
          </div>
          <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Papan Iuran Komunitas
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Matriks transparansi iuran bulanan/termin seluruh warga
          </div>
        </button>

        {/* Shortcut 2: Kelola Anggota */}
        <button
          type="button"
          onClick={() => onNavigateToTab('anggota')}
          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-500/60 hover:bg-sky-50/20 dark:hover:bg-slate-800/80 text-left transition-all group cursor-pointer shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
              {activeWallet?.memberCount || 1} Anggota
            </span>
          </div>
          <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Kelola Anggota & Peran
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar warga, hak akses, dan kode undangan komunitas
          </div>
        </button>
      </div>

      {/* Transaction Feed & Chronology */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {isManagerOrAdmin ? 'Riwayat Transaksi Kas' : 'Riwayat Transaksi Saya'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isManagerOrAdmin
                ? 'Semua transaksi kas komunitas yang divalidasi oleh Finite State Machine (FSM).'
                : 'Tracking laporan setoran iuran dan transaksi kas yang Anda buat sendiri.'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Semua ({transactions.length})
            </button>
            <button
              onClick={() => setActiveFilter('INCOME')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeFilter === 'INCOME'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Pemasukan
            </button>
            <button
              onClick={() => setActiveFilter('EXPENSE')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeFilter === 'EXPENSE'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Pengeluaran
            </button>
          </div>
        </div>

        {/* Transaction Items */}
        {isLoading ? (
          <div className="text-center py-10 text-xs text-slate-400 animate-pulse">
            Memuat daftar transaksi...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-xs space-y-2">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              {isManagerOrAdmin
                ? 'Belum ada transaksi pada kategori ini.'
                : 'Anda belum memiliki riwayat transaksi atau laporan pembayaran.'}
            </p>
            {isManagerOrAdmin ? (
              <button
                onClick={() => openRecordModal('INCOME')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Catat Transaksi Pertama
              </button>
            ) : (
              <button
                onClick={() => openRecordModal('INCOME')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Lapor Pembayaran Sekarang
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredTransactions.map((tx) => {
              const isIncome = tx.type === 'INCOME';
              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 px-2 -mx-2 rounded-2xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isIncome
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                    }`}>
                      {isIncome ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {tx.category}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span>{tx.creator?.fullName?.split(' ')[0] || 'Warga'}</span>
                        <span>�</span>
                        <span>
                          {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className={`font-bold text-sm ${
                      isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                    }`}>
                      {isIncome ? '+ ' : '- '}
                      Rp {tx.amount.toLocaleString('id-ID')}
                    </div>
                    <div>{getStateBadge(tx.state, tx.type)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Record Transaction Modal */}
      <RecordTransactionModal
        isOpen={recordModalOpen}
        initialType={recordType}
        availableBalance={summary?.availableBalance || 0}
        onClose={() => setRecordModalOpen(false)}
        onSuccess={fetchDashboardData}
      />

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
};
