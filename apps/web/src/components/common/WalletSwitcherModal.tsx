import React from 'react';
import { useWallet } from '../../context/WalletContext';
import { X, Check, PlusCircle } from 'lucide-react';

interface WalletSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateWallet: () => void;
}

export const WalletSwitcherModal: React.FC<WalletSwitcherModalProps> = ({
  isOpen,
  onClose,
  onOpenCreateWallet,
}) => {
  const { wallets, activeWallet, selectWallet } = useWallet();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Pilih Dompet Kas Komunitas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Setiap dompet memiliki saldo dan aturan persetujuan independen.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wallets List */}
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {wallets.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              Belum ada dompet kas. Silakan buat dompet baru untuk memulai!
            </div>
          ) : (
            wallets.map((wallet) => {
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
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {wallet.name}
                      </span>
                      {wallet.myRole === 'ADMIN' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {wallet.memberCount} Anggota • Kuorum {wallet.requiredApprovals} Suara
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Create new wallet trigger */}
        <div className="pt-2">
          <button
            onClick={() => {
              onClose();
              onOpenCreateWallet();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-md shadow-emerald-600/20 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Buat Dompet Kas Baru
          </button>
        </div>
      </div>
    </div>
  );
};