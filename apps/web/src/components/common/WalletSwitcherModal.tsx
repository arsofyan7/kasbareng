import React from 'react';
import { useWallet } from '../../context/WalletContext';
import { X, Check, PlusCircle, KeyRound } from 'lucide-react';

interface WalletSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateWallet: () => void;
  onOpenJoinWallet?: () => void;
}

export const WalletSwitcherModal: React.FC<WalletSwitcherModalProps> = ({
  isOpen,
  onClose,
  onOpenCreateWallet,
  onOpenJoinWallet,
}) => {
  const { wallets, activeWallet, selectWallet } = useWallet();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Pilih Dompet Kas Komunitas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Setiap dompet kas bersifat tertutup dan memiliki aturan mandiri.
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
              Belum ada dompet kas. Silakan buat dompet baru atau gabung dengan kode!
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
                      : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
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
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Actions trigger */}
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
