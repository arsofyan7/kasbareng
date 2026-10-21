import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { X, ShieldCheck, AlertCircle, CheckCircle2, Users } from 'lucide-react';

interface ApprovalPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ApprovalPolicyModal: React.FC<ApprovalPolicyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { token } = useAuth();
  const { activeWallet, refreshWallets } = useWallet();

  const [requiredApprovals, setRequiredApprovals] = useState(2);
  const [thresholdAmount, setThresholdAmount] = useState<string>('');
  const [eligibleCount, setEligibleCount] = useState(1);
  const [policyVersion, setPolicyVersion] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !activeWallet || !token) return;

    setIsLoading(true);
    setErrorMsg(null);

    fetch(`/api/v1/wallets/${activeWallet.id}/policy`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setRequiredApprovals(json.data.policy.requiredApprovals || 1);
          setThresholdAmount(
            json.data.policy.thresholdAmount ? String(json.data.policy.thresholdAmount) : ''
          );
          setEligibleCount(json.data.eligibleApproverCount || 1);
          setPolicyVersion(json.data.policy.policyVersion || 1);
        }
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setIsLoading(false));
  }, [isOpen, activeWallet?.id, token]);

  if (!isOpen || !activeWallet) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (requiredApprovals < 1) {
      setErrorMsg('Minimal persetujuan kuorum adalah 1.');
      return;
    }

    if (requiredApprovals > eligibleCount) {
      setErrorMsg(
        `Jumlah persetujuan (${requiredApprovals}) tidak boleh melebihi jumlah pengelola/admin yang ada (${eligibleCount}). Tambahkan pengelola terlebih dahulu.`
      );
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/wallets/${activeWallet.id}/policy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requiredApprovals: Number(requiredApprovals),
          thresholdAmount: thresholdAmount.trim() ? Number(thresholdAmount) : null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal memperbarui kebijakan kuorum.');
      }

      await refreshWallets();
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Kebijakan Kuorum M-of-N
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Versi Kebijakan Saat Ini: v{policyVersion}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info eligible count */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Total Pengelola & Admin Aktif:
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {eligibleCount} orang
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Jumlah Persetujuan Kuorum (M) *
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={eligibleCount}
                required
                value={requiredApprovals}
                onChange={(e) => setRequiredApprovals(parseInt(e.target.value, 10) || 1)}
                className="w-24 px-3 py-2 text-sm font-bold text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                dari total <strong className="text-slate-800 dark:text-slate-200">{eligibleCount}</strong> pengelola/admin yang berwenang
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Setiap pengeluaran kas baru harus disetujui minimal oleh {requiredApprovals} pengelola berbeda sebelum dapat dibayarkan.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Ambang Nominal Kuorum (Opsional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                Rp
              </span>
              <input
                type="number"
                placeholder="Semua nominal (tanpa batas bawah)"
                value={thresholdAmount}
                onChange={(e) => setThresholdAmount(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || isLoading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isSaving ? 'Menyimpan...' : 'Simpan Kebijakan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
