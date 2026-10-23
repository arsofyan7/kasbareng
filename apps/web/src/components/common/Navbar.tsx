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

interface NavbarProps {
  onOpenCreateWallet: () => void;
  onOpenJoinWallet?: () => void;
  onOpenWalletModal: () => void;
  onOpenAlgorithmModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCreateWallet,
  onOpenJoinWallet,
  onOpenWalletModal,
  onOpenAlgorithmModal,
}) => {
  const { user, logout } = useAuth();
  const { activeWallet } = useWallet();
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);

  const getRoleBadge = (role?: string) => {
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
            Warga
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Title */}
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
              Keuangan Komunitas Terbuka & M-of-N Quorum
            </p>
          </div>
        </div>

        {/* Center: Active Wallet Switcher Pill */}
        {user && (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenWalletModal}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-left transition-all"
              title="Ganti Dompet Komunitas"
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

            {activeWallet && (
              <div className="hidden sm:flex items-center">
                {getRoleBadge(activeWallet.myRole)}
              </div>
            )}
          </div>
        )}

        {/* Right: Actions (Theme Toggle, Join/Create, & Profile) */}
        <div className="flex items-center gap-2">
          {/* Quick Join Button for Desktop */}
          {user && onOpenJoinWallet && (
            <button
              onClick={onOpenJoinWallet}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Gabung ke Komunitas Lain dengan Kode"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Gabung Kode</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Mode saat ini: ${theme}. Klik untuk mengganti.`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-emerald-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>

          {/* User Profile / Menu */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1 pl-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden md:block">
                  {user.fullName.split(' ')[0]}
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center shadow-sm">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
              </button>

              {/* Profile Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>

                  <div className="py-1">
                    {/* Fitur Algoritma Menu Item */}
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
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                        Aturan & Audit
                      </span>
                    </button>

                    {onOpenJoinWallet && (
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onOpenJoinWallet();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <KeyRound className="w-4 h-4 text-emerald-500" />
                        Gabung Komunitas (Kode)
                      </button>
                    )}
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
