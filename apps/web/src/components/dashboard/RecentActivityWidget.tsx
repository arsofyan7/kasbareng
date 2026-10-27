import React from 'react';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  ListOrdered,
  ChevronRight,
} from 'lucide-react';
import { Transaction, TransactionType, TransactionState } from '../../types';

interface RecentActivityWidgetProps {
  transactions: Transaction[];
  isLoading: boolean;
  isManagerOrAdmin: boolean;
  onSelectTransaction: (tx: Transaction) => void;
  onOpenRecordModal: (type: TransactionType) => void;
  activeFilter: 'ALL' | 'INCOME' | 'EXPENSE';
  onChangeFilter: (filter: 'ALL' | 'INCOME' | 'EXPENSE') => void;
  onNavigateToTransactions?: () => void;
}

export const RecentActivityWidget: React.FC<RecentActivityWidgetProps> = ({
  transactions,
  isLoading,
  isManagerOrAdmin,
  onSelectTransaction,
  onOpenRecordModal,
  activeFilter,
  onChangeFilter,
  onNavigateToTransactions,
}) => {
  const filteredTransactions = transactions.filter((tx) => {
    if (activeFilter === 'INCOME') return tx.type === 'INCOME';
    if (activeFilter === 'EXPENSE') return tx.type === 'EXPENSE';
    return true;
  });

  const displayList = filteredTransactions.slice(0, 5);

  const getStatusBadge = (state: TransactionState, type?: TransactionType) => {
    switch (state) {
      case 'DRAFT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Draf
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {type === 'INCOME' ? 'Verifikasi' : 'Menunggu'}
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            Menunggu
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/20">
            Reservasi
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            ✓ Selesai
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            Ditolak
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {state}
          </span>
        );
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ListOrdered className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              Aktivitas Terbaru
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isManagerOrAdmin ? 'Mutasi kas komunitas terkini' : 'Pencatatan kas Anda'}
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => onChangeFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              activeFilter === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => onChangeFilter('INCOME')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              activeFilter === 'INCOME'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Masuk
          </button>
          <button
            onClick={() => onChangeFilter('EXPENSE')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              activeFilter === 'EXPENSE'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Keluar
          </button>
        </div>
      </div>

      {/* Transaction Items */}
      {isLoading ? (
        <div className="py-8 text-center text-slate-400 text-xs">Memuat aktivitas kas...</div>
      ) : displayList.length === 0 ? (
        <div className="py-8 text-center space-y-3">
          <p className="text-xs text-slate-400">Belum ada transaksi pada filter ini.</p>
          <button
            onClick={() => onOpenRecordModal('INCOME')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Lapor Pembayaran
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 -my-1">
          {displayList.map((tx) => {
            const isIncome = tx.type === 'INCOME';
            return (
              <div
                key={tx.id}
                onClick={() => onSelectTransaction(tx)}
                className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 px-2 -mx-2 rounded-2xl cursor-pointer transition-colors group"
              >
                {/* Left: Icon & Meta */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isIncome
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isIncome ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                      {tx.category}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                      <span className="truncate">{tx.creator?.fullName?.split(' ')[0] || 'Warga'}</span>
                      <span>•</span>
                      <span>
                        {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Badges & Amount */}
                <div className="text-right space-y-0.5 shrink-0">
                  <div
                    className={`font-bold text-xs sm:text-sm ${
                      isIncome
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {isIncome ? '+ ' : '- '}
                    Rp {tx.amount.toLocaleString('id-ID')}
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Outline Type Badge */}
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                        isIncome
                          ? 'border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                          : 'border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isIncome ? 'Pemasukan' : 'Pengeluaran'}
                    </span>
                    {getStatusBadge(tx.state, tx.type)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">
          Total {filteredTransactions.length} transaksi
        </span>
        {onNavigateToTransactions ? (
          <button
            type="button"
            onClick={onNavigateToTransactions}
            className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-0.5 group hover:underline cursor-pointer"
          >
            Lihat Semua Transaksi
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        ) : (
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-0.5 group">
            Ketuk baris untuk detail
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        )}
      </div>
    </div>
  );
};
