import React from 'react';
import { useWallet } from '../../context/WalletContext';
import { X, Check, PlusCircle, KeyRound } from 'lucide-react';

/**
 * Interface properti untuk komponen WalletSwitcherModal.
 * @property isOpen - Menentukan visibilitas modal dialog pemilih dompet kas.
 * @property onClose - Callback handler untuk menutup modal dialog.
 * @property onOpenCreateWallet - Callback untuk memicu pembukaan modal pembuatan dompet kas baru.
 * @property onOpenJoinWallet - Callback opsional untuk memicu modal bergabung ke dompet via kode undangan.
 */
interface WalletSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateWallet: () => void;
  onOpenJoinWallet?: () => void;
}

/**
 * Komponen Modal Pergantian Dompet Kas (WalletSwitcherModal).
 * 
 * Mengimplementasikan paradigma multi-tenancy KasBareng di sisi antarmuka:
 * - Pengguna dapat bergabung atau mengelola lebih dari satu perbendaharaan kas sekaligus
 *   (misal: Kas RT 05, Kas Panitia 17 Agustus, Kas Futsal Komunitas).
 * - Setiap dompet kas bersifat terisolasi secara finansial, memiliki anggota terpisah,
 *   aturan kuorum persetujuan M-of-N mandiri, dan buku kas (ledger) tersendiri.
 * - Komponen ini memungkinkan navigasi instan antar dompet kas, menampilkan status peran pengguna,
 *   serta menyediakan akses cepat untuk membuat kas baru atau bergabung via kode undangan.
 */
export const WalletSwitcherModal: React.FC<WalletSwitcherModalProps> = ({
  isOpen,
  onClose,
  onOpenCreateWallet,
  onOpenJoinWallet,
}) => {
  // Mengambil daftar dompet kas, dompet aktif saat ini, dan fungsi pemilih dari WalletContext
  const { wallets, activeWallet, selectWallet } = useWallet();

  // Render guard: jika status isOpen false, cegah komputasi dan rendering DOM
  if (!isOpen) return null;

  return (
    // Overlay backdrop latar belakang dengan efek blur transparan
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Kontainer modal dialog */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header Modal: Judul, deskripsi isolasi data kas, dan tombol close */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Pilih Dompet Kas Bersama
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Setiap dompet kas bersifat tertutup dan memiliki aturan mandiri.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Daftar Dompet Kas yang Tersedia (Scrollable Container) */}
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {wallets.length === 0 ? (
            // State kosong jika pengguna belum terdaftar di perbendaharaan manapun
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              Belum ada dompet kas. Silakan buat dompet baru atau gabung dengan kode!
            </div>
          ) : (
            // Render kartu untuk setiap dompet kas yang terdaftar
            wallets.map((wallet) => {
              // Cek apakah dompet kas ini sedang aktif di sesi dashboard
              const isSelected = activeWallet?.id === wallet.id;
              return (
                <button
                  key={wallet.id}
                  onClick={() => {
                    selectWallet(wallet.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-500/60 shadow-sm'
                      : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {/* Informasi Ringkasan Dompet Kas */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {wallet.name}
                      </span>
                      {/* Badge penanda hak akses pengguna (ADMIN vs ANGGOTA) */}
                      {wallet.myRole === 'ADMIN' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Admin
                        </span>
                      )}
                    </div>
                    {/* Metrik jumlah anggota & kuorum persetujuan pengeluaran */}
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {wallet.memberCount} Anggota • Kuorum {wallet.requiredApprovals} Suara
                    </p>
                  </div>

                  {/* Indikator Centang Hijau untuk Dompet yang Sedang Dipilih */}
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Tombol Aksi Cepat Bawah: Gabung via Kode atau Buat Dompet Kas Baru */}
        <div className="pt-2 grid grid-cols-2 gap-2">
          {onOpenJoinWallet && (
            <button
              onClick={() => {
                onClose();
                onOpenJoinWallet();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Gabung Kode
            </button>
          )}
          <button
            onClick={() => {
              onClose();
              onOpenCreateWallet();
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-colors col-span-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Buat Baru
          </button>
        </div>
      </div>
    </div>
  );
};
