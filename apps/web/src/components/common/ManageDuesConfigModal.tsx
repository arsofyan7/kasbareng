import React, { useState, useEffect } from 'react';
import { useWallet } from '../../context/WalletContext';
import { DuesType } from '../../types';
import {
  X,
  Calendar,
  Layers,
  HeartHandshake,
  Banknote,
  Info,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sliders,
  TrendingUp,
} from 'lucide-react';

interface ManageDuesConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ManageDuesConfigModal: React.FC<ManageDuesConfigModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { activeWallet, updateWalletSettings } = useWallet();

  const [duesType, setDuesType] = useState<DuesType>('MONTHLY');
  const [duesAmountStr, setDuesAmountStr] = useState<string>('');
  const [targetInstallmentsCount, setTargetInstallmentsCount] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);

  // Sync state when modal opens or activeWallet changes
  useEffect(() => {
    if (activeWallet && isOpen) {
      setDuesType(activeWallet.duesType || 'MONTHLY');
      setDuesAmountStr(
        activeWallet.duesAmount ? Number(activeWallet.duesAmount).toLocaleString('id-ID') : ''
      );
      setTargetInstallmentsCount(activeWallet.targetInstallmentsCount || 10);
      setErrorMsg(null);
      setSuccessToast(false);
    }
  }, [activeWallet, isOpen]);

  if (!isOpen || !activeWallet) return null;

  const currentAmount = activeWallet.duesAmount ? Number(activeWallet.duesAmount) : 0;
  const parsedNewAmount = duesAmountStr.trim()
    ? parseFloat(duesAmountStr.replace(/[^0-9]/g, ''))
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await updateWalletSettings(activeWallet.id, {
        duesType,
        duesAmount: parsedNewAmount,
        targetInstallmentsCount: duesType === 'TARGET_INSTALLMENTS' ? targetInstallmentsCount : null,
      });

      setSuccessToast(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memperbarui pengaturan iuran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Pengaturan Nominal & Skema Iuran
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeWallet.name} • Fleksibilitas Berkelanjutan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successToast && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Pengaturan iuran berhasil disimpan & dicatat ke rantai audit!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: Skema / Tipe Iuran */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 space-y-3">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Tipe Skema Iuran
            </label>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDuesType('MONTHLY')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center font-medium transition-all ${
                  duesType === 'MONTHLY'
                    ? 'border-emerald-500 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-xs">Rutin Bulanan</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Berkelanjutan</span>
              </button>

              <button
                type="button"
                onClick={() => setDuesType('TARGET_INSTALLMENTS')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center font-medium transition-all ${
                  duesType === 'TARGET_INSTALLMENTS'
                    ? 'border-emerald-500 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900'
                }`}
              >
                <Layers className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-xs">Target Termin</span>
                <span className="text-[10px] text-slate-400">N-Kali Setor</span>
              </button>

              <button
                type="button"
                onClick={() => setDuesType('FREEFORM')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center font-medium transition-all ${
                  duesType === 'FREEFORM'
                    ? 'border-emerald-500 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900'
                }`}
              >
                <HeartHandshake className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-xs">Sukarela</span>
                <span className="text-[10px] text-slate-400">Tanpa Tagihan</span>
              </button>
            </div>

            {duesType === 'TARGET_INSTALLMENTS' && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Jumlah Termin (N-Kali Setor)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={targetInstallmentsCount}
                  onChange={(e) => setTargetInstallmentsCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Section 2: Nominal Iuran Baru */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Nominal Acuan Iuran
              </label>
              {currentAmount > 0 && (
                <span className="text-[11px] text-slate-500">
                  Saat ini: <strong className="text-slate-700 dark:text-slate-300">Rp {currentAmount.toLocaleString('id-ID')}</strong>
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                Rp
              </span>
              <input
                type="text"
                placeholder="Contoh: 75.000 (Kosongkan jika sukarela)"
                value={duesAmountStr}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setDuesAmountStr(raw ? Number(raw).toLocaleString('id-ID') : '');
                }}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Difference indicator */}
            {parsedNewAmount !== null && parsedNewAmount !== currentAmount && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-300 dark:border-emerald-800/80">
                <TrendingUp className="w-4 h-4" />
                <span>
                  Nominal akan diperbarui dari <strong>Rp {currentAmount.toLocaleString('id-ID')}</strong> menjadi <strong>Rp {parsedNewAmount.toLocaleString('id-ID')}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Section 3: Educational Integrity Notice */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 space-y-2">
            <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
              <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Prinsip Integritas Data Multi-Tahun:
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Perubahan nominal ini hanya berlaku untuk perhitungan target periode kas berikutnya. Seluruh riwayat setoran warga yang sudah lunas pada bulan/tahun lalu <strong>tetap utuh dan valid</strong> sesuai bukti transfer aslinya.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Perubahan ini otomatis dicatat ke rantai audit SHA-256 (Tamper-Evident).</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Pengaturan Iuran'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
