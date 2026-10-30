/**
 * ============================================================================
 * TransactionDetailModal.tsx - Modal Rincian Transaksi, FSM, & Kuorum Persetujuan
 * ============================================================================
 * Komponen modal terlengkap yang merepresentasikan alur Finite State Machine (FSM)
 * tata kelola kas bersama di KASBARENG:
 * 1. Menampilkan rincian nominal, kategori, pembuat, waktu, dan foto bukti transfer.
 * 2. Visualisasi Kemajuan Kuorum M-of-N: Menghitung persentase suara masuk terhadap
 *    ambang batas persetujuan yang disyaratkan dompet kas.
 * 3. Penegakan Aturan Anti-Self Approval: Mencegah pembuat draf pengeluaran menyetujui
 *    pengeluarannya sendiri secara sepihak.
 * 4. Alur Verifikasi Pemasukan Warga: Pengurus (Admin/Pengelola) memverifikasi bukti setoran.
 * 5. Eksekusi Pembayaran Kas (Posting DEBIT Ledger): Input nomor referensi bank untuk
 *    transaksi yang telah disetujui kuorum hingga berstatus COMPLETED.
 * 6. Kronologi Audit FSM: Menampilkan riwayat transisi status dan aktor penanggung jawab.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { Transaction, TransactionState } from '../../types';
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Ban,
  AlertCircle,
  ShieldCheck,
  User,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  CreditCard,
  History,
  Lock,
  Camera,
  ExternalLink,
} from 'lucide-react';

/**
 * Interface properti TransactionDetailModal
 */
interface TransactionDetailModalProps {
  transaction: Transaction | null;     // Data transaksi awal yang dipilih untuk dilihat
  onClose: () => void;                  // Callback fungsi penutupan modal
  onSuccess: () => void;                // Callback setelah aksi mutasi status transaksi sukses
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction: initialTransaction,
  onClose,
  onSuccess,
}) => {
  // ---------------------------------------------------------------------------
  // HOOKS & CONTEXT
  // ---------------------------------------------------------------------------
  const { user, token } = useAuth();
  const { activeWallet } = useWallet();

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  // Objek transaksi aktif (disinkronkan dengan pembaruan data real-time dari backend)
  const [transaction, setTransaction] = useState<Transaction | null>(initialTransaction);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false); // Indikator fetch rincian data
  const [isSubmitting, setIsSubmitting] = useState(false);         // Indikator loading saat submit aksi
  const [errorMsg, setErrorMsg] = useState<string | null>(null);    // Penampung pesan kesalahan
  const [successNotice, setSuccessNotice] = useState<string | null>(null); // Penampung notifikasi sukses

  // State untuk form persetujuan / penolakan kuorum
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [approvalDecision, setApprovalDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [approvalComment, setApprovalComment] = useState('');

  // State untuk form eksekusi pembayaran kas (posting resmi ke ledger)
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // ---------------------------------------------------------------------------
  // EFEK SAMPING: Sinkronisasi State saat Props initialTransaction Berubah
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setTransaction(initialTransaction);
    if (!initialTransaction) {
      setErrorMsg(null);
      setSuccessNotice(null);
      setShowApprovalForm(false);
      setShowPaymentForm(false);
    }
  }, [initialTransaction]);

  // ---------------------------------------------------------------------------
  // EFEK SAMPING: Mengambil Rincian Terkini dari Server saat Modal Terbuka
  // Memastikan data persetujuan kuorum, lampiran, dan event log selalu up-to-date
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!initialTransaction?.id || !token) return;

    let isMounted = true;
    setIsLoadingDetails(true);

    fetch(`/api/v1/transactions/${initialTransaction.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data) {
          setTransaction(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingDetails(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialTransaction?.id, token]);

  // ---------------------------------------------------------------------------
  // HANDLER: Menutup Modal & Reset Seluruh Form Internal
  // ---------------------------------------------------------------------------
  const handleClose = () => {
    setTransaction(null);
    setErrorMsg(null);
    setSuccessNotice(null);
    setShowApprovalForm(false);
    setShowPaymentForm(false);
    onClose();
  };

  // Jangan render jika tidak ada transaksi yang dipilih
  if (!initialTransaction) return null;

  // Tampilan loading spinner jika data transaksi belum selesai diambil dari server
  if (isLoadingDetails && (!transaction || transaction.amount === undefined || !transaction.type)) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
          <div className="py-8 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Memuat rincian transaksi...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!transaction) return null;

  // ---------------------------------------------------------------------------
  // COMPUTED VARIABLES & STATE FLAGS (Evaluasi Aturan Bisnis)
  // ---------------------------------------------------------------------------
  const isIncome = transaction.type === 'INCOME';
  const isDraft = transaction.state === 'DRAFT';
  const isPending = transaction.state === 'PENDING_APPROVAL' || transaction.state === 'SUBMITTED';
  const isApproved = transaction.state === 'APPROVED';
  const isCompleted = transaction.state === 'COMPLETED';
  const isRejected = transaction.state === 'REJECTED';

  // Cek apakah pengguna login adalah pembuat transaksi
  const isCreator = user?.id === transaction.creatorId;
  
  // Cek apakah pengguna login memiliki peran pengurus (Admin atau Pengelola)
  const isEligibleRole =
    activeWallet?.myRole === 'ADMIN' || activeWallet?.myRole === 'PENGELOLA';

  // Daftar persetujuan yang sah pada versi transaksi saat ini (mencegah replay attack versi lama)
  const currentVersionApprovals = (transaction.approvals || []).filter(
    (a) => a.transactionVersion === transaction.version
  );
  const validApprovals = currentVersionApprovals.filter((a) => a.decision === 'APPROVE');
  const hasUserApproved = currentVersionApprovals.some((a) => a.approverId === user?.id);

  // Ambang batas persetujuan yang disyaratkan oleh kebijakan dompet (M-of-N Quorum)
  const requiredApprovals =
    transaction.wallet?.approvalPolicies?.[0]?.requiredApprovals ||
    activeWallet?.requiredApprovals ||
    2;

  // Persentase capaian kuorum (0 - 100%)
  const quorumPercentage = Math.min(
    100,
    Math.round((validApprovals.length / requiredApprovals) * 100)
  );

  // ---------------------------------------------------------------------------
  // HANDLER: Mengajukan Draf Transaksi ke Kuorum Persetujuan (/submit)
  // ---------------------------------------------------------------------------
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/transactions/${transaction.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expectedVersion: transaction.version }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal mengajukan transaksi.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLER: Membatalkan Transaksi Kas (/cancel)
  // ---------------------------------------------------------------------------
  const handleCancel = async () => {
    if (!confirm('Apakah Anda yakin ingin membatalkan transaksi ini?')) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/transactions/${transaction.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Dibatalkan oleh pengguna melalui antarmuka.' }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal membatalkan transaksi.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLER: Memproses Persetujuan / Penolakan Kuorum (/approvals)
  // Dilindungi oleh aturan Anti-Self Approval pada server backend
  // ---------------------------------------------------------------------------
  const handleProcessApproval = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/transactions/${transaction.id}/approvals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision: approvalDecision,
          comment: approvalComment.trim() || undefined,
          expectedVersion: transaction.version,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal memproses persetujuan.');
      }

      setSuccessNotice(
        approvalDecision === 'APPROVE'
          ? 'Persetujuan Anda berhasil dicatat!'
          : 'Keputusan penolakan transaksi telah dicatat.'
      );
      setShowApprovalForm(false);
      onSuccess();

      // Refresh data rincian transaksi setelah keputusan dicatat
      const refreshed = await fetch(`/api/v1/transactions/${transaction.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());
      if (refreshed.data) setTransaction(refreshed.data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLER: Eksekusi Pembayaran Kas (/pay)
  // Memposting entri DEBIT ke buku kas ganda dan merilis saldo cadangan
  // ---------------------------------------------------------------------------
  const handleExecutePayment = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/transactions/${transaction.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentReference: paymentRef.trim() || undefined,
          notes: paymentNotes.trim() || undefined,
          expectedVersion: transaction.version,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal mengeksekusi pembayaran.');
      }

      setSuccessNotice('Pembayaran kas berhasil dibukukan resmi ke ledger!');
      setShowPaymentForm(false);
      onSuccess();

      // Refresh data transaksi
      const refreshed = await fetch(`/api/v1/transactions/${transaction.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());
      if (refreshed.data) setTransaction(refreshed.data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLER: Verifikasi Laporan Setoran Iuran Warga (/verify-income)
  // Pengurus memvalidasi mutasi rekening atau struk transfer warga
  // ---------------------------------------------------------------------------
  const handleVerifyIncome = async (decision: 'APPROVE' | 'REJECT') => {
    let reason: string | undefined = undefined;
    if (decision === 'REJECT') {
      const inputReason = prompt('Masukkan alasan penolakan laporan iuran (misal: Bukti transfer tidak valid/dana belum masuk):');
      if (inputReason === null) return;
      reason = inputReason.trim() || 'Laporan iuran ditolak oleh pengurus kas.';
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/transactions/${transaction.id}/verify-income`, {
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
        throw new Error(json.error?.message || 'Gagal memverifikasi laporan pemasukan.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HELPER: Render Lencana Status FSM (State Badge)
  // ---------------------------------------------------------------------------
  const getStateBadge = (state: TransactionState) => {
    switch (state) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Draf
          </span>
        );
      case 'SUBMITTED':
        if (isIncome) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              <Clock className="w-3.5 h-3.5" />
              Menunggu Verifikasi Pengurus
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Menunggu Persetujuan
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Menunggu Persetujuan
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Disetujui (Siap Dibayar)
          </span>
        );
      case 'PAYMENT_PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
            <CreditCard className="w-3.5 h-3.5" />
            Proses Pembayaran
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Selesai Dibukukan
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
            <Ban className="w-3.5 h-3.5" />
            Dibatalkan
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {state}
          </span>
        );
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER UI MODAL
  // ---------------------------------------------------------------------------
  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto cursor-default"
      >
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Detail Transaksi Kas</span>
              {isLoadingDetails && (
                <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ID: <span className="font-mono">{transaction.id.substring(0, 8)}...</span> • Versi {transaction.version}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            title="Tutup Modal"
            aria-label="Tutup Detail Transaksi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NOTIFIKASI ERROR & SUKSES */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successNotice && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* HERO KARTU NOMINAL & LENCANA STATUS */}
        <div
          className={`p-5 rounded-2xl border flex items-center justify-between ${
            isIncome
              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/80'
              : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700/80'
          }`}
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {isIncome ? 'Pemasukan Kas' : 'Pengeluaran Kas'}
            </span>
            <div
              className={`text-2xl font-extrabold tracking-tight mt-0.5 ${
                isIncome ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {isIncome ? '+ ' : '- '}
              Rp {Number(transaction.amount || 0).toLocaleString('id-ID')}
            </div>
          </div>
          <div>{getStateBadge(transaction.state)}</div>
        </div>

        {/* KARTU LAMPIRAN STRUK / BUKTI TRANSFER */}
        {transaction.receiptAttachmentId && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Foto Bukti Pembayaran / Transfer
              </span>
              <a
                href={`/api/v1/attachments/${transaction.receiptAttachmentId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                Buka Penuh <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative rounded-xl overflow-hidden max-h-56 bg-black/5 dark:bg-black/20 flex items-center justify-center p-1">
              <img
                src={`/api/v1/attachments/${transaction.receiptAttachmentId}`}
                alt="Bukti Transfer"
                className="max-h-52 w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        )}

        {/* KARTU KEMAJUAN KUORUM M-OF-N (Khusus Transaksi Pengeluaran Kas) */}
        {!isIncome && !isDraft && !isRejected && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Kemajuan Kuorum Persetujuan
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {validApprovals.length} dari {requiredApprovals} Disetujui
              </span>
            </div>

            {/* Bilah Kemajuan Suara Kuorum */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isApproved || isCompleted
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-amber-400 to-emerald-500'
                }`}
                style={{ width: `${quorumPercentage}%` }}
              />
            </div>

            {/* Daftar Pengurus yang Telah Menandatangani Persetujuan */}
            {validApprovals.length > 0 && (
              <div className="pt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                  Persetujuan Masuk:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {validApprovals.map((appr) => (
                    <span
                      key={appr.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      {appr.approver?.fullName || 'Pengelola'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Peringatan Penegakan Aturan Anti-Self Approval */}
            {isPending && isCreator && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>Aturan Anti-Self Approval Aktif:</strong> Anda adalah pembuat pengeluaran ini. Tata kelola KASBARENG mewajibkan pengelola atau admin lain untuk memberikan persetujuan.
                </span>
              </div>
            )}
          </div>
        )}

        {/* KARTU CATATAN EKSEKUSI PEMBAYARAN KAS */}
        {(isCompleted || isApproved) && transaction.paymentRecords && transaction.paymentRecords.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-700/80 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
              <CreditCard className="w-4 h-4" />
              Bukti & Referensi Pembayaran Kas
            </div>
            <div className="text-slate-600 dark:text-slate-300 text-xs">
              Ref: <span className="font-mono font-bold text-slate-900 dark:text-white">{transaction.paymentRecords[0].paymentReference || 'N/A'}</span>
            </div>
          </div>
        )}

        {/* FORM INLINE: Persetujuan / Penolakan Pengeluaran Kas */}
        {showApprovalForm && (
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 space-y-3 animate-in fade-in">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {approvalDecision === 'APPROVE' ? 'Konfirmasi Persetujuan Pengeluaran' : 'Konfirmasi Penolakan Pengeluaran'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {approvalDecision === 'APPROVE'
                ? `Anda akan menyetujui pengeluaran Rp ${Number(transaction.amount || 0).toLocaleString('id-ID')} untuk "${transaction.category || ''}".`
                : 'Pengeluaran yang ditolak akan menghentikan transaksi dan mengembalikan saldo yang dicadangkan.'}
            </p>
            <input
              type="text"
              placeholder={approvalDecision === 'APPROVE' ? 'Catatan opsional (misal: Sesuai RAB pos ronda)...' : 'Alasan penolakan (misal: Anggaran belum disepakati)...'}
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowApprovalForm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleProcessApproval}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm flex items-center gap-1.5 ${
                  approvalDecision === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {approvalDecision === 'APPROVE' ? <ThumbsUp className="w-3.5 h-3.5" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                {isSubmitting ? 'Menyimpan...' : approvalDecision === 'APPROVE' ? 'Ya, Setujui' : 'Ya, Tolak'}
              </button>
            </div>
          </div>
        )}

        {/* FORM INLINE: Eksekusi Pembayaran Kas (Posting DEBIT ke Ledger) */}
        {showPaymentForm && (
          <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-700/80 space-y-3 animate-in fade-in">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Eksekusi Pembayaran Kas (Posting Ledger DEBIT)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Transaksi ini telah disetujui kuorum. Masukkan referensi pembayaran (misal No. Resi Bank / Bukti Bayar) untuk memposting pengeluaran resmi dan menyelesaikan transaksi.
            </p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="No. Referensi Transfer / Kwitansi (misal: TRF-BCA-10294)"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
              />
              <input
                type="text"
                placeholder="Catatan pembayaran opsional..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPaymentForm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecutePayment}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSubmitting ? 'Memproses...' : 'Bukukan Pembayaran'}
              </button>
            </div>
          </div>
        )}

        {/* RINCIAN ATRIBUT UTAMA TRANSAKSI */}
        <div className="space-y-3 text-xs">
          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Kategori</span>
            <span className="font-semibold text-slate-900 dark:text-white">{transaction.category}</span>
          </div>

          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Waktu Transaksi
            </span>
            <span className="text-slate-700 dark:text-slate-300">
              {transaction.createdAt
                ? new Date(transaction.createdAt).toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : '-'}
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Diajukan Oleh
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {transaction.creator?.fullName || 'Anggota'} {isCreator && '(Anda)'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 dark:text-slate-400 block mb-1">Catatan / Keperluan:</span>
            <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs leading-relaxed">
              {transaction.notes || 'Tidak ada catatan.'}
            </p>
          </div>
        </div>

        {/* KRONOLOGI AUDIT FSM (Event Log Rantai Perubahan Status) */}
        {transaction.events && transaction.events.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Kronologi Audit FSM:
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {transaction.events.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-start justify-between text-[11px] p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300"
                >
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {evt.eventType}
                    </span>
                    {evt.actor && (
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px]">
                        Oleh: {evt.actor.fullName}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(evt.createdAt).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BILAH TOMBOL AKSI DINAMIS SESUAI STATUS TRANSAKSI & ROLE */}
        <div className="pt-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            Tutup
          </button>

          {/* AKSI STATUS DRAFT: Ajukan atau Batalkan */}
          {isDraft && (
            <>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? 'Memproses...' : isIncome ? 'Ajukan & Bukukan' : 'Ajukan untuk Kuorum'}
              </button>
            </>
          )}

          {/* AKSI STATUS PENDING APPROVAL: Setujui & Tolak (Dengan Anti-Self Approval Guard) */}
          {isPending && !isIncome && isEligibleRole && !showApprovalForm && (
            <>
              {isCreator ? (
                /* Guard Anti-Self Approval: Pembuat draf dilarang menyetujui pengeluarannya sendiri */
                <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-medium">
                  <Lock className="w-3.5 h-3.5" />
                  Anti-Self Approval (Menunggu Pengelola Lain)
                </span>
              ) : hasUserApproved ? (
                /* User sudah memberikan suara persetujuan */
                <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Anda Sudah Menyetujui
                </span>
              ) : (
                /* Pengurus yang sah dan belum memberikan suara */
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setApprovalDecision('REJECT');
                      setShowApprovalForm(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-rose-100"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    Tolak
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setApprovalDecision('APPROVE');
                      setShowApprovalForm(true);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Setujui Pengeluaran
                  </button>
                </>
              )}
            </>
          )}

          {/* AKSI STATUS APPROVED: Eksekusi Pembayaran Kas ke Penerima */}
          {isApproved && isEligibleRole && !showPaymentForm && (
            <button
              type="button"
              onClick={() => setShowPaymentForm(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/25 flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Eksekusi Pembayaran Kas
            </button>
          )}

          {/* AKSI STATUS INCOME SUBMITTED: Verifikasi Laporan Setoran Warga */}
          {isIncome && transaction.state === 'SUBMITTED' && (
            <>
              {isEligibleRole ? (
                <>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleVerifyIncome('REJECT')}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-rose-100"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    Tolak Laporan
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleVerifyIncome('APPROVE')}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verifikasi & Masukkan Kas
                  </button>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  Menunggu Verifikasi Pengurus Kas
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
