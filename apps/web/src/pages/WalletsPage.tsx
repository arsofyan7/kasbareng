import React from 'react';
import { useWallet } from '../context/WalletContext';
import {
  WalletCards,
  PlusCircle,
  ShieldCheck,
  UserCheck,
  Users,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface WalletsPageProps {
  onOpenCreateWallet: () => void;
  onNavigateHome: () => void;
}

export const WalletsPage: React.FC<WalletsPageProps> = ({
  onOpenCreateWallet,
  onNavigateHome,
}) => {
  const { wallets, activeWallet, selectWallet } = useWallet();

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
            Warga
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <WalletCards className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Kantong Kas Komunitas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Daftar seluruh dompet kas yang Anda ikuti atau kelola dengan hak akses per-dompet.
          </p>
        </div>

        <button
          onClick={onOpenCreateWallet}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          + Buat Dompet Baru
        </button>
      </div>

      {/* Grid of Wallets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {wallets.map((wallet) => {
          const isActive = activeWallet?.id === wallet.id;
          return (
            <div
              key={wallet.id}
              className={`p-6 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                isActive
                  ? 'border-emerald-500/80 bg-white dark:bg-slate-900 shadow-lg shadow-emerald-500/5 ring-2 ring-emerald-500/20'
                  : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                    {wallet.name}
                  </h3>
                  {getRoleBadge(wallet.myRole)}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {wallet.description || 'Tidak ada deskripsi tambahan.'}
                </p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
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
              </div>

              {/* Action Button */}
              <div>
                {isActive ? (
                  <button
                    onClick={onNavigateHome}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-colors"
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
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
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
    </div>
  );
};