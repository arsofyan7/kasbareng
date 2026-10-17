import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import {
  Wallet,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Users,
  PlusCircle,
  KeyRound,
  Copy,
  Check,
  Share2,
  Sparkles,
} from 'lucide-react';
import { Transaction, TransactionType, TransactionState, WalletSummary, ApiResponse } from '../types';
import { RecordTransactionModal } from '../components/common/RecordTransactionModal';
import { TransactionDetailModal } from '../components/common/TransactionDetailModal';
import { ManageInviteCodeModal } from '../components/common/ManageInviteCodeModal';

interface DashboardPageProps {
  onOpenCreateWallet: () => void;
  onOpenJoinWallet?: () => void;
  onNavigateToTab: (tab: 'kantong' | 'anggota') => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenCreateWallet,
  onOpenJoinWallet,
  onNavigateToTab,
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
  const [manageCodeModalOpen, setManageCodeModalOpen] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

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
  }, [fetchDashboardData]);

  const handleCopyCode = () => {
    if (!activeWallet?.inviteCode) return;
    navigator.clipboard.writeText(activeWallet.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!activeWallet?.inviteCode) return;
    const shareLink = `${window.location.origin}/?join=${activeWallet.inviteCode}`;
    const text = encodeURIComponent(
      `Halo warga! Mari bergabung ke pencatatan kas transparan "${activeWallet.name}" di KasBareng.\n\n` +
      `Gunakan Kode Undangan: *${activeWallet.inviteCode}*\n` +
      `Atau klik langsung tautan ini untuk bergabung:\n${shareLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

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
    setRecordType(t);
    setRecordModalOpen(true);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (activeFilter === 'INCOME') return tx.type === 'INCOME';
    if (activeFilter === 'EXPENSE') return tx.type === 'EXPENSE';
    return true;
  });

  const getStateBadge = (state: TransactionState) => {
    switch (state) {
      case 'DRAFT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Draf
          </span>
        );
      case 'SUBMITTED':
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
      {/* Top Greeting & Community Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Halo, {user?.fullName.split(' ')[0]} ??
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

      {/* Community Private Access / Invite Code Banner */}
      {activeWallet && (
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 text-white dark:bg-slate-900/90 dark:border dark:border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="space-y-1 z-10">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                Akses Komunitas Tertutup
              </span>
              <span className="text-xs text-slate-400">
                Role Join: <strong>WARGA (Instant)</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-xs text-slate-300">Kode Akses:</span>
              <span className="font-mono text-base font-extrabold tracking-wider text-emerald-400 bg-black/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                {activeWallet.inviteCode || 'KAS-KOMUNITAS'}
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Hanya warga yang memiliki kode ini yang dapat masuk dan melihat pencatatan kas. Bagikan ke grup WhatsApp warga.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 z-10">
            <button
              onClick={handleCopyCode}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all flex items-center gap-1.5"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              {copiedCode ? 'Tersalin!' : 'Salin Kode'}
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              Bagikan WA
            </button>

            {activeWallet.myRole === 'ADMIN' && (
              <button
                onClick={() => setManageCodeModalOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-xs font-semibold text-slate-200 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Atur Kode
              </button>
            )}
          </div>
        </div>
      )}

      {/* Primary Financial Balance Cards (Live Calculated via Ledger Algorithm) */}
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
            Rp {(summary?.postedBalance || 0).toLocaleString('id-ID')}
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
            Rp {(summary?.availableBalance || 0).toLocaleString('id-ID')}
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
            Rp {(summary?.activeReservations || 0).toLocaleString('id-ID')}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dana yang direservasi untuk transaksi yang sedang menunggu persetujuan.
          </p>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Action 1: Catat Pemasukan */}
        {isManagerOrAdmin ? (
          <button
            onClick={() => openRecordModal('INCOME')}
            className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-2.5 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Catat Pemasukan
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400">
              Iuran kas & donasi
            </div>
          </button>
        ) : (
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60 text-left">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mb-2.5">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="font-semibold text-sm text-slate-700 dark:text-slate-300">
              Pemasukan Kas
            </div>
            <div className="text-[11px] text-slate-400">Khusus Pengelola/Admin</div>
          </div>
        )}

        {/* Action 2: Ajukan Pengeluaran */}
        {isManagerOrAdmin ? (
          <button
            onClick={() => openRecordModal('EXPENSE')}
            className="p-4 rounded-2xl border border-rose-200 dark:border-rose-800/80 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center mb-2.5 shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Ajukan Pengeluaran
            </div>
            <div className="text-xs text-rose-700 dark:text-rose-400">
              Perlu kuorum M-of-N
            </div>
          </button>
        ) : (
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60 text-left">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mb-2.5">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="font-semibold text-sm text-slate-700 dark:text-slate-300">
              Pengeluaran Kas
            </div>
            <div className="text-[11px] text-slate-400">Khusus Pengelola/Admin</div>
          </div>
        )}

        {/* Action 3: Kelola Anggota */}
        <button
          onClick={() => onNavigateToTab('anggota')}
          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-slate-800/80 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Users className="w-4 h-4" />
          </div>
          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            Kelola Anggota
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {activeWallet?.memberCount || 1} Anggota Aktif
          </div>
        </button>

        {/* Action 4: Kantong Kas */}
        <button
          onClick={() => onNavigateToTab('kantong')}
          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-slate-800/80 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            Kantong Kas
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {wallets.length} Dompet Diikuti
          </div>
        </button>
      </div>

      {/* Transaction Feed & Chronology */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Riwayat Transaksi Kas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Setiap transaksi divalidasi oleh Finite State Machine (FSM).
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
              Belum ada transaksi pada kategori ini.
            </p>
            {isManagerOrAdmin && (
              <button
                onClick={() => openRecordModal('INCOME')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Catat Transaksi Pertama
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
                        <span>•</span>
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
                    <div>{getStateBadge(tx.state)}</div>
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

      {/* Manage Invite Code Modal */}
      <ManageInviteCodeModal
        isOpen={manageCodeModalOpen}
        onClose={() => setManageCodeModalOpen(false)}
      />
    </div>
  );
};
