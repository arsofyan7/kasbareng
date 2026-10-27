import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Camera,
  Image as ImageIcon,
  Trash2,
  Calendar,
  Check,
  Users,
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

  const isWarga = activeWallet?.myRole === 'WARGA';

  const [type, setType] = useState<TransactionType>(isWarga ? 'INCOME' : initialType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFilename, setImageFilename] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Multi-period dues payment state
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  // Target member state (for Admin/Pengelola recording cash on behalf of a warga)
  const [members, setMembers] = useState<Array<{ userId: string; fullName: string; role: string }>>([]);
  const [targetUserId, setTargetUserId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentYear = new Date().getFullYear();
  const duesType = activeWallet?.duesType || 'MONTHLY';
  const duesAmount = activeWallet?.duesAmount ? Number(activeWallet.duesAmount) : null;

  useEffect(() => {
    if (!isOpen || !activeWallet || !token) return;
    if (!isWarga) {
      fetch(`/api/v1/wallets/${activeWallet.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((json) => {
          if (json.data && Array.isArray(json.data)) {
            setMembers(
              json.data.map((m: any) => ({
                userId: m.userId,
                fullName: m.fullName || m.user?.fullName || m.email,
                role: m.role,
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [isOpen, activeWallet, token, isWarga]);

  const availablePeriods = useMemo(() => {
    if (duesType === 'FREEFORM' || !activeWallet) return [];
    if (duesType === 'TARGET_INSTALLMENTS') {
      const count = activeWallet.targetInstallmentsCount || 10;
      return Array.from({ length: count }, (_, i) => ({
        key: `TERMIN-${i + 1}`,
        label: `Setoran ke-${i + 1}`,
        shortLabel: `T${i + 1}`,
      }));
    }
    // Default: MONTHLY
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return months.map((m, i) => {
      const pad = String(i + 1).padStart(2, '0');
      return {
        key: `${currentYear}-${pad}`,
        label: `${m} ${currentYear}`,
        shortLabel: m,
      };
    });
  }, [duesType, activeWallet, currentYear]);

  const togglePeriod = (pKey: string) => {
    const next = selectedPeriods.includes(pKey)
      ? selectedPeriods.filter((k) => k !== pKey)
      : [...selectedPeriods, pKey];
    setSelectedPeriods(next);

    if (duesAmount && next.length > 0) {
      setAmountStr((next.length * duesAmount).toLocaleString('id-ID'));
      if (!category) setCategory('Iuran Warga Bulanan');
    }
  };

  if (!isOpen || !activeWallet) return null;

  const numericAmount = parseFloat(amountStr.replace(/[^0-9]/g, '')) || 0;

  const quickCategories = type === 'INCOME'
    ? ['Iuran Warga Bulanan', 'Sumbangan Sukarela', 'Uang Sampah', 'Dana Donasi Lingkungan']
    : ['Kebersihan Lingkungan', 'Keamanan / Ronda', 'Konsumsi Musyawarah', 'Listrik & Air Pos', 'Perbaikan Sarana'];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Berkas yang dipilih harus berupa gambar (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran gambar maksimal adalah 5MB.');
      return;
    }

    setImageFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImageFilename(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
      let uploadedAttachmentId: string | undefined = undefined;

      // Step 1: Upload image attachment if provided
      if (selectedImage && imageFilename) {
        const attachRes = await fetch(`/api/v1/wallets/${activeWallet.id}/attachments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filename: imageFilename,
            base64Data: selectedImage,
          }),
        });

        const attachJson = await attachRes.json();
        if (attachRes.ok && attachJson.data?.id) {
          uploadedAttachmentId = attachJson.data.id;
        }
      }

      // Step 2: Create draft
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
          receiptAttachmentId: uploadedAttachmentId,
          periodKeys: selectedPeriods.length > 0 ? selectedPeriods : undefined,
          targetUserId: targetUserId || undefined,
        }),
      });

      const draftJson: ApiResponse<Transaction> = await draftRes.json();
      if (!draftRes.ok || !draftJson.data) {
        throw new Error(draftJson.error?.message || 'Gagal menyimpan draf transaksi.');
      }

      // Step 3: If directSubmit requested (or if user is WARGA), submit immediately
      if (directSubmit || isWarga) {
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
          throw new Error(submitJson.error?.message || 'Laporan tersimpan tetapi gagal diajukan.');
        }
      }

      // Reset and close
      setAmountStr('');
      setCategory('');
      setNotes('');
      setSelectedPeriods([]);
      setTargetUserId('');
      handleRemoveImage();
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto cursor-default"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {isWarga ? (
                <>
                  <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Lapor Pembayaran Kas / Setor Iuran
                </>
              ) : type === 'INCOME' ? (
                'Catat Pemasukan Kas'
              ) : (
                'Ajukan Pengeluaran Kas'
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isWarga
                ? 'Laporan Anda akan diverifikasi oleh Bendahara/Admin sebelum dibukukan resmi.'
                : <>Dompet: <strong className="text-emerald-600 dark:text-emerald-400">{activeWallet.name}</strong></>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Toggle (Hidden for WARGA, locked to INCOME) */}
        {!isWarga ? (
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
        ) : (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold">Jenis: Setoran Iuran / Pemasukan Warga</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-200/60 dark:bg-emerald-900/60 text-[10px] font-bold">
              Akun Warga
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Periode Iuran Multi-Bulan / Checklist (Only for INCOME and when duesType !== FREEFORM) */}
          {type === 'INCOME' && duesType !== 'FREEFORM' && availablePeriods.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Pilih Periode Iuran (Bisa Borongan / Sekaligus)
                </label>
                {duesAmount && (
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    Rp {duesAmount.toLocaleString('id-ID')} / periode
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {availablePeriods.map((p) => {
                  const isSelected = selectedPeriods.includes(p.key);
                  return (
                    <button
                      type="button"
                      key={p.key}
                      onClick={() => togglePeriod(p.key)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1 transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      {p.shortLabel}
                    </button>
                  );
                })}
              </div>

              {selectedPeriods.length > 0 ? (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                  Terpilih: <strong>{selectedPeriods.length} periode</strong>
                  {duesAmount && ` (Otomatis kalkulasi: Rp ${(selectedPeriods.length * duesAmount).toLocaleString('id-ID')})`}
                </p>
              ) : (
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Klik untuk mencentang bulan/termin yang dibayar agar status di Papan Iuran otomatis tercatat.
                </p>
              )}
            </div>
          )}

          {/* Member Selector (Only for Admin/Pengelola recording INCOME cash on behalf of a resident) */}
          {!isWarga && type === 'INCOME' && members.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                Setoran Atas Nama Anggota / Warga (Opsional)
              </label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">Saya sendiri ({activeWallet.myRole})</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.fullName} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          )}

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
              {isWarga ? 'Catatan / Keterangan Pembayaran' : 'Catatan / Rincian Keperluan'}
            </label>
            <textarea
              rows={2}
              placeholder={
                isWarga
                  ? 'Contoh: Iuran Kas Bulan Oktober 2026 - Rumah Blok B No. 12 (Arief)'
                  : 'Contoh: Pembelian 3 kaleng cat untuk renovasi pos ronda...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Foto Bukti Transfer / Kamera */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Foto Bukti Transfer / Struk <span className="text-slate-400 font-normal">(Disarankan)</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
            />

            {selectedImage ? (
              <div className="p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={selectedImage}
                    alt="Pratinjau Bukti"
                    className="w-14 h-14 rounded-xl object-cover border border-emerald-300 dark:border-emerald-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {imageFilename}
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <ImageIcon className="w-3 h-3" /> Foto siap dilampirkan
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                  title="Hapus gambar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center gap-1.5 text-center group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60 text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 flex items-center justify-center transition-colors">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ambil Foto Kamera atau Pilih Berkas
                </div>
                <div className="text-[10px] text-slate-400">
                  Format JPG, PNG, atau WebP (Maks. 5MB)
                </div>
              </button>
            )}
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

          {!isWarga && (
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <FileCheck className="w-3.5 h-3.5" />
              Simpan Draf
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 ${
              isWarga || type === 'INCOME'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            {isSubmitting
              ? 'Memproses...'
              : isWarga
              ? 'Kirim Laporan Pembayaran'
              : type === 'INCOME'
              ? 'Catat & Bukukan'
              : 'Ajukan Persetujuan'}
          </button>
        </div>
      </div>
    </div>
  );
};