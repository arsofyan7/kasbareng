/**
 * ============================================================================
 * WalletsPage.tsx - Halaman Manajemen Kantong Kas Bersama (Multi-Wallet Switcher)
 * ============================================================================
 * Komponen halaman untuk mengelola dan berpindah antar kantong kas bersama (multi-tenancy):
 * 1. Menampilkan seluruh dompet kas tertutup (private ledger) yang diikuti atau dikelola pengguna.
 * 2. Mengidentifikasi dompet kas yang sedang aktif dengan penanda visual (emerald ring & badge).
 * 3. Menampilkan status peran spesifik pengguna di masing-masing dompet (Admin, Pengelola, Warga).
 * 4. Menyediakan pintasan kode undangan (invite code) bagi pengurus kas untuk dibagikan ke anggota baru.
 * 5. Menampilkan ringkasan tata kelola dompet: jumlah anggota, aturan kuorum persetujuan (M-of-N),
 *    serta konfigurasi skema iuran (sukarela, termin, atau bulanan tetap).
 * 6. Menyediakan akses langsung untuk membuat kantong kas baru atau bergabung via kode undangan.
 */

import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import {
  WalletCards,
  PlusCircle,
  ShieldCheck,
  UserCheck,
  Users,
  CheckCircle2,
  ArrowRight,
  KeyRound,
  Copy,
  Check,
  Calendar,
  Sliders,
} from 'lucide-react';
import { ManageDuesConfigModal } from '../components/common/ManageDuesConfigModal';

/**
 * Interface properti komponen WalletsPage
 */
interface WalletsPageProps {
  onOpenCreateWallet: () => void;  // Callback memicu pembukaan modal pembuatan dompet kas baru
  onOpenJoinWallet?: () => void;   // Callback memicu pembukaan modal bergabung ke dompet via kode undangan
  onNavigateHome: () => void;      // Callback navigasi kembali ke dasbor utama setelah memilih dompet
}

export const WalletsPage: React.FC<WalletsPageProps> = ({
  onOpenCreateWallet,
  onOpenJoinWallet,
  onNavigateHome,
}) => {
  // ---------------------------------------------------------------------------
  // HOOKS & CONTEXT MANAGEMENT
  // ---------------------------------------------------------------------------
  // Mengambil daftar dompet kas, dompet aktif saat ini, dan fungsi pemilih dompet dari WalletContext
  const { wallets, activeWallet, selectWallet } = useWallet();

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  // ID dompet kas yang kode undangannya sedang disalin (untuk feedback ikon centang visual)
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Status pembukaan modal pengaturan skema dan tarif iuran dompet
  const [isDuesModalOpen, setIsDuesModalOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // HANDLERS & HELPER FUNCTIONS
  // ---------------------------------------------------------------------------
  /**
   * Menyalin kode undangan dompet ke clipboard perangkat pengguna
   * @param e - Event mouse untuk menghentikan bubbling ke elemen kartu
   * @param code - String kode undangan privat
   * @param id - UUID dompet kas
   */
  const handleCopyCode = (e: React.MouseEvent, code?: string, id?: string) => {
    e.stopPropagation();
    if (!code || !id) return;
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /**
   * Mengembalikan badge visual peran pengguna pada dompet kas terkait
   * @param role - Peran ('ADMIN' | 'PENGELOLA' | 'WARGA')
   */
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin
          </span>
        );
      case 'PENGELOLA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <UserCheck className="w-3.5 h-3.5" />
            Pengelola
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <Users className="w-3.5 h-3.5" />
            Anggota
          </span>
        );
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER UI UTAMA
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header Halaman & Tombol Aksi Global (Gabung / Buat Dompet) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <WalletCards className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Kantong Kas Bersama
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Daftar seluruh dompet kas tertutup yang Anda ikuti atau kelola.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Tombol Masukkan Kode Undangan */}
          {onOpenJoinWallet && (
            <button
              onClick={onOpenJoinWallet}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm transition-all"
            >
              <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              + Gabung Kode
            </button>
          )}

          {/* Tombol Buat Dompet Kas Baru */}
          <button
            onClick={onOpenCreateWallet}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            + Buat Dompet Baru
          </button>
        </div>
      </div>

      {/* 2. Grid Kartu Daftar Dompet Kas Pengguna */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {wallets.map((wallet) => {
          // Menentukan apakah dompet ini sedang aktif di konteks global saat ini
          const isActive = activeWallet?.id === wallet.id;

          return (
            <div
              key={wallet.id}
              className={`p-6 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                isActive
                  ? 'border-emerald-500/80 bg-white dark:bg-slate-900 shadow-lg shadow-emerald-500/5 ring-2 ring-emerald-500/20'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600 shadow-sm'
              }`}
            >
              <div className="space-y-3">
                {/* Judul Dompet & Badge Peran Anggota */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                    {wallet.name}
                  </h3>
                  {getRoleBadge(wallet.myRole)}
                </div>

                {/* Deskripsi Dompet Kas */}
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {wallet.description || 'Tidak ada deskripsi tambahan.'}
                </p>

                {/* Bilah Kode Undangan (Khusus Peran Pengurus: Admin & Pengelola) */}
                {wallet.inviteCode && (wallet.myRole === 'ADMIN' || wallet.myRole === 'PENGELOLA') && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Kode:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {wallet.inviteCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleCopyCode(e, wallet.inviteCode, wallet.id)}
                      className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1"
                      title="Salin Kode Undangan"
                    >
                      {copiedId === wallet.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Rincian Statistik: Jumlah Anggota & Ambang Batas Kuorum Persetujuan */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Anggota</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {wallet.memberCount} Orang
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Kuorum Persetujuan</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      M = {wallet.requiredApprovals}
                    </span>
                  </div>
                </div>

                {/* Skema & Tarif Iuran Kas */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Iuran:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {wallet.duesType === 'FREEFORM'
                        ? 'Sukarela'
                        : wallet.duesType === 'TARGET_INSTALLMENTS'
                        ? `${wallet.targetInstallmentsCount || 10} Termin`
                        : wallet.duesAmount
                        ? `Rp ${Number(wallet.duesAmount).toLocaleString('id-ID')} / bln`
                        : 'Bulanan'}
                    </span>
                  </div>

                  {/* Tombol Atur Skema Iuran (Hanya untuk Admin / Pengelola) */}
                  {(wallet.myRole === 'ADMIN' || wallet.myRole === 'PENGELOLA') && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectWallet(wallet.id);
                        setIsDuesModalOpen(true);
                      }}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                      title="Atur Skema & Nominal Iuran"
                    >
                      <Sliders className="w-3 h-3" />
                      Atur
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Tombol Aksi: Buka Beranda (Jika Aktif) atau Aktifkan Dompet */}
              <div>
                {isActive ? (
                  <button
                    onClick={onNavigateHome}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Sedang Aktif (Buka Beranda)
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      selectWallet(wallet.id);
                      onNavigateHome();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                  >
                    Pilih Dompet Ini
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Modal Pengaturan Skema & Nominal Iuran Dompet */}
      {isDuesModalOpen && (
        <ManageDuesConfigModal
          isOpen={isDuesModalOpen}
          onClose={() => setIsDuesModalOpen(false)}
        />
      )}
    </div>
  );
};
