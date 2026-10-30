import React, { useState, useEffect } from 'react';
import { useWallet } from '../../context/WalletContext';
import { ApiResponse } from '../../types';
import {
  X,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  Share2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';

/**
 * Interface properti untuk komponen ManageInviteCodeModal.
 * @property isOpen - Flag penentu visibilitas modal dialog.
 * @property onClose - Callback handler untuk menutup modal.
 */
interface ManageInviteCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Komponen Modal Manajemen Kode Undangan (ManageInviteCodeModal).
 * 
 * Komponen krusial bagi Admin/Bendahara untuk mengelola pintu masuk (onboarding) warga ke kas:
 * 1. Tampilan Kode Aktif & Direct Share: Menampilkan kode kas aktif beserta link tautan langsung,
 *    serta integrasi tombol bagikan pesan undangan ke WhatsApp grup warga.
 * 2. Kode Kustom: Memberi keleluasaan Admin membuat kode mudah diingat (misal: "RT05-WARGA")
 *    lengkap dengan pemeriksaan ketersediaan kode secara real-time ke API backend.
 * 3. Rotasi/Acak Ulang Kode: Fitur keamanan untuk mereset dan menganulir kode lama jika bocor
 *    ke pihak yang tidak berhak tanpa mengganggu status anggota yang sudah terdaftar.
 */
export const ManageInviteCodeModal: React.FC<ManageInviteCodeModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Akses data dompet kas aktif dan fungsi mutasi kode dari WalletContext
  const { activeWallet, updateInviteCode } = useWallet();

  // State mode tampilan: 'VIEW' (lihat & bagikan), 'CUSTOM' (buat kustom), 'RANDOM' (konfirmasi acak)
  const [mode, setMode] = useState<'VIEW' | 'CUSTOM' | 'RANDOM'>('VIEW');
  // State penyimpanan input kode kustom yang dimasukkan pengguna
  const [customCode, setCustomCode] = useState('');
  // State status pemeriksaan ketersediaan kode kustom dari backend API
  const [checkStatus, setCheckStatus] = useState<{
    loading: boolean;
    available?: boolean;
    message?: string;
  }>({ loading: false });

  // State indikator proses mutasi penyimpanan kode ke server
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State visual feedback saat teks kode berhasil disalin ke clipboard
  const [copiedCode, setCopiedCode] = useState(false);
  // State visual feedback saat tautan URL berhasil disalin ke clipboard
  const [copiedLink, setCopiedLink] = useState(false);
  // State pesan kesalahan (error message)
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // State pesan keberhasilan (success message)
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /**
   * Reset seluruh form state dan visual status setiap kali modal dibuka kembali oleh pengguna.
   */
  useEffect(() => {
    if (isOpen) {
      setMode('VIEW');
      setCustomCode('');
      setErrorMsg(null);
      setSuccessMsg(null);
      setCopiedCode(false);
      setCopiedLink(false);
    }
  }, [isOpen]);

  // Jika modal ditutup atau belum ada dompet kas yang aktif, cegah rendering (render guard)
  if (!isOpen || !activeWallet) return null;

  // Kode undangan aktif dari dompet kas saat ini
  const currentCode = activeWallet.inviteCode || 'BELUM_ADA';
  // URL rujukan otomatis yang menyematkan parameter query ?join=[kode]
  const shareLink = `${window.location.origin}/?join=${currentCode}`;

  /**
   * Menyalin teks kode undangan mentah ke papan klip (clipboard) perangkat pengguna.
   */
  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopiedCode(true);
    // Kembalikan status icon tersalin setelah 2 detik
    setTimeout(() => setCopiedCode(false), 2000);
  };

  /**
   * Menyalin tautan langsung (deep-link onboarding) ke papan klip (clipboard).
   */
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    // Kembalikan status icon tersalin setelah 2 detik
    setTimeout(() => setCopiedLink(false), 2000);
  };

  /**
   * Membuka WhatsApp Web / Aplikasi WhatsApp dengan teks pesan undangan resmi yang siap dibagikan ke grup warga.
   */
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Halo warga! Mari bergabung ke pencatatan kas transparan "${activeWallet.name}" di KasBareng.\n\n` +
      `Gunakan Kode Undangan: *${currentCode}*\n` +
      `Atau klik langsung tautan ini untuk bergabung:\n${shareLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  /**
   * Menangani perubahan input kode kustom, membersihkan format ke huruf kapital tanpa karakter aneh,
   * serta memicu pengecekan keunikan kode secara real-time jika panjang karakter mencukupi (>= 4).
   */
  const handleCustomCodeChange = async (val: string) => {
    // Sanitasi: jadikan huruf kapital dan izinkan hanya alfanumerik serta karakter strip/garis bawah
    const formatted = val.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    setCustomCode(formatted);
    setErrorMsg(null);

    // Lakukan pemeriksaan ke API backend jika panjang karakter memenuhi syarat minimal
    if (formatted.length >= 4) {
      setCheckStatus({ loading: true });
      try {
        const res = await fetch(
          `/api/v1/wallets/check-code/${formatted}?excludeWalletId=${activeWallet.id}`
        );
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

  /**
   * Menangani penyimpanan kode baru ke server (baik kode kustom pilihan Admin maupun acak otomatis).
   */
  const handleSaveNewCode = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'CUSTOM') {
        // Validasi panjang karakter minimum
        if (!customCode || customCode.length < 4) {
          setErrorMsg('Kode kustom minimal 4 karakter.');
          setIsSubmitting(false);
          return;
        }
        // Simpan kode kustom via context
        await updateInviteCode(activeWallet.id, customCode);
        setSuccessMsg(`Kode berhasil diubah menjadi: ${customCode}`);
      } else if (mode === 'RANDOM') {
        // Minta backend membuatkan kode acak acak unik baru
        const res = await updateInviteCode(activeWallet.id, undefined);
        setSuccessMsg(`Kode baru berhasil diacak: ${res.inviteCode}`);
      }
      // Kembali ke tampilan kode utama setelah berhasil
      setMode('VIEW');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah kode undangan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // Overlay backdrop semi-transparan dengan efek blur latar belakang
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Kontainer modal dialog */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header Modal: Ikon Kunci, Judul, dan Tombol Tutup */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Kode Undangan Kas Bersama
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Khusus Admin: Atur akses masuk anggota
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner Notifikasi Kesalahan (Error Alert) */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Banner Notifikasi Keberhasilan (Success Alert) */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Kondisional View: Berdasarkan State Mode ('VIEW' | 'CUSTOM' | 'RANDOM') */}
        {mode === 'VIEW' ? (
          <div className="space-y-4">
            {/* Tampilan Kartu Kode Aktif Saat Ini */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-center space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Kode Aktif Saat Ini
              </span>
              <div className="font-mono text-2xl font-black tracking-widest text-emerald-600 dark:text-emerald-400 selection:bg-emerald-200">
                {currentCode}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Warga yang memasukkan kode ini otomatis menjadi anggota (role WARGA).
              </p>
            </div>

            {/* Tombol Salin Kode dan Salin Tautan (Grid 2 Kolom) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>Salin Kode</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Link Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-slate-400" />
                    <span>Salin Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Tombol Bagikan Langsung ke Grup WhatsApp */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all"
            >
              <Share2 className="w-4 h-4" />
              Bagikan ke WhatsApp Anggota / Grup
            </button>

            {/* Kontrol Navigasi Admin untuk Mengubah Kode (Kustom vs Acak) */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setMode('CUSTOM')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Buat Kode Kustom Sendiri
              </button>
              <button
                type="button"
                onClick={() => setMode('RANDOM')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Acak Ulang Kode
              </button>
            </div>
          </div>
        ) : mode === 'CUSTOM' ? (
          <div className="space-y-4">
            {/* Input Form Pembuatan Kode Kustom Baru */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Masukkan Kode Kustom Baru
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  maxLength={20}
                  placeholder="Contoh: RT05-SEJAHTERA"
                  value={customCode}
                  onChange={(e) => handleCustomCodeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 uppercase font-mono tracking-wider rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all pr-10"
                />
                {/* Indikator Pengecekan Asinkron ke Server */}
                {checkStatus.loading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                  </div>
                )}
              </div>
              {/* Petunjuk Karakter & Status Ketersediaan Kode */}
              <div className="mt-1.5 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">4-20 karakter (A-Z, 0-9, strip)</span>
                {checkStatus.available !== undefined && !checkStatus.loading && (
                  <span
                    className={`font-semibold ${
                      checkStatus.available ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  >
                    {checkStatus.message}
                  </span>
                )}
              </div>
            </div>

            {/* Peringatan Konsekuensi Perubahan Kode */}
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-900 leading-relaxed">
              Catatan: Jika Anda mengubah kode, kode lama tidak akan dapat digunakan lagi untuk bergabung. Anggota yang sudah terdaftar tetap aman.
            </p>

            {/* Aksi Batal dan Simpan Kode Kustom */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMode('VIEW')}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNewCode}
                disabled={isSubmitting || !checkStatus.available}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Kode Kustom</span>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Konfirmasi Acak Ulang Kode Otomatis */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 mx-auto flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Acak Ulang Kode Otomatis?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sistem akan membuat kombinasi acak baru (misal: KAS-9H2K8P). Kode lama akan dinonaktifkan.
              </p>
            </div>

            {/* Aksi Batal dan Konfirmasi Acak Ulang */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMode('VIEW')}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNewCode}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengacak...</span>
                  </>
                ) : (
                  <span>Konfirmasi Acak Ulang</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
