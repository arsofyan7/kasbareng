/**
 * ============================================================================
 * ProfilePage.tsx - Halaman Profil Pengguna, Preferensi Tema, & Integritas Sistem
 * ============================================================================
 * Komponen halaman untuk mengelola identitas pengguna dan personalisasi aplikasi:
 * 1. Menampilkan rincian profil pengguna aktif (nama lengkap, alamat email, status verifikasi).
 * 2. Pengatur Tema Antarmuka (Theme Customizer): Mendukung Mode Terang (Light),
 *    Mode Gelap (Dark), dan Sinkronisasi Otomatis Sistem Operasi Perangkat (System).
 * 3. Pintasan Edukasi Tata Kelola: Memicu pembukaan modal penjelasan 6 algoritma inti
 *    dan simulasi kuorum persetujuan M-of-N.
 * 4. Kartu Transparansi Integritas Sistem: Menampilkan 6 algoritma kriptografis dan deterministik
 *    yang menjaga kas bersama dari manipulasi (RFC 8785, SHA-256 Hash Chain, FSM, Quorum, Ledger, CSV Matcher).
 * 5. Fitur Keluar Akun (Logout): Menghapus token otentikasi JWT dari penyimpanan lokal dan reset sesi.
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme, Theme } from '../context/ThemeContext';
import {
  UserCircle,
  Sun,
  Moon,
  Laptop,
  LogOut,
  CheckCircle2,
  Code2,
  Cpu,
} from 'lucide-react';

/**
 * Interface properti komponen ProfilePage
 */
interface ProfilePageProps {
  onOpenAlgorithmModal?: () => void; // Callback opsional untuk membuka modal aturan algoritma & kuorum
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onOpenAlgorithmModal }) => {
  // ---------------------------------------------------------------------------
  // HOOKS & CONTEXT
  // ---------------------------------------------------------------------------
  // Mengambil data pengguna login dan fungsi logout dari AuthContext
  const { user, logout } = useAuth();

  // Mengambil state tema aktif dan fungsi pengubah tema dari ThemeContext
  const { theme, setTheme } = useTheme();

  // ---------------------------------------------------------------------------
  // KONFIGURASI PILIHAN TEMA ANTARMUKA
  // ---------------------------------------------------------------------------
  const themeOptions: Array<{ id: Theme; label: string; desc: string; icon: any }> = [
    {
      id: 'light',
      label: 'Mode Terang (Light)',
      desc: 'Tampilan bersih dengan palet emerald cerah dan kontras tinggi untuk siang hari.',
      icon: Sun,
    },
    {
      id: 'dark',
      label: 'Mode Gelap (Dark)',
      desc: 'Tampilan elegan, nyaman di mata saat kondisi minim cahaya dengan latar slate 950.',
      icon: Moon,
    },
    {
      id: 'system',
      label: 'Ikuti Sistem Perangkat',
      desc: 'Menyesuaikan otomatis dengan preferensi tema sistem operasi Anda.',
      icon: Laptop,
    },
  ];

  // ---------------------------------------------------------------------------
  // RENDER UI UTAMA
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-150">
      {/* 1. Header Halaman */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <UserCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          Profil & Pengaturan Tampilan
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Sesuaikan preferensi tampilan dan lihat rincian akun Anda.
        </p>
      </div>

      {/* 2. Kartu Rincian Akun Pengguna */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          {/* Avatar Inisial Nama Huruf Kapital */}
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white font-bold text-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
            {user?.fullName.charAt(0).toUpperCase()}
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {user?.fullName}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {user?.email}
            </p>
            {/* Penanda Status Akun Terverifikasi */}
            <span className="inline-flex items-center gap-1.5 mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Akun Aktif & Terverifikasi
            </span>
          </div>
        </div>
      </div>

      {/* 3. Kartu Pemilih Tema Antarmuka (Theme Switcher) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Tema Tampilan Antarmuka
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pilih tema yang paling nyaman digunakan di HP, tablet, maupun laptop Anda.
          </p>
        </div>

        {/* Grid Opsi Tema (Light / Dark / System) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;

            return (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-3 cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                    : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-sm mb-1">{opt.label}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    {opt.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Kartu Fitur Algoritma & Tata Kelola Kas Bersama */}
      {onOpenAlgorithmModal && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50/70 to-slate-50 dark:from-indigo-950/30 dark:to-slate-900 border border-indigo-300 dark:border-indigo-700/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Fitur Algoritma & Tata Kelola
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Periksa kuorum persetujuan M-of-N kas bersama & inspeksi rantai hash SHA-256
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAlgorithmModal}
            className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Cpu className="w-4 h-4" />
            <span>Buka Rincian Algoritma & Kuorum</span>
          </button>
        </div>
      )}

      {/* 5. Kartu Integritas Kriptografis & Rigor Akademis (6 Algoritma Inti) */}
      <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 space-y-3">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <Code2 className="w-4 h-4" />
          6 Algoritma Inti Terverifikasi (Vitest 100%)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
          <div>• RFC 8785 Canonical JSON</div>
          <div>• SHA-256 Tamper-Evident Hash Chain</div>
          <div>• FSM State Transition Validator</div>
          <div>• M-of-N Quorum (Anti-Self Approval)</div>
          <div>• Exact Ledger Calculator (No Float)</div>
          <div>• Deterministic CSV Bank Matcher</div>
        </div>
      </div>

      {/* 6. Tombol Aksi Keluar Akun (Logout) */}
      <div className="pt-2">
        <button
          onClick={logout}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Keluar dari Akun
        </button>
      </div>
    </div>
  );
};
