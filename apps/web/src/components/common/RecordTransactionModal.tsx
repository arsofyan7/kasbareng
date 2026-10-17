import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { TransactionType, ApiResponse, Transaction } from '../../types';
import {
  X,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  FileCheck,
  Send,
} from 'lucide-react';

interface RecordTransactionModalProps {
  isOpen: boolean;
  initialType?: TransactionType;
  availableBalance?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecordTransactionModal: React.FC<RecordTransactionModalProps> = ({
  isOpen,
  initialType = 'INCOME',
  availableBalance = 0,
  onClose,
  onSuccess,
}) => {
  const { token } = useAuth();
  const { activeWallet } = useWallet();

  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !activeWallet) return null;

  const numericAmount = parseFloat(amountStr.replace(/[^0-9]/g, '')) || 0;

  const quickCategories = type === 'INCOME'
    ? ['Iuran Warga Bulanan', 'Sumbangan Sukarela', 'Uang Sampah', 'Dana Donasi Lingkungan']
    : ['Kebersihan Lingkungan', 'Keamanan / Ronda', 'Konsumsi Musyawarah', 'Listrik & Air Pos', 'Perbaikan Sarana'];

  const handleSubmit = async (directSubmit: boolean) => {
    if (numericAmount <= 0) {
      setErrorMsg('Nominal transaksi harus lebih besar dari 0.');
      return;
    }

    if (!category.trim()) {
      setErrorMsg('Pilih atau isi kategori transaksi.');
      return;
    }

    if (type === 'EXPENSE' && directSubmit && numericAmount > availableBalance) {
      setErrorMsg(
        `Nominal pengeluaran (Rp ${numericAmount.toLocaleString('id-ID')}) melebihi saldo tersedia (Rp ${availableBalance.toLocaleString('id-ID')}).`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Step 1: Create draft
      const draftRes = await fetch(`/api/v1/wallets/${activeWallet.id}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          amount: numericAmount,
          currency: activeWallet.currency,
          category: category.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      const draftJson: ApiResponse<Transaction> = await draftRes.json();
      if (!draftRes.ok || !draftJson.data) {
        throw new Error(draftJson.error?.message || 'Gagal menyimpan draf transaksi.');
      }

      // Step 2: If directSubmit requested, submit the draft immediately
      if (directSubmit) {
        const submitRes = await fetch(`/api/v1/transactions/${draftJson.data.id}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ expectedVersion: 1 }),
        });

        const submitJson = await submitRes.json();
        if (!submitRes.ok) {
          throw new Error(submitJson.error?.message || 'Draf tersimpan tetapi gagal diajukan.');
        }
      }

      // Reset and close
      setAmountStr('');
      setCategory('');
      setNotes('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {type === 'INCOME' ? 'Catat Pemasukan Kas' : 'Ajukan Pengeluaran Kas'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dompet: <strong className="text-emerald-600 dark:text-emerald-400">{activeWallet.name}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setType('INCOME');
              setCategory('');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              type === 'INCOME'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Pemasukan (Income)
          </button>
          <button
            type="button"
            onClick={() => {
              setType('EXPENSE');
              setCategory('');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              type === 'EXPENSE'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Pengeluaran (Expense)
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Nominal */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nominal Transaksi (Rp) <span className="text-rose-500">*</span>
              </label>
              {type === 'EXPENSE' && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Saldo Tersedia: <strong>Rp {availableBalance.toLocaleString('id-ID')}</strong>
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                Rp
              </span>
              <input
                type="text"
                placeholder="0"
                value={amountStr}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setAmountStr(raw ? Number(raw).toLocaleString('id-ID') : '');
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Kategori & Quick Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kategori <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ketik atau pilih kategori di bawah"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 mb-2"
            />
            <div className="flex flex-wrap gap-1.5">
              {quickCategories.map((qc) => (
                <button
                  type="button"
                  key={qc}
                  onClick={() => setCategory(qc)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                    category === qc
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {qc}
                </button>
              ))}
            </div>
          </div>

          {/* Catatan / Keperluan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Rincian Keperluan
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Pembelian 3 kaleng cat untuk renovasi pos ronda..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <FileCheck className="w-3.5 h-3.5" />
            Simpan Draf
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 ${
              type === 'INCOME'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            {isSubmitting ? 'Memproses...' : type === 'INCOME' ? 'Catat & Bukukan' : 'Ajukan Persetujuan'}
          </button>
        </div>
      </div>
    </div>
  );
};