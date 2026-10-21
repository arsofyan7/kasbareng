import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { Transaction } from '../types';
import { TransactionDetailModal } from '../components/common/TransactionDetailModal';
import { ApprovalPolicyModal } from '../components/common/ApprovalPolicyModal';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings2,
  Calendar,
  User,
  ArrowRight,
  Lock,
} from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const { user, token } = useAuth();
  const { activeWallet } = useWallet();

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'history'>('pending');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);

  const isAdmin = activeWallet?.myRole === 'ADMIN';

  const fetchTransactions = useCallback(async () => {
    if (!activeWallet || !token) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/v1/wallets/${activeWallet.id}/transactions?type=EXPENSE&limit=50`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal memuat transaksi pengeluaran.');
      }

      setTransactions(json.data || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeWallet?.id, token]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Filtered transactions
  const pendingTxs = transactions.filter(
    (t) => t.state === 'PENDING_APPROVAL' || t.state === 'SUBMITTED'
  );
  const approvedTxs = transactions.filter((t) => t.state === 'APPROVED');
  const historyTxs = transactions.filter(
    (t) => t.state === 'COMPLETED' || t.state === 'REJECTED' || t.state === 'CANCELLED'
  );

  const displayedList =
    activeTab === 'pending'
      ? pendingTxs
      : activeTab === 'approved'
      ? approvedTxs
      : historyTxs;

  const totalReservedAmount = pendingTxs.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            Persetujuan Kas Komunitas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tata kelola pengeluaran dana kas transparan berbasis kuorum M-of-N multi-approver.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setPolicyModalOpen(true)}
            className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-sm transition-colors"
          >
            <Settings2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Atur Kuorum M-of-N
          </button>
        )}
      </div>

      {/* Info & Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/40 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-300">
            <span>Menunggu Persetujuan</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-200">
            {pendingTxs.length} Transaksi
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            Dana dicadangkan: Rp {totalReservedAmount.toLocaleString('id-ID')}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/20 border border-sky-200/80 dark:border-sky-800/40 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-800 dark:text-sky-300">
            <span>Siap Dibayarkan</span>
            <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-900 dark:text-sky-200">
            {approvedTxs.length} Transaksi
          </div>
          <p className="text-[11px] text-sky-700 dark:text-sky-400">
            Kuorum terpenuhi, menunggu eksekusi bayar
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <span>Aturan Kuorum Komunitas</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-900 dark:text-emerald-200">
            {activeWallet?.requiredApprovals || 2} Persetujuan
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            Anti-Self Approval aktif (creator dilarang setujui sendiri)
          </p>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl max-w-md">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'pending'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Menunggu ({pendingTxs.length})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'approved'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Siap Bayar ({approvedTxs.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'history'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Riwayat ({historyTxs.length})
        </button>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* List Content */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-semibold flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Memuat daftar persetujuan pengeluaran...
        </div>
      ) : displayedList.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Tidak Ada Transaksi di Tab Ini
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {activeTab === 'pending'
              ? 'Semua pengeluaran telah diproses atau belum ada pengajuan baru.'
              : activeTab === 'approved'
              ? 'Belum ada pengeluaran yang selesai kuorum dan menunggu dibayarkan.'
              : 'Belum ada riwayat transaksi pengeluaran sebelumnya.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedList.map((tx) => {
            const isCreator = user?.id === tx.creatorId;
            const requiredCount =
              tx.wallet?.approvalPolicies?.[0]?.requiredApprovals ||
              activeWallet?.requiredApprovals ||
              2;
            const approvedCount = (tx.approvals || []).filter(
              (a) => a.decision === 'APPROVE' && a.transactionVersion === tx.version
            ).length;
            const hasUserApproved = (tx.approvals || []).some(
              (a) =>
                a.approverId === user?.id &&
                a.decision === 'APPROVE' &&
                a.transactionVersion === tx.version
            );

            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-700/60 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                      Pengeluaran
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tx.category}
                    </span>
                    {isCreator && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        Diajukan oleh Anda
                      </span>
                    )}
                  </div>

                  <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Rp {tx.amount.toLocaleString('id-ID')}
                  </div>

                  {tx.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {tx.notes}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {tx.creator?.fullName || 'Pengelola'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Right Column: Status & Quorum */}
                <div className="flex flex-col sm:items-end justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    {tx.state === 'PENDING_APPROVAL' && (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          {approvedCount} dari {requiredCount} Kuorum
                        </span>
                        {hasUserApproved && (
                          <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            ✓ Anda sudah menyetujui
                          </span>
                        )}
                      </div>
                    )}
                    {tx.state === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Siap Dibayar
                      </span>
                    )}
                    {tx.state === 'COMPLETED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Lunas Dibukukan
                      </span>
                    )}
                    {tx.state === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <XCircle className="w-3.5 h-3.5" />
                        Ditolak
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTx(tx);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
                  >
                    <span>Rincian & Aksi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transaction Detail & Actions Modal */}
      <TransactionDetailModal
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        onSuccess={() => {
          fetchTransactions();
        }}
      />

      {/* Approval Policy Management Modal */}
      <ApprovalPolicyModal
        isOpen={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
        onSuccess={() => {
          fetchTransactions();
        }}
      />
    </div>
  );
};
