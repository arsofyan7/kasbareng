import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { Transaction, TransactionType, TransactionState, ApiResponse } from '../types';
import { TransactionDetailModal } from '../components/common/TransactionDetailModal';
import { RecordTransactionModal } from '../components/common/RecordTransactionModal';
import {
  ArrowLeftRight,
  Search,
  Plus,
  Clock,
  Filter,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';

interface TransactionsPageProps {
  onOpenRecordModal?: (type: TransactionType) => void;
  refreshTrigger?: number;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  onOpenRecordModal,
  refreshTrigger,
}) => {
  const { token } = useAuth();
  const { activeWallet } = useWallet();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'RESERVATION'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Modals
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [localRecordModalOpen, setLocalRecordModalOpen] = useState<boolean>(false);
  const [localRecordType, setLocalRecordType] = useState<TransactionType>('INCOME');

  const fetchTransactions = useCallback(async () => {
    if (!token || !activeWallet) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/wallets/${activeWallet.id}/transactions?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json: ApiResponse<Transaction[]> = await res.json();
      if (res.ok && json.data) {
        setTransactions(json.data);
      } else {
        setErrorMsg(json.error?.message || 'Gagal memuat transaksi.');
      }
    } catch (err: any) {
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  }, [token, activeWallet]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, refreshTrigger]);

  // Derived filter options
  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.category) set.add(tx.category);
    });
    return Array.from(set);
  }, [transactions]);

  const months = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      const key = tx.createdAt.slice(0, 7); // YYYY-MM
      set.add(key);
    });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // Count badges
  const counts = useMemo(() => {
    const all = transactions.length;
    const income = transactions.filter((tx) => tx.type === 'INCOME').length;
    const expense = transactions.filter((tx) => tx.type === 'EXPENSE').length;
    const reservation = transactions.filter(
      (tx) => tx.state === 'PENDING_APPROVAL' || tx.state === 'APPROVED' || tx.state === 'SUBMITTED'
    ).length;
    return { all, income, expense, reservation };
  }, [transactions]);

  // Filtered list
  const filteredList = useMemo(() => {
    return transactions.filter((tx) => {
      // Type / Reservation filter
      if (typeFilter === 'INCOME' && tx.type !== 'INCOME') return false;
      if (typeFilter === 'EXPENSE' && tx.type !== 'EXPENSE') return false;
      if (
        typeFilter === 'RESERVATION' &&
        tx.state !== 'PENDING_APPROVAL' &&
        tx.state !== 'APPROVED' &&
        tx.state !== 'SUBMITTED'
      ) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) return false;

      // Status filter
      if (statusFilter !== 'ALL' && tx.state !== statusFilter) return false;

      // Month filter
      if (selectedMonth !== 'ALL' && !tx.createdAt.startsWith(selectedMonth)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCategory = tx.category.toLowerCase().includes(q);
        const matchNotes = (tx.notes || '').toLowerCase().includes(q);
        const matchCreator = (tx.creator?.fullName || '').toLowerCase().includes(q);
        const matchAmount = String(tx.amount).includes(q);
        if (!matchCategory && !matchNotes && !matchCreator && !matchAmount) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, typeFilter, categoryFilter, statusFilter, selectedMonth, searchQuery]);

  // Paginated list
  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const handleOpenRecord = (type: TransactionType) => {
    if (onOpenRecordModal) {
      onOpenRecordModal(type);
    } else {
      setLocalRecordType(type);
      setLocalRecordModalOpen(true);
    }
  };

  const getStatusBadge = (state: TransactionState, type?: TransactionType) => {
    switch (state) {
      case 'DRAFT':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Draf
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {type === 'INCOME' ? 'Verifikasi' : 'Menunggu'}
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Menunggu
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/20">
            Reservasi
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            ✓ Selesai
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
            Dibatalkan
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            Ditolak
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {state}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <ArrowLeftRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Transaksi Kas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Semua transaksi kas bersama yang divalidasi oleh Finite State Machine (FSM).
          </p>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={() => handleOpenRecord('INCOME')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Transaksi Baru</span>
        </button>
      </div>

      {/* Filter Tabs (Semua, Pemasukan, Pengeluaran, Reservasi) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl max-w-xl">
        <button
          onClick={() => {
            setTypeFilter('ALL');
            setCurrentPage(1);
          }}
          className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            typeFilter === 'ALL'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Semua ({counts.all})</span>
        </button>
        <button
          onClick={() => {
            setTypeFilter('INCOME');
            setCurrentPage(1);
          }}
          className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            typeFilter === 'INCOME'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Pemasukan ({counts.income})</span>
        </button>
        <button
          onClick={() => {
            setTypeFilter('EXPENSE');
            setCurrentPage(1);
          }}
          className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            typeFilter === 'EXPENSE'
              ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Pengeluaran ({counts.expense})</span>
        </button>
        <button
          onClick={() => {
            setTypeFilter('RESERVATION');
            setCurrentPage(1);
          }}
          className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            typeFilter === 'RESERVATION'
              ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Reservasi ({counts.reservation})</span>
        </button>
      </div>

      {/* Filter Bar Controls (Month, Category, Status, Search) */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Month Selector */}
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold py-2.5 pl-3.5 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-xs"
          >
            <option value="ALL">Semua Periode</option>
            {months.map((m) => {
              const [y, mon] = m.split('-');
              const d = new Date(parseInt(y), parseInt(mon) - 1, 1);
              return (
                <option key={m} value={m}>
                  {d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </option>
              );
            })}
          </select>
          <Calendar className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Category Selector */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold py-2.5 pl-3.5 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-xs"
          >
            <option value="ALL">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Filter className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Status Selector */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold py-2.5 pl-3.5 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-xs"
          >
            <option value="ALL">Semua Status</option>
            <option value="COMPLETED">Selesai</option>
            <option value="PENDING_APPROVAL">Menunggu Kuorum</option>
            <option value="SUBMITTED">Menunggu Verifikasi</option>
            <option value="APPROVED">Disetujui</option>
            <option value="REJECTED">Ditolak</option>
            <option value="CANCELLED">Dibatalkan</option>
          </select>
          <Filter className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari transaksi..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 text-xs py-2.5 pl-9 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400 shadow-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 shadow-xs">
          {errorMsg}
        </div>
      )}

      {/* Table & Feed Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Memuat daftar transaksi kas...
          </div>
        ) : paginatedList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Tidak ada transaksi ditemukan pada filter ini.
            </p>
            <p className="text-xs text-slate-400">
              Coba sesuaikan kata kunci pencarian atau ubah filter periode/kategori.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Deskripsi & Pelapor</th>
                    <th className="px-6 py-4">Kategori</th>
                    <th className="px-6 py-4">Jumlah</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginatedList.map((tx) => {
                    const isIncome = tx.type === 'INCOME';
                    return (
                      <tr
                        key={tx.id}
                        onClick={() => setSelectedTx(tx)}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        {/* Tanggal */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                          {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Deskripsi & Pelapor */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isIncome ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            {tx.notes || tx.category}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Oleh {tx.creator?.fullName || 'Anggota'} • Ref #{tx.id.substring(0, 8)}
                          </div>
                        </td>

                        {/* Kategori */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {tx.category}
                          </span>
                        </td>

                        {/* Jumlah */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div
                            className={`font-extrabold text-sm ${
                              isIncome
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {isIncome ? '+ ' : '- '}
                            Rp {tx.amount.toLocaleString('id-ID')}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(tx.state, tx.type)}
                        </td>

                        {/* Aksi */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTx(tx);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1 group-hover:border-emerald-500 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500" />
                            <span>Rincian</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
              {paginatedList.map((tx) => {
                const isIncome = tx.type === 'INCOME';
                return (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>
                        {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="font-mono text-[11px]">#{tx.id.substring(0, 8)}</span>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {tx.notes || tx.category}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {tx.category} • Oleh {tx.creator?.fullName || 'Anggota'}
                        </div>
                      </div>

                      <div
                        className={`font-black text-sm shrink-0 text-right ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {isIncome ? '+ ' : '- '}
                        Rp {tx.amount.toLocaleString('id-ID')}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>{getStatusBadge(tx.state, tx.type)}</div>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                        Lihat detail <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination Footer */}
        {filteredList.length > pageSize && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Menampilkan {(currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, filteredList.length)} dari {filteredList.length} transaksi
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <TransactionDetailModal
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
          onSuccess={fetchTransactions}
        />
      )}

      {/* Record Transaction Modal */}
      {localRecordModalOpen && (
        <RecordTransactionModal
          isOpen={localRecordModalOpen}
          initialType={localRecordType}
          availableBalance={0}
          onClose={() => setLocalRecordModalOpen(false)}
          onSuccess={fetchTransactions}
        />
      )}
    </div>
  );
};
