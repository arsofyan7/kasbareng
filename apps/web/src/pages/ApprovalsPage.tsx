import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { Transaction } from '../types';
import { TransactionDetailModal } from '../components/common/TransactionDetailModal';
import { ApprovalPolicyModal } from '../components/common/ApprovalPolicyModal';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Settings2,
  Calendar,
  User,
  ArrowRight,
  Lock,
  Camera,
  ExternalLink,
  ThumbsUp,
  X,
  Search,
  Eye,
  Ban,
} from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const { user, token } = useAuth();
  const { activeWallet } = useWallet();

  const [activeTab, setActiveTab] = useState<'incoming' | 'pending' | 'approved' | 'history'>('incoming');
  const [expenseTransactions, setExpenseTransactions] = useState<Transaction[]>([]);
  const [incomingReports, setIncomingReports] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [processingTxId, setProcessingTxId] = useState<string | null>(null);

  const isManagerOrAdmin = activeWallet?.myRole === 'ADMIN' || activeWallet?.myRole === 'PENGELOLA';
  const isAdmin = activeWallet?.myRole === 'ADMIN';

  const fetchTransactions = useCallback(async () => {
    if (!activeWallet || !token) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [expenseRes, incomeRes] = await Promise.all([
        fetch(`/api/v1/wallets/${activeWallet.id}/transactions?type=EXPENSE&limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/v1/wallets/${activeWallet.id}/transactions?type=INCOME&state=SUBMITTED&limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const expenseJson = await expenseRes.json();
      const incomeJson = await incomeRes.json();

      if (!expenseRes.ok) {
        throw new Error(expenseJson.error?.message || 'Gagal memuat transaksi pengeluaran.');
      }

      setExpenseTransactions(expenseJson.data || []);
      setIncomingReports(incomeJson.data || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeWallet?.id, token]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleVerifyIncome = async (txId: string, decision: 'APPROVE' | 'REJECT') => {
    let reason: string | undefined = undefined;
    if (decision === 'REJECT') {
      const inputReason = prompt('Masukkan alasan penolakan laporan iuran (misal: Bukti transfer tidak valid/dana belum masuk):');
      if (inputReason === null) return;
      reason = inputReason.trim() || 'Laporan iuran ditolak oleh pengurus kas.';
    }

    setProcessingTxId(txId);
    try {
      const res = await fetch(`/api/v1/transactions/${txId}/verify-income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision,
          notes: reason,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal memproses verifikasi laporan.');
      }

      await fetchTransactions();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan.');
    } finally {
      setProcessingTxId(null);
    }
  };

  const handleProcessExpenseApproval = async (tx: Transaction, decision: 'APPROVE' | 'REJECT') => {
    let comment: string | undefined = undefined;
    if (decision === 'REJECT') {
      const reason = prompt('Masukkan alasan penolakan pengeluaran ini:');
      if (reason === null) return;
      comment = reason.trim() || 'Pengeluaran ditolak oleh pengelola kas.';
    }

    setProcessingTxId(tx.id);
    try {
      const res = await fetch(`/api/v1/transactions/${tx.id}/approvals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision,
          comment,
          expectedVersion: tx.version,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal memproses persetujuan pengeluaran.');
      }

      await fetchTransactions();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan.');
    } finally {
      setProcessingTxId(null);
    }
  };

  // Filtered transactions for Expense
  const pendingTxs = useMemo(
    () => expenseTransactions.filter((t) => t.state === 'PENDING_APPROVAL' || t.state === 'SUBMITTED'),
    [expenseTransactions]
  );
  const approvedTxs = useMemo(
    () => expenseTransactions.filter((t) => t.state === 'APPROVED'),
    [expenseTransactions]
  );
  const historyTxs = useMemo(
    () => expenseTransactions.filter((t) => t.state === 'COMPLETED' || t.state === 'REJECTED' || t.state === 'CANCELLED'),
    [expenseTransactions]
  );

  const rawDisplayedList =
    activeTab === 'incoming'
      ? incomingReports
      : activeTab === 'pending'
      ? pendingTxs
      : activeTab === 'approved'
      ? approvedTxs
      : historyTxs;

  const displayedList = useMemo(() => {
    if (!searchQuery.trim()) return rawDisplayedList;
    const q = searchQuery.toLowerCase();
    return rawDisplayedList.filter((tx) => {
      const matchCat = tx.category.toLowerCase().includes(q);
      const matchNotes = (tx.notes || '').toLowerCase().includes(q);
      const matchName = (tx.creator?.fullName || '').toLowerCase().includes(q);
      const matchAmount = String(tx.amount).includes(q);
      return matchCat || matchNotes || matchName || matchAmount;
    });
  }, [rawDisplayedList, searchQuery]);

  const totalReservedAmount = pendingTxs.reduce((sum, t) => sum + t.amount, 0);

  const getStatusBadge = (tx: Transaction) => {
    switch (tx.state) {
      case 'SUBMITTED':
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Menunggu Kuorum
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Disetujui (Siap Bayar)
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Selesai
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            Ditolak
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
            <Ban className="w-3 h-3" />
            Dibatalkan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {tx.state}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            Persetujuan & Verifikasi Kas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verifikasi setoran iuran warga dan persetujuan pengeluaran kas transparan berbasis kuorum M-of-N.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setPolicyModalOpen(true)}
            className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Settings2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Atur Kuorum M-of-N
          </button>
        )}
      </div>

      {/* Info & Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-300/80 dark:border-emerald-700/80 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <span>Iuran Warga Masuk</span>
            <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200">
            {incomingReports.length} Laporan
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            Menunggu verifikasi pengurus kas
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-300/80 dark:border-amber-700/80 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-300">
            <span>Dana Dicadangkan (Reservasi)</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-200">
            Rp {totalReservedAmount.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            {pendingTxs.length} pengeluaran menunggu persetujuan
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/20 border border-sky-300/80 dark:border-sky-700/80 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-800 dark:text-sky-300">
            <span>Aturan Kuorum Komunitas</span>
            <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-900 dark:text-sky-200">
            {activeWallet?.requiredApprovals || 2} Suara Pengurus
          </div>
          <p className="text-[11px] text-sky-700 dark:text-sky-400">
            Anti-Self Approval aktif & terikat hash SHA-256
          </p>
        </div>
      </div>

      {/* Tabs Filter Bar & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tabs Filter matching mockup */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl max-w-xl">
          <button
            onClick={() => {
              setActiveTab('incoming');
              setSearchQuery('');
            }}
            className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'incoming'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Iuran Warga ({incomingReports.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('pending');
              setSearchQuery('');
            }}
            className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Menunggu ({pendingTxs.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('approved');
              setSearchQuery('');
            }}
            className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'approved'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Disetujui ({approvedTxs.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('history');
              setSearchQuery('');
            }}
            className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Riwayat ({historyTxs.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari transaksi..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs py-2 pl-8 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm placeholder:text-slate-400"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-semibold flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Memuat daftar transaksi dan laporan kas...
        </div>
      ) : displayedList.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-slate-900/40 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Tidak Ada Transaksi di Tab Ini
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {activeTab === 'incoming'
              ? 'Semua laporan iuran warga telah diverifikasi atau belum ada laporan baru.'
              : activeTab === 'pending'
              ? 'Semua pengeluaran telah diproses atau belum ada pengajuan baru.'
              : activeTab === 'approved'
              ? 'Belum ada pengeluaran yang selesai kuorum dan menunggu dibayarkan.'
              : 'Belum ada riwayat transaksi pengeluaran sebelumnya.'}
          </p>
        </div>
      ) : activeTab === 'incoming' ? (
        /* Tab 1: Iuran Warga (Member Income Self-Reports) */
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Warga Pelapor</th>
                  <th className="px-6 py-4">Kategori & Catatan</th>
                  <th className="px-6 py-4">Nominal</th>
                  <th className="px-6 py-4">Bukti Bayar</th>
                  <th className="px-6 py-4 text-right">Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {displayedList.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                      {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">
                          {tx.creator?.fullName?.charAt(0).toUpperCase() || 'W'}
                        </div>
                        <span className="truncate">{tx.creator?.fullName || 'Warga'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 ml-9 truncate">
                        {tx.creator?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                        {tx.category}
                      </div>
                      {tx.notes && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-1 mt-0.5">
                          "{tx.notes}"
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                        + Rp {tx.amount.toLocaleString('id-ID')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.receiptAttachmentId ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImageUrl(`/api/v1/attachments/${tx.receiptAttachmentId}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Foto Bukti</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {isManagerOrAdmin ? (
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={processingTxId === tx.id}
                            onClick={() => handleVerifyIncome(tx.id, 'REJECT')}
                            className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            Tolak
                          </button>
                          <button
                            type="button"
                            disabled={processingTxId === tx.id}
                            onClick={() => handleVerifyIncome(tx.id, 'APPROVE')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                          >
                            {processingTxId === tx.id ? '...' : 'Terima'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedTx(tx)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                        >
                          Rincian
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {displayedList.map((tx) => (
              <div
                key={tx.id}
                className="p-5 rounded-3xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex flex-col gap-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Menunggu Verifikasi
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {tx.category}
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {tx.creator?.fullName || 'Warga Komunitas'}
                      </span>
                      <span>•</span>
                      <span className="text-[11px] font-mono">{tx.creator?.email}</span>
                    </div>
                  </div>

                  {tx.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      "{tx.notes}"
                    </p>
                  )}

                  {tx.receiptAttachmentId && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setPreviewImageUrl(`/api/v1/attachments/${tx.receiptAttachmentId}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Lihat Foto Bukti Transfer</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400">Nominal</div>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      + Rp {tx.amount.toLocaleString('id-ID')}
                    </div>
                  </div>

                  {isManagerOrAdmin ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={processingTxId === tx.id}
                        onClick={() => handleVerifyIncome(tx.id, 'REJECT')}
                        className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-bold"
                      >
                        Tolak
                      </button>
                      <button
                        type="button"
                        disabled={processingTxId === tx.id}
                        onClick={() => handleVerifyIncome(tx.id, 'APPROVE')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                      >
                        {processingTxId === tx.id ? '...' : 'Terima'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedTx(tx)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                    >
                      Rincian
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Tabs 2, 3, 4: Pengeluaran (Expense / Quorum M-of-N) */
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Deskripsi & Pengaju</th>
                  <th className="px-6 py-4">Jumlah</th>
                  <th className="px-6 py-4">Kuorum M-of-N</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {displayedList.map((tx) => {
                  const isCreator = user?.id === tx.creatorId;
                  const requiredCount =
                    tx.wallet?.approvalPolicies?.[0]?.requiredApprovals ||
                    activeWallet?.requiredApprovals ||
                    2;
                  const approvalsCount = tx.approvalsCount || 0;
                  const isPending = tx.state === 'PENDING_APPROVAL' || tx.state === 'SUBMITTED';
                  const isApproved = tx.state === 'APPROVED';

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Tanggal */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Deskripsi & Pengaju */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span className="truncate">{tx.category}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                          <span>Oleh {tx.creator?.fullName || 'Pengelola'} {isCreator && '(Anda)'}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px]">#{tx.id.substring(0, 8)}</span>
                        </div>
                      </td>

                      {/* Jumlah */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                          - Rp {tx.amount.toLocaleString('id-ID')}
                        </div>
                      </td>

                      {/* Kuorum M-of-N */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isPending ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{approvalsCount}/{requiredCount} Suara</span>
                            </span>
                            {isCreator && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Anti-Self Approval
                              </div>
                            )}
                          </div>
                        ) : isApproved ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{approvalsCount}/{requiredCount} (Lengkap)</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">
                            {approvalsCount}/{requiredCount}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(tx)}
                      </td>

                      {/* Aksi */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {isPending && isManagerOrAdmin && !isCreator && (
                            <>
                              <button
                                type="button"
                                disabled={processingTxId === tx.id}
                                onClick={() => handleProcessExpenseApproval(tx, 'REJECT')}
                                className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold transition-colors disabled:opacity-50"
                              >
                                Tolak
                              </button>
                              <button
                                type="button"
                                disabled={processingTxId === tx.id}
                                onClick={() => handleProcessExpenseApproval(tx, 'APPROVE')}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1"
                              >
                                <ThumbsUp className="w-3 h-3" />
                                {processingTxId === tx.id ? '...' : 'Setujui'}
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedTx(tx)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1 group-hover:border-emerald-500"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500" />
                            <span>Rincian</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {displayedList.map((tx) => {
              const isCreator = user?.id === tx.creatorId;
              const requiredCount =
                tx.wallet?.approvalPolicies?.[0]?.requiredApprovals ||
                activeWallet?.requiredApprovals ||
                2;
              const approvalsCount = tx.approvalsCount || 0;
              const isPending = tx.state === 'PENDING_APPROVAL' || tx.state === 'SUBMITTED';
              const isApproved = tx.state === 'APPROVED';

              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="p-5 rounded-3xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">
                        #{tx.id.substring(0, 8)}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        • {tx.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {tx.creator?.fullName || 'Pengelola'} {isCreator && '(Anda)'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Nominal Pengeluaran
                      </div>
                      <div className="text-xl font-black text-slate-900 dark:text-white">
                        - Rp {tx.amount.toLocaleString('id-ID')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPending ? (
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/20 text-xs font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{approvalsCount}/{requiredCount}</span>
                          </div>
                          {isCreator && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center justify-end gap-1">
                              <Lock className="w-2.5 h-2.5" /> Anti-Self
                            </div>
                          )}
                        </div>
                      ) : isApproved ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/20 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Siap Bayar</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                          <span>{tx.state}</span>
                        </div>
                      )}

                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <TransactionDetailModal
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
          onSuccess={() => {
            fetchTransactions();
            setSelectedTx(null);
          }}
        />
      )}

      {/* Approval Policy Config Modal (Admin only) */}
      {isAdmin && policyModalOpen && (
        <ApprovalPolicyModal
          isOpen={policyModalOpen}
          onClose={() => setPolicyModalOpen(false)}
          onSuccess={() => {
            fetchTransactions();
            setPolicyModalOpen(false);
          }}
        />
      )}

      {/* Image Lightbox Modal for Receipt Preview */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Bukti Transfer / Struk Iuran
              </span>
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto rounded-2xl flex items-center justify-center bg-black/5 dark:bg-black/40 p-2">
              <img
                src={previewImageUrl}
                alt="Foto Bukti Transfer"
                className="max-h-[70vh] w-auto object-contain rounded-xl shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
