/**
 * ============================================================================
 * Navbar.tsx - Komponen Navigasi Utama Bagian Atas (Header Bar)
 * ============================================================================
 * Komponen ini merupakan header navigasi aplikasi KASBARENG yang selalu sticky di atas.
 * Elemen-elemen penting:
 * 1. Logo Brand & Identitas PWA Kasbareng.
 * 2. Tombol Pemilih Dompet Aktif (Wallet Switcher Pill) dengan lencana peran (Role Badge).
 * 3. Tombol Cepat Gabung Dompet via Kode Undangan (khusus tampilan desktop).
 * 4. Pengubah Mode Gelap/Terang (Theme Toggle).
 * 5. Dropdown Profil Pengguna (Akses ke Modal Fitur Algoritma, Buat Dompet, dan Logout).
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Wallet as WalletIcon,
  Sun,
  Moon,
  ChevronDown,
  ShieldCheck,
  UserCheck,
  Users,
  LogOut,
  PlusCircle,
  KeyRound,
  Cpu,
} from 'lucide-react';

/**
 * Properti komponen Navbar:
 * Menerima callback fungsi untuk membuka berbagai modal operasional.
 */
interface NavbarProps {
  onOpenCreateWallet: () => void;       // Callback membuka modal buat dompet baru
  onOpenJoinWallet?: () => void;        // Callback membuka modal gabung via kode
  onOpenWalletModal: () => void;        // Callback membuka modal switcher daftar dompet
  onOpenAlgorithmModal?: () => void;   // Callback membuka modal showcase algoritma & aturan sistem
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCreateWallet,
  onOpenJoinWallet,
  onOpenWalletModal,
  onOpenAlgorithmModal,
}) => {
  // ---------------------------------------------------------------------------
  // HOOKS & CONTEXT
  // ---------------------------------------------------------------------------
  const { user, logout } = useAuth();
  const { activeWallet } = useWallet();
  const { theme, toggleTheme } = useTheme();

  // State lokal untuk mengontrol visibilitas dropdown menu profil
  const [profileOpen, setProfileOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // HELPER: Render Lencana Hak Akses / Peran (Role Badge)
  // Menampilkan badge warna-warni sesuai tingkat otoritas pengguna pada dompet aktif
  // ---------------------------------------------------------------------------
  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        // Role ADMIN: Otoritas penuh atas pengaturan kuorum dan dompet kas
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin
          </span>
        );
      case 'PENGELOLA':
        // Role PENGELOLA: Hak persetujuan kuorum transaksi dan pencatatan kas
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <UserCheck className="w-3.5 h-3.5" />
            Pengelola
          </span>
        );
      default:
        // Role WARGA: Anggota biasa (read-only audit, verifikasi kas, bayar iuran)
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <Users className="w-3.5 h-3.5" />
            Anggota
          </span>
        );
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER UI: Header Navbar Sticky
  // ---------------------------------------------------------------------------
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* BAGIAN KIRI: Logo Brand, Nama Aplikasi & Tagline */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-500/20">
            <WalletIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                KASBARENG
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                PWA
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Keuangan Bersama Terbuka & Kuorum M-of-N
            </p>
          </div>
        </div>

        {/* BAGIAN TENGAH: Tombol Pemilih Dompet Aktif (Wallet Switcher) */}
        {user && (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenWalletModal}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-left transition-all"
              title="Ganti Dompet Kas Bersama"
            >
              <div className="max-w-[130px] sm:max-w-[200px] truncate">
                <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  Dompet Aktif
                </span>
                <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {activeWallet ? activeWallet.name : 'Pilih Dompet'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform" />
            </button>

            {/* Lencana Peran Pengguna pada Dompet Aktif */}
            {activeWallet && (
              <div className="hidden sm:flex items-center">
                {getRoleBadge(activeWallet.myRole)}
              </div>
            )}
          </div>
        )}

        {/* BAGIAN KANAN: Aksi Cepat, Toggle Tema, dan Menu Profil Pengguna */}
        <div className="flex items-center gap-2">
          
          {/* Tombol Gabung Kode Cepat (Hanya Desktop) */}
          {user && onOpenJoinWallet && (
            <button
              onClick={onOpenJoinWallet}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Gabung ke Kas Bersama Lain dengan Kode"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Gabung Kode</span>
            </button>
          )}

          {/* Tombol Toggle Tema (Dark Mode / Light Mode) */}
          <button
            onClick={toggleTheme}
            className="hidden md:flex p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Mode saat ini: ${theme}. Klik untuk mengganti.`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-emerald-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>

          {/* Menu Dropdown Profil Pengguna */}
          {user && (
            <div className="relative hidden md:block">
              {/* Trigger Tombol Avatar Profil */}
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1 pl-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden md:block">
                  {user.fullName.split(' ')[0]}
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center shadow-sm">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
              </button>

              {/* Panel Menu Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Header Dropdown: Identitas Nama & Email */}
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>

                  {/* Menu Item: Aksi & Navigasi Cepat */}
                  <div className="py-1">
                    {/* Item Menu: Showcase Fitur Algoritma Kasbareng */}
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        onOpenAlgorithmModal?.();
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Cpu className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Fitur Algoritma</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700/80">
                        Aturan & Audit
                      </span>
                    </button>

                    {/* Item Menu: Gabung Dompet Kas via Kode */}
                    {onOpenJoinWallet && (
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onOpenJoinWallet();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <KeyRound className="w-4 h-4 text-emerald-500" />
                        Gabung Kas Bersama (Kode)
                      </button>
                    )}

                    {/* Item Menu: Buat Dompet Kas Baru */}
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        onOpenCreateWallet();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-500" />
                      Buat Dompet Baru
                    </button>

                    {/* Item Menu: Keluar Sesi Akun (Logout) */}
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <LogOut className="w-4 h-4" />
                      Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

