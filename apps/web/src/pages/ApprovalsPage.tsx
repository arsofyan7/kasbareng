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
  AlertCircle,
  Settings2,
  Calendar,
  User,
  ArrowRight,
  Lock,
  Camera,
  ExternalLink,
  ThumbsDown,
  X,
} from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const { user, token } = useAuth();
  const { activeWallet } = useWallet();

  const [activeTab, setActiveTab] = useState<'incoming' | 'pending' | 'approved' | 'history'>('incoming');
  const [expenseTransactions, setExpenseTransactions] = useState<Transaction[]>([]);
  const [incomingReports, setIncomingReports] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  // Filtered transactions for Expense
  const pendingTxs = expenseTransactions.filter(
    (t) => t.state === 'PENDING_APPROVAL' || t.state === 'SUBMITTED'
  );
  const approvedTxs = expenseTransactions.filter((t) => t.state === 'APPROVED');
  const historyTxs = expenseTransactions.filter(
    (t) => t.state === 'COMPLETED' || t.state === 'REJECTED' || t.state === 'CANCELLED'
  );

  const displayedList =
    activeTab === 'incoming'
      ? incomingReports
      : activeTab === 'pending'
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
            Persetujuan & Verifikasi Kas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verifikasi setoran iuran warga dan persetujuan pengeluaran kas transparan berbasis kuorum M-of-N.
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
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <span>Iuran Warga Masuk</span>
            <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-900 dark:text-emerald-200">
            {incomingReports.length} Laporan
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            Menunggu verifikasi pengurus kas
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/40 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-300">
            <span>Dana Dicadangkan (Reservasi)</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-900 dark:text-amber-200">
            Rp {totalReservedAmount.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            {pendingTxs.length} pengeluaran menunggu persetujuan
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/20 border border-sky-200/80 dark:border-sky-800/40 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-800 dark:text-sky-300">
            <span>Aturan Kuorum Komunitas</span>
            <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-xl font-black text-sky-900 dark:text-sky-200">
            {activeWallet?.requiredApprovals || 2} Suara Pengurus
          </div>
          <p className="text-[11px] text-sky-700 dark:text-sky-400">
            Anti-Self Approval aktif & terikat hash SHA-256
          </p>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl max-w-xl">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'incoming'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Iuran Warga</span>
          {incomingReports.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-extrabold">
              {incomingReports.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'pending'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Pengeluaran ({pendingTxs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'approved'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Siap Bayar ({approvedTxs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Riwayat ({historyTxs.length})</span>
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
          Memuat daftar transaksi dan laporan kas...
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
        <div className="space-y-3">
          {displayedList.map((tx) => (
            <div
              key={tx.id}
              className="p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Details */}
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Menunggu Verifikasi Pengurus
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
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
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

                {/* Receipt Image Button */}
                {tx.receiptAttachmentId && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewImageUrl(`/api/v1/attachments/${tx.receiptAttachmentId}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Lihat Foto Bukti Transfer</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                )}
              </div>

              {/* Right Side: Nominal & Verification Buttons */}
              <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                <div className="text-left md:text-right">
                  <div className="text-xs text-slate-400">Nominal Setoran</div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    + Rp {tx.amount.toLocaleString('id-ID')}
                  </div>
                </div>

                {/* Manager Decision Buttons */}
                {isManagerOrAdmin ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      disabled={processingTxId === tx.id}
                      onClick={() => handleVerifyIncome(tx.id, 'REJECT')}
                      className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      Tolak
                    </button>
                    <button
                      type="button"
                      disabled={processingTxId === tx.id}
                      onClick={() => handleVerifyIncome(tx.id, 'APPROVE')}
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {processingTxId === tx.id ? 'Memproses...' : 'Verifikasi & Terima'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedTx(tx)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Rincian
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Tabs 2, 3, 4: Pengeluaran (Expense / Quorum M-of-N) */
        <div className="space-y-3">
          {displayedList.map((tx) => {
            const isCreator = user?.id === tx.creatorId;
            const requiredCount =
              tx.wallet?.approvalPolicies?.[0]?.requiredApprovals ||
              activeWallet?.requiredApprovals ||
              2;
            const approvalsCount = tx.approvalsCount || 0;
            const isApproved = tx.state === 'APPROVED';

            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all cursor-pointer space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
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

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Nominal Pengeluaran
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      Rp {tx.amount.toLocaleString('id-ID')}
                    </div>
                  </div>

                  {/* Quorum Badge / Status */}
                  <div className="flex items-center gap-3">
                    {tx.state === 'PENDING_APPROVAL' || tx.state === 'SUBMITTED' ? (
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/20 text-xs font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            Kuorum: {approvalsCount}/{requiredCount}
                          </span>
                        </div>
                        {isCreator && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center justify-end gap-1">
                            <Lock className="w-3 h-3" /> Anti-Self Approval
                          </div>
                        )}
                      </div>
                    ) : isApproved ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/20 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Kuorum Terpenuhi (Siap Bayar)</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
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
