/**
 * ============================================================================
 * HALAMAN DASBOR UTAMA KAS BERSAMA (DASHBOARDPAGE.TSX)
 * ============================================================================
 * Komponen ini merupakan pusat kendali informasi keuangan dompet kas komunitas,
 * menyajikan:
 * 1. Kartu Saldo Utama (Posted Balance, Available Balance, Active Reservations).
 * 2. Kendali Privasi Finansial (Toggle sensor angka saldo).
 * 3. Ringkasan Mini Matriks Iuran Warga & Donut Chart Keanggotaan.
 * 4. Grafik Batang Tren Arus Kas 6 Bulan Terakhir.
 * 5. Feed Aktivitas & Mutasi Transaksi Terkini dengan filter instan.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import {
  Wallet,
  PlusCircle,
  KeyRound,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Coins,
} from 'lucide-react';
import {
  Transaction,
  TransactionType,
  WalletSummary,
  DuesBoardResult,
  WalletMember,
  ApiResponse,
} from '../types';
import { RecordTransactionModal } from '../components/common/RecordTransactionModal';
import { TransactionDetailModal } from '../components/common/TransactionDetailModal';
import { NavTab } from '../components/common/Sidebar';
import { MiniDuesWidget } from '../components/dashboard/MiniDuesWidget';
import { MemberDonutWidget } from '../components/dashboard/MemberDonutWidget';
import { CashTrendWidget } from '../components/dashboard/CashTrendWidget';
import { RecentActivityWidget } from '../components/dashboard/RecentActivityWidget';

// ----------------------------------------------------------------------------
// TIPE DATA & PROPS KOMPONEN
// ----------------------------------------------------------------------------
interface DashboardPageProps {
  /** Callback untuk memicu pembukaan modal pembuatan dompet baru */
  onOpenCreateWallet: () => void;
  /** Callback untuk membuka modal bergabung dompet dengan kode undangan */
  onOpenJoinWallet?: () => void;
  /** Callback navigasi tab internal antarmuka */
  onNavigateToTab: (tab: NavTab) => void;
  /** Callback pembuka modal pencatatan transaksi dari parent */
  onOpenRecordModal?: (type: TransactionType) => void;
  /** Nilai pengubah (trigger) untuk memaksa pembaruan data dasbor dari luar */
  refreshTrigger?: number;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenCreateWallet,
  onOpenJoinWallet,
  onNavigateToTab,
  onOpenRecordModal,
  refreshTrigger,
}) => {
  // --------------------------------------------------------------------------
  // STATE & HOOKS: Konteks Global Pengguna & Dompet Kas Aktif
  // --------------------------------------------------------------------------
  const { token, user } = useAuth();
  const { activeWallet, wallets } = useWallet();

  // --------------------------------------------------------------------------
  // STATE: Penyimpanan Data Agregasi Keuangan & Entitas Dompet
  // --------------------------------------------------------------------------
  /** Ringkasan matematis buku besar (saldo tercatat, tersedia, reservasi) */
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  /** Daftar transaksi mutasi kas terkini (hingga 50 baris) */
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  /** Data matriks kepatuhan iuran warga untuk mini widget */
  const [duesBoard, setDuesBoard] = useState<DuesBoardResult | null>(null);
  /** Daftar anggota komunitas aktif untuk diagram komposisi peran */
  const [members, setMembers] = useState<WalletMember[]>([]);
  /** Indikator proses pemuatan asinkron data dasbor */
  const [isLoading, setIsLoading] = useState<boolean>(false);
  /** Filter kategori tampilan transaksi: SEMUA, PEMASUKAN, atau PENGELUARAN */
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

  // --------------------------------------------------------------------------
  // STATE: Kontrol Visibilitas Modal Interaktif
  // --------------------------------------------------------------------------
  const [recordModalOpen, setRecordModalOpen] = useState<boolean>(false);
  const [recordType, setRecordType] = useState<TransactionType>('INCOME');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // --------------------------------------------------------------------------
  // STATE: Privasi Finansial (Sembunyikan / Tampilkan Nominal Rupiah)
  // Menyimpan preferensi pengguna di LocalStorage agar bertahan saat reload
  // --------------------------------------------------------------------------
  const [showBalance, setShowBalance] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kasbareng_show_balance') !== 'false';
    } catch {
      return true;
    }
  });

  // --------------------------------------------------------------------------
  // AKSI USER: Toggle Privasi Saldo Finansial
  // --------------------------------------------------------------------------
  const toggleShowBalance = () => {
    setShowBalance((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('kasbareng_show_balance', String(next));
      } catch {
        // Abaikan jika LocalStorage diblokir browser
      }
      return next;
    });
  };

  // --------------------------------------------------------------------------
  // HELPER FORMAT: Sensor Nominal jika Mode Privasi Aktif
  // --------------------------------------------------------------------------
  const formatAmount = (amount: number) => {
    if (!showBalance) return 'Rp ••••••••';
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  // --------------------------------------------------------------------------
  // QUERY & DATA FETCHING: Pengambilan Paralel Seluruh Metrik Dasbor
  // Memanfaatkan Promise.all untuk memangkas latency jaringan secara optimal
  // --------------------------------------------------------------------------
  const fetchDashboardData = useCallback(async () => {
    if (!token || !activeWallet) return;
    setIsLoading(true);

    try {
      // Menembak 4 endpoint REST API secara bersamaan: summary, transactions, dues, members
      const [sumRes, txRes, duesRes, memRes] = await Promise.all([
        fetch(`/api/v1/wallets/${activeWallet.id}/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/v1/wallets/${activeWallet.id}/transactions?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/v1/wallets/${activeWallet.id}/dues-board`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/v1/wallets/${activeWallet.id}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (sumRes.ok) {
        const sumJson: ApiResponse<WalletSummary> = await sumRes.json();
        if (sumJson.data) setSummary(sumJson.data);
      }

      if (txRes.ok) {
        const txJson: ApiResponse<Transaction[]> = await txRes.json();
        if (txJson.data) setTransactions(txJson.data);
      }

      if (duesRes.ok) {
        const duesJson: ApiResponse<DuesBoardResult> = await duesRes.json();
        if (duesJson.data) setDuesBoard(duesJson.data);
      }

      if (memRes.ok) {
        const memJson: ApiResponse<WalletMember[]> = await memRes.json();
        if (memJson.data) setMembers(memJson.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, activeWallet]);

  // --------------------------------------------------------------------------
  // EFEK SAMPING: Panggil Ulang Data jika Dompet Berubah atau Ada Mutasi Baru
  // --------------------------------------------------------------------------
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, refreshTrigger]);

  // --------------------------------------------------------------------------
  // RENDER UI: Tampilan Kosong (Empty State) Saat Pengguna Belum Memiliki Dompet
  // --------------------------------------------------------------------------
  if (wallets.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
          <Wallet className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Belum Ada Dompet Kas Bersama
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Gabung ke kas bersama yang sudah ada dengan kode undangan, atau buat dompet kas baru untuk keluarga, komunitas, atau perkumpulan Anda.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {onOpenJoinWallet && (
            <button
              onClick={onOpenJoinWallet}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              Gabung Kas Bersama (Pakai Kode)
            </button>
          )}
          <button
            onClick={onOpenCreateWallet}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            + Buat Dompet Baru (Admin)
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // AKSI USER: Pembuka Form Pencatatan Transaksi Cepat
  // --------------------------------------------------------------------------
  const openRecordModal = (t: TransactionType) => {
    if (onOpenRecordModal) {
      onOpenRecordModal(t);
    } else {
      setRecordType(t);
      setRecordModalOpen(true);
    }
  };

  /** Memeriksa apakah pengguna memiliki hak bendahara/admin untuk otorisasi aksi */
  const isManagerOrAdmin = activeWallet?.myRole === 'ADMIN' || activeWallet?.myRole === 'PENGELOLA';

  // --------------------------------------------------------------------------
  // RENDER UI: Tampilan Utama Halaman Dasbor
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header Sambutan Komunitas dengan Siluet Lingkungan Warga */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border border-emerald-500/20 dark:border-emerald-800/40 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Siluet Vektor Lingkungan Perumahan Komunitas */}
        <div className="absolute right-0 bottom-0 pointer-events-none opacity-20 dark:opacity-10 translate-x-2 translate-y-1 select-none hidden sm:block">
          <svg width="240" height="90" viewBox="0 0 240 90" fill="currentColor" className="text-emerald-700 dark:text-emerald-300">
            {/* Pohon Kiri */}
            <circle cx="20" cy="55" r="16" />
            <rect x="18" y="65" width="4" height="20" fill="currentColor" />
            {/* Rumah Warga */}
            <path d="M40 85 L40 50 L60 35 L80 50 L80 85 Z" />
            <rect x="52" y="62" width="16" height="23" className="text-white dark:text-slate-950" fill="currentColor" opacity="0.4" />
            {/* Balai Warga / Gedung Pertemuan */}
            <path d="M85 85 L85 40 L145 40 L145 85 Z" />
            <polygon points="115,20 80,40 150,40" />
            <circle cx="115" cy="30" r="4" className="text-white dark:text-slate-950" fill="currentColor" opacity="0.5" />
            <rect x="92" y="48" width="10" height="12" rx="2" className="text-white dark:text-slate-950" fill="currentColor" opacity="0.4" />
            <rect x="108" y="48" width="14" height="12" rx="2" className="text-white dark:text-slate-950" fill="currentColor" opacity="0.4" />
            <rect x="128" y="48" width="10" height="12" rx="2" className="text-white dark:text-slate-950" fill="currentColor" opacity="0.4" />
            <rect x="108" y="68" width="14" height="17" className="text-white dark:text-slate-950" fill="currentColor" opacity="0.6" />
            {/* Pohon Kanan */}
            <circle cx="170" cy="52" r="18" />
            <rect x="168" y="65" width="5" height="20" fill="currentColor" />
            <circle cx="205" cy="58" r="14" />
            <rect x="203" y="68" width="4" height="17" fill="currentColor" />
            {/* Garis Dasar Tanah */}
            <rect x="0" y="84" width="240" height="6" rx="2" opacity="0.3" />
          </svg>
        </div>

        <div className="z-10 space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Halo, {(() => {
              if (!user?.fullName) return '';
              const parts = user.fullName.trim().split(/\s+/);
              if (/^(Bpk\.?|Pak\.?|Ibu\.?|Mas|Mba|Mbak|Sdr\.?)$/i.test(parts[0]) && parts.length > 1) {
                return `${parts[0]} ${parts[1]}`;
              }
              return parts[0];
            })()} <span>👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Berikut ringkasan kas bersama{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {activeWallet?.name}
            </span>
          </p>
        </div>
      </div>

      {/* 2. Kartu Indikator Saldo Utama (Dihitung Realtime oleh Algoritma Buku Besar) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Kartu 1: Saldo Tercatat (Posted Balance) */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-800 text-white shadow-xl shadow-emerald-600/20 relative overflow-hidden flex flex-col justify-between min-h-[175px]">
          {/* Ornamen Vektor Tumpukan Koin Transparan */}
          <div className="absolute -right-3 -bottom-5 w-32 h-32 pointer-events-none select-none opacity-25">
            <svg viewBox="0 0 100 100" fill="none" className="w-full h-full text-white">
              <circle cx="65" cy="65" r="30" stroke="currentColor" strokeWidth="4" />
              <circle cx="65" cy="65" r="22" stroke="currentColor" strokeWidth="3" />
              <circle cx="45" cy="72" r="24" stroke="currentColor" strokeWidth="3" />
              <circle cx="45" cy="72" r="16" stroke="currentColor" strokeWidth="2" />
              <circle cx="75" cy="40" r="18" stroke="currentColor" strokeWidth="3" />
            </svg>
          </div>
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />

          {/* Baris Atas: Label + Tombol Mata Sensor Saldo + Badge Mata Uang */}
          <div className="flex items-center justify-between mb-2 z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
                Saldo Tercatat (Posted)
              </span>
              <button
                type="button"
                onClick={toggleShowBalance}
                className="p-1 rounded-lg hover:bg-white/15 text-emerald-100 transition-colors cursor-pointer"
                title={showBalance ? 'Sembunyikan Saldo' : 'Tampilkan Saldo'}
                aria-label="Toggle visibility saldo"
              >
                {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white flex items-center gap-1">
              {activeWallet?.currency || 'IDR'}
              <ChevronDown className="w-3 h-3 text-emerald-200" />
            </span>
          </div>

          {/* Tampilan Nilai Nominal Saldo */}
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 z-10">
            {formatAmount(summary?.postedBalance || 0)}
          </div>

          {/* Penjelasan Ringkas Invarian Buku Besar */}
          <p className="text-xs text-emerald-100/90 leading-relaxed z-10 mt-auto">
            Total saldo yang telah diverifikasi dan dibukukan resmi dalam ledger.
          </p>
        </div>

        {/* Kartu 2: Saldo Tersedia (Available Balance) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-emerald-500/50 dark:hover:border-emerald-500/40 transition-all flex flex-col justify-between min-h-[175px] group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/80 dark:border-emerald-700/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="font-semibold uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400">
                Saldo Tersedia
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
          </div>

          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white my-1">
            {formatAmount(summary?.availableBalance || 0)}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-auto">
            Saldo riil yang dapat digunakan setelah dipotong reservasi pengeluaran.
          </p>
        </div>

        {/* Kartu 3: Dana Reservasi Aktif (Pending Approvals) */}
        <div
          onClick={() => onNavigateToTab('persetujuan')}
          className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-amber-500/50 dark:hover:border-amber-500/40 transition-all flex flex-col justify-between min-h-[175px] group cursor-pointer"
          title="Klik untuk melihat transaksi yang menunggu kuorum"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300/80 dark:border-amber-700/80 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <Coins className="w-4 h-4" />
              </div>
              <span className="font-semibold uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400">
                Reservasi Aktif
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
          </div>

          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white my-1">
            {formatAmount(summary?.activeReservations || 0)}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-auto">
            Dana yang direservasi untuk transaksi yang sedang menunggu persetujuan.
          </p>
        </div>
      </div>

      {/* 3. Baris Tengah: Widget Mini Papan Iuran & Diagram Komposisi Anggota */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Widget Mini Kepatuhan Iuran Komunitas */}
        <MiniDuesWidget
          duesBoard={duesBoard}
          isLoading={isLoading}
          onNavigateToDues={() => onNavigateToTab('papan-iuran')}
        />
        {/* Widget Komposisi Peran Anggota (Donut Chart) */}
        <MemberDonutWidget
          members={members}
          isLoading={isLoading}
          onNavigateToMembers={() => onNavigateToTab('anggota')}
        />
      </div>

      {/* 4. Baris Bawah: Grafik Tren Saldo Kas 6 Bulan & Umpan Aktivitas Terkini */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Grafik Batang Historis Arus Saldo */}
        <CashTrendWidget
          currentBalance={summary?.postedBalance || 0}
          transactions={transactions}
          isLoading={isLoading}
        />
        {/* Feed Aktivitas Terkini dengan Filter Pemasukan/Pengeluaran */}
        <RecentActivityWidget
          transactions={transactions}
          isLoading={isLoading}
          isManagerOrAdmin={isManagerOrAdmin}
          onSelectTransaction={(tx) => setSelectedTx(tx)}
          onOpenRecordModal={openRecordModal}
          activeFilter={activeFilter}
          onChangeFilter={setActiveFilter}
          onNavigateToTransactions={() => onNavigateToTab('transaksi')}
        />
      </div>

      {/* 5. Modal Pencatatan Transaksi Baru */}
      {recordModalOpen && (
        <RecordTransactionModal
          isOpen={recordModalOpen}
          initialType={recordType}
          availableBalance={summary?.availableBalance || 0}
          onClose={() => setRecordModalOpen(false)}
          onSuccess={fetchDashboardData}
        />
      )}

      {/* 6. Modal Detail & Jejak Audit Peristiwa Transaksi */}
      {selectedTx && (
        <TransactionDetailModal
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
          onSuccess={fetchDashboardData}
        />
      )}
    </div>
  );
};

