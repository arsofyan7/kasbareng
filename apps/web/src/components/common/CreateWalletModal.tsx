import React, { useState } from 'react';
import { useWallet } from '../../context/WalletContext';
import { ApiResponse, DuesType } from '../../types';
import { X, ShieldCheck, AlertCircle, KeyRound, Loader2, Sparkles, Dices, Calendar, Layers, HeartHandshake, Banknote } from 'lucide-react';

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateWalletModal: React.FC<CreateWalletModalProps> = ({ isOpen, onClose }) => {
  const { createWallet } = useWallet();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [requiredApprovals, setRequiredApprovals] = useState(2);

  // Dues configuration (Bulanan / Termin / Bebas)
  const [duesType, setDuesType] = useState<DuesType>('MONTHLY');
  const [duesAmountStr, setDuesAmountStr] = useState<string>('50000');
  const [targetInstallmentsCount, setTargetInstallmentsCount] = useState<number>(10);

  // Invite code mode: 'AUTO' vs 'CUSTOM'
  const [codeMode, setCodeMode] = useState<'AUTO' | 'CUSTOM'>('AUTO');
  const [customCode, setCustomCode] = useState('');
  const [checkStatus, setCheckStatus] = useState<{
    loading: boolean;
    available?: boolean;
    message?: string;
  }>({ loading: false });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCustomCodeChange = async (val: string) => {
    const formatted = val.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    setCustomCode(formatted);
    setErrorMsg(null);

    if (formatted.length >= 4) {
      setCheckStatus({ loading: true });
      try {
        const res = await fetch(`/api/v1/wallets/check-code/${formatted}`);
        const json: ApiResponse<{ available: boolean; message: string }> = await res.json();
        if (res.ok && json.data) {
          setCheckStatus({
            loading: false,
            available: json.data.available,
            message: json.data.message,
          });
        } else {
          setCheckStatus({
            loading: false,
            available: false,
            message: json.error?.message || 'Kode tidak dapat digunakan.',
          });
        }
      } catch (err) {
        setCheckStatus({ loading: false, available: false, message: 'Gagal cek ketersediaan.' });
      }
    } else {
      setCheckStatus({ loading: false });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Nama dompet kas komunitas wajib diisi.');
      return;
    }

    if (codeMode === 'CUSTOM' && (!customCode || customCode.length < 4)) {
      setErrorMsg('Kode kustom minimal 4 karakter alfanumerik.');
      return;
    }

    if (codeMode === 'CUSTOM' && checkStatus.available === false) {
      setErrorMsg(checkStatus.message || 'Kode sudah dipakai oleh dompet lain.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const parsedAmount = duesAmountStr.trim()
        ? parseFloat(duesAmountStr.replace(/[^0-9]/g, ''))
        : undefined;

      await createWallet(
        name.trim(),
        description.trim() || undefined,
        requiredApprovals,
        codeMode === 'CUSTOM' ? customCode.trim() : undefined,
        {
          duesType,
          duesAmount: !isNaN(parsedAmount as number) ? parsedAmount : undefined,
          targetInstallmentsCount: duesType === 'TARGET_INSTALLMENTS' ? targetInstallmentsCount : undefined,
        }
      );
      setName('');
      setDescription('');
      setRequiredApprovals(2);
      setCustomCode('');
      setCodeMode('AUTO');
      setDuesType('MONTHLY');
      setDuesAmountStr('50000');
      setTargetInstallmentsCount(10);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat dompet kas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Buat Dompet Kas Baru
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Anda otomatis menjadi Admin untuk dompet kas ini.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Dompet Kas <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Kas RT 05 RW 02, Kas Masjid Al-Ikhlas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deskripsi / Tujuan Kas (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Untuk pencatatan iuran warga dan kegiatan lingkungan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
            />
          </div>

          {/* Dues Configuration (Tipe Iuran Kas) */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Skema & Tipe Iuran Kas
              </label>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                Papan Iuran
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setDuesType('MONTHLY')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-center font-medium transition-all ${
                  duesType === 'MONTHLY'
                    ? 'border-emerald-500 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-[11px]">Bulanan</span>
                <span className="text-[9px] text-slate-400">12 Bulan / Thn</span>
              </button>

              <button
                type="button"
                onClick={() => setDuesType('TARGET_INSTALLMENTS')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-center font-medium transition-all ${
                  duesType === 'TARGET_INSTALLMENTS'
                    ? 'border-emerald-500 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900'
                }`}
              >
                <Layers className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-[11px]">Target Termin</span>
                <span className="text-[9px] text-slate-400">N-Kali Setor</span>
              </button>

              <button
                type="button"
                onClick={() => setDuesType('FREEFORM')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-center font-medium transition-all ${
                  duesType === 'FREEFORM'
                    ? 'border-emerald-500 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900'
                }`}
              >
                <HeartHandshake className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-[11px]">Sukarela</span>
                <span className="text-[9px] text-slate-400">Tanpa Tagihan</span>
              </button>
            </div>

            {duesType === 'TARGET_INSTALLMENTS' && (
              <div className="pt-1">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah Termin Setoran (Target N-Kali)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={targetInstallmentsCount}
                  onChange={(e) => setTargetInstallmentsCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400">Misal: 10 untuk tabungan qurban 10x setoran.</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  Nominal Iuran per Periode
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Boleh kosong (Opsional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Rp
                </span>
                <input
                  type="text"
                  placeholder="Contoh: 50.000 (Kosongkan jika sukarela / bebas)"
                  value={duesAmountStr}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setDuesAmountStr(raw ? Number(raw).toLocaleString('id-ID') : '');
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Jika diisi, nominal ini menjadi acuan kalkulasi otomatis saat warga membayar atau lapor iuran.
              </p>
            </div>
          </div>

          {/* Private Community Invite Code Section */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Kode Akses Warga (Private Gated)
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCodeMode('AUTO')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-medium transition-all ${
                  codeMode === 'AUTO'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <Dices className="w-3.5 h-3.5" />
                Acak Otomatis
              </button>

              <button
                type="button"
                onClick={() => setCodeMode('CUSTOM')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-medium transition-all ${
                  codeMode === 'CUSTOM'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Kode Kustom
              </button>
            </div>

            {codeMode === 'AUTO' ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Sistem akan membuat kode acak unik (misal: <code className="font-mono text-emerald-600 dark:text-emerald-400">KAS-8X92KP</code>) yang bisa dibagikan ke warga via WhatsApp.
              </p>
            ) : (
              <div className="space-y-1.5 pt-1">
                <div className="relative">
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="Misal: RT05-SEJAHTERA"
                    value={customCode}
                    onChange={(e) => handleCustomCodeChange(e.target.value)}
                    className="w-full px-3 py-2 uppercase font-mono tracking-wider rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 pr-8"
                  />
                  {checkStatus.loading && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                    </div>
                  )}
                </div>
                {checkStatus.available !== undefined && !checkStatus.loading && (
                  <span
                    className={`block text-[11px] font-semibold ${
                      checkStatus.available ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  >
                    {checkStatus.message}
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Syarat Kuorum Persetujuan (M-of-N)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => setRequiredApprovals(num)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    requiredApprovals === num
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {num} Persetujuan
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Transaksi pengeluaran baru akan cair setelah disetujui oleh minimal {requiredApprovals} pengurus yang sah.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (codeMode === 'CUSTOM' && checkStatus.available === false)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Menyimpan...' : 'Buat Dompet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
