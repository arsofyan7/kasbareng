/**
 * ============================================================================
 * HALAMAN PAPAN REKAPITULASI IURAN WARGA / KOMUNITAS (DUESBOARDPAGE.TSX)
 * ============================================================================
 * Komponen ini menyediakan matriks transparansi finansial publik bagi anggota:
 * 1. Papan Matriks Kisi-Kisi: Memetakan status pembayaran tiap warga (Januari - Desember
 *    atau Termin 1 - N) secara interaktif dengan indikator warna (Lunas, Menunggu, Belum).
 * 2. Metrik Kepatuhan Realtime: Menghitung persentase kepatuhan gotong royong, total kas
 *    terkumpul, nominal dalam antrean verifikasi, dan jumlah penunggak.
 * 3. Otomatisasi Pengingat WhatsApp: Membuat teks draf pesan penagihan santun secara dinamis
 *    yang siap disalin atau dikirim langsung ke grup WA warga.
 * 4. Aksi Cepat Setoran: Pengurus dapat mencatat setoran langsung dari sel tabel yang kosong,
 *    dan anggota dapat mengunggah struk transfer mandiri.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { DuesBoardResult, ApiResponse, Transaction } from '../types';
import {
  CalendarDays,
  Clock,
  Copy,
  Check,
  MessageCircle,
  TrendingUp,
  AlertCircle,
  Search,
  RefreshCw,
  PlusCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  Info,
  ExternalLink,
  Sliders,
  Plus,
} from 'lucide-react';
import { RecordTransactionModal } from '../components/common/RecordTransactionModal';
import { ManageDuesConfigModal } from '../components/common/ManageDuesConfigModal';
import { TransactionDetailModal } from '../components/common/TransactionDetailModal';

export const DuesBoardPage: React.FC = () => {
  // --------------------------------------------------------------------------
  // STATE & HOOKS: Konteks Global Autentikasi & Dompet Aktif
  // --------------------------------------------------------------------------
  const { token, user } = useAuth();
  const { activeWallet } = useWallet();

  // --------------------------------------------------------------------------
  // STATE: Pemilihan Tahun Kalender & Penampung Data Matriks
  // --------------------------------------------------------------------------
  const currentCalendarYear = new Date().getFullYear();
  /** Tahun buku iuran yang dipilih untuk ditampilkan (default: tahun berjalan) */
  const [selectedYear, setSelectedYear] = useState<number>(currentCalendarYear);
  /** Payload lengkap matriks data iuran (periode, anggota, ringkasan statistik) */
  const [data, setData] = useState<DuesBoardResult | null>(null);
  /** Status pemuatan data dari server */
  const [isLoading, setIsLoading] = useState<boolean>(true);
  /** Pesan kesalahan jika query API gagal */
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // STATE: Filter Pencarian Nama Warga & Status Pelunasan
  // --------------------------------------------------------------------------
  /** Kata kunci pencarian nama atau email warga */
  const [searchQuery, setSearchQuery] = useState<string>('');
  /** Filter status baris: SEMUA, HANYA YANG MENUNGGAK, atau LUNAS 100% */
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID_ONLY' | 'FULLY_PAID'>('ALL');

  // --------------------------------------------------------------------------
  // STATE: Notifikasi Visual Salin Teks Penagihan WhatsApp
  // --------------------------------------------------------------------------
  const [copiedReminder, setCopiedReminder] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // STATE: Modal Pencatatan Setoran dengan Prefill Anggota & Periode
  // --------------------------------------------------------------------------
  const [recordModalOpen, setRecordModalOpen] = useState<boolean>(false);
  const [prefillUserId, setPrefillUserId] = useState<string | undefined>(undefined);
  const [prefillPeriods, setPrefillPeriods] = useState<string[] | undefined>(undefined);

  // --------------------------------------------------------------------------
  // STATE: Modal Konfigurasi Skema Iuran (Khusus Admin / Pengelola)
  // --------------------------------------------------------------------------
  const [duesConfigOpen, setDuesConfigOpen] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // STATE: Modal Detail Sel Matriks (Informasi Pembayaran Per Bulan Tertentu)
  // --------------------------------------------------------------------------
  const [selectedCell, setSelectedCell] = useState<{
    memberName: string;
    periodLabel: string;
    status: string;
    amount: number;
    transactionId: string | null;
    receiptAttachmentId: string | null;
  } | null>(null);

  // --------------------------------------------------------------------------
  // STATE: Modal Inspeksi & Verifikasi Transaksi Kas
  // --------------------------------------------------------------------------
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  /** Cek hak akses apakah pengguna adalah pengurus berwenang (Admin/Pengelola) */
  const isManagerOrAdmin =
    activeWallet?.myRole === 'ADMIN' || activeWallet?.myRole === 'PENGELOLA';

  // --------------------------------------------------------------------------
  // QUERY & DATA FETCHING: Pengambilan Matriks Iuran dari API Backend
  // --------------------------------------------------------------------------
  const fetchDuesBoard = useCallback(async () => {
    if (!token || !activeWallet) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/v1/wallets/${activeWallet.id}/dues-board?year=${selectedYear}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const json: ApiResponse<DuesBoardResult> = await res.json();
      if (res.ok && json.data) {
        setData(json.data);
      } else {
        setErrorMsg(json.error?.message || 'Gagal memuat papan iuran.');
      }
    } catch (err: any) {
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  }, [token, activeWallet, selectedYear]);

  // --------------------------------------------------------------------------
  // EFEK SAMPING: Panggil Ulang Data Ketika Dompet atau Tahun Berubah
  // --------------------------------------------------------------------------
  useEffect(() => {
    fetchDuesBoard();
  }, [fetchDuesBoard]);

  // --------------------------------------------------------------------------
  // AKSI USER: Salin Teks Draf Pesan Pengingat WhatsApp ke Clipboard
  // --------------------------------------------------------------------------
  const handleCopyReminder = () => {
    if (!data?.summary?.whatsappReminderText) return;
    navigator.clipboard.writeText(data.summary.whatsappReminderText);
    setCopiedReminder(true);
    setTimeout(() => setCopiedReminder(false), 2500);
  };

  // --------------------------------------------------------------------------
  // AKSI USER: Buka Langsung Aplikasi WhatsApp dengan Pesan Terformat
  // --------------------------------------------------------------------------
  const handleSendWhatsApp = () => {
    if (!data?.summary?.whatsappReminderText) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      data.summary.whatsappReminderText
    )}`;
    window.open(url, '_blank');
  };

  // --------------------------------------------------------------------------
  // MEMOISASI FILTER: Penyaringan Anggota Berdasarkan Pencarian & Status Tunggakan
  // --------------------------------------------------------------------------
  const filteredMembers = useMemo(() => {
    if (!data) return [];
    return data.members.filter((m) => {
      const matchSearch =
        m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (statusFilter === 'UNPAID_ONLY') {
        return m.unpaidCount > 0;
      }
      if (statusFilter === 'FULLY_PAID') {
        return m.isFullyPaid;
      }
      return true;
    });
  }, [data, searchQuery, statusFilter]);

  // --------------------------------------------------------------------------
  // RENDER UI: Kondisi Saat Belum Ada Dompet Kas yang Dipilih
  // --------------------------------------------------------------------------
  if (!activeWallet) {
    return (
      <div className="p-8 text-center text-slate-500">
        Pilih dompet kas bersama terlebih dahulu.
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER UI: Tampilan Utama Papan Iuran
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header Judul & Bilah Tombol Aksi Utama */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Papan Rekap Iuran & Setoran Bersama
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  {data?.summary?.duesType === 'TARGET_INSTALLMENTS'
                    ? `Target ${data.summary.targetInstallmentsCount || 10} Termin`
                    : `Tahun ${selectedYear}`}
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Transparan untuk seluruh anggota & pengurus. Pantau siapa yang sudah lunas dan siapa yang belum bayar.
              </p>
            </div>
          </div>
        </div>

        {/* Bilah Tombol Aksi Navigasi & Operasional */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Pemilih Tahun (Hanya aktif untuk skema iuran bulanan berkala) */}
          {data?.summary?.duesType !== 'TARGET_INSTALLMENTS' && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-300 dark:border-slate-600">
              <button
                type="button"
                onClick={() => setSelectedYear((y) => y - 1)}
                className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Tahun Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-100">
                {selectedYear}
              </span>
              <button
                type="button"
                onClick={() => setSelectedYear((y) => y + 1)}
                className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Tahun Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Tombol Atur Kebijakan Iuran (Admin & Pengelola) */}
          {isManagerOrAdmin && (
            <button
              type="button"
              onClick={() => setDuesConfigOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Sesuaikan Skema atau Nominal Iuran Kas"
            >
              <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Atur Iuran</span>
            </button>
          )}

          {/* Tombol Refresh / Muat Ulang Data */}
          <button
            type="button"
            onClick={fetchDuesBoard}
            disabled={isLoading}
            className="p-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 transition-colors"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Tombol Salin Teks Rekap untuk Pesan Singkat */}
          <button
            type="button"
            onClick={handleCopyReminder}
            className="px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            {copiedReminder ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-600">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Rekap</span>
              </>
            )}
          </button>

          {/* Tombol Broadcast Pesan Pengingat WhatsApp */}
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="px-3.5 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Kirim Pengingat WA</span>
          </button>

          {/* Tombol Catat / Lapor Setoran Iuran Baru */}
          <button
            type="button"
            onClick={() => {
              setPrefillUserId(undefined);
              setPrefillPeriods(undefined);
              setRecordModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isManagerOrAdmin ? 'Catat Setoran' : 'Lapor Setoran'}</span>
          </button>
        </div>
      </div>

      {/* 2. Banner Indikator Kesalahan Sistem */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-3 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3. Kartu Statistik Utama KPI Iuran Komunitas */}
      {data?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Kartu 1: Persentase Kepatuhan Pembayaran */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Tingkat Kepatuhan</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {data.summary.complianceRatePercent}%
              </span>
              <span className="text-xs text-slate-500">lunas tepat waktu</span>
            </div>
            {/* Indikator Bilah Progres */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${data.summary.complianceRatePercent}%` }}
              />
            </div>
          </div>

          {/* Kartu 2: Akumulasi Kas Iuran Terkumpul */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Total Kas Terkumpul</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                Lunas
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              Rp {data.summary.totalCollected.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {data.summary.totalTargetPotential > 0
                ? `Potensi target: Rp ${data.summary.totalTargetPotential.toLocaleString('id-ID')}`
                : 'Nominal iuran sukarela/fleksibel'}
            </p>
          </div>

          {/* Kartu 3: Nominal Menunggu Verifikasi Bendahara */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Menunggu Verifikasi</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              Rp {data.summary.totalPending.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Laporan setoran anggota yang belum disetujui pengurus
            </p>
          </div>

          {/* Kartu 4: Status Jumlah Anggota Lunas vs Menunggak */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Status Anggota</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {data.summary.totalMembers - data.summary.unpaidMembers.length}
              </span>
              <span className="text-xs text-slate-500">
                / {data.summary.totalMembers} Lunas 100%
              </span>
            </div>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
              {data.summary.unpaidMembers.length} anggota masih memiliki tunggakan
            </p>
          </div>
        </div>
      )}

      {/* 4. Banner Catatan Transparansi Komunitas */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-700 flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            Papan iuran ini bersifat <strong>terbuka dan transparan</strong> untuk seluruh anggota dompet kas guna menjaga akuntabilitas gotong royong anggota.
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] shrink-0">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Lunas
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Menunggu
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" /> Belum Bayar
          </span>
        </div>
      </div>

      {/* 5. Bar Pencarian & Tombol Filter Status Kepatuhan */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Kolom Pencarian Anggota */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama anggota / penyetor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Pilihan Filter Kepatuhan Baris */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              statusFilter === 'ALL'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Semua ({data?.members.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('UNPAID_ONLY')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              statusFilter === 'UNPAID_ONLY'
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold'
                : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Ada Tunggakan ({data?.summary?.unpaidMembers.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('FULLY_PAID')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              statusFilter === 'FULLY_PAID'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Lunas 100%
          </button>
        </div>
      </div>

      {/* 6. Tabel Matriks Papan Iuran (Grid Periode Kolom & Baris Warga) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold">
                {/* Kolom Tetap (Sticky) Nama Anggota */}
                <th className="py-3.5 px-4 sticky left-0 z-20 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-sm min-w-[180px] shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                  Anggota Kas
                </th>
                {/* Kolom Periode Iuran (Bulan 1 s/d 12 atau Termin N) */}
                {data?.periods.map((p) => (
                  <th key={p.key} className="py-3.5 px-2 text-center min-w-[56px]">
                    <span title={p.label}>{p.shortLabel}</span>
                  </th>
                ))}
                {/* Kolom Total Pembayaran Berhasil */}
                <th className="py-3.5 px-4 text-right min-w-[120px]">
                  Total Masuk
                </th>
                {/* Kolom Status Akhir Anggota */}
                <th className="py-3.5 px-4 text-center min-w-[100px]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={(data?.periods.length || 12) + 3}
                    className="py-12 text-center text-slate-400"
                  >
                    Tidak ada anggota yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const isCurrentUser = member.userId === user?.id;
                  return (
                    <tr
                      key={member.userId}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        isCurrentUser ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''
                      }`}
                    >
                      {/* Sel Anggota (Sticky Column) */}
                      <td className="py-3 px-4 sticky left-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                            {member.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                              <span>{member.fullName}</span>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {member.role}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Sel Matriks Status per Periode */}
                      {data?.periods.map((p) => {
                        const rec = member.records[p.key];
                        const isPaid = rec && rec.status === 'PAID';
                        const isPending = rec && rec.status === 'PENDING';

                        return (
                          <td key={p.key} className="py-2.5 px-1.5 text-center">
                            {isPaid ? (
                              /* Tombol Hijau: Pembayaran Lunas */
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedCell({
                                    memberName: member.fullName,
                                    periodLabel: p.label,
                                    status: 'Lunas',
                                    amount: rec.amount,
                                    transactionId: rec.transactionId,
                                    receiptAttachmentId: rec.receiptAttachmentId,
                                  })
                                }
                                className="w-8 h-8 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-flex items-center justify-center hover:scale-105 transition-transform"
                                title={`${p.label}: Lunas (Rp ${rec.amount.toLocaleString('id-ID')})`}
                              >
                                <Check className="w-4 h-4 stroke-[2.5]" />
                              </button>
                            ) : isPending ? (
                              /* Tombol Kuning: Menunggu Verifikasi Bendahara */
                              <button
                                type="button"
                                onClick={() => {
                                  if (rec.transactionId) {
                                    setSelectedTx({
                                      id: rec.transactionId,
                                      amount: rec.amount,
                                      type: 'INCOME',
                                      state: 'SUBMITTED',
                                      currency: activeWallet.currency,
                                      category: 'Iuran / Setoran Bulanan',
                                    } as Transaction);
                                  } else {
                                    setSelectedCell({
                                      memberName: member.fullName,
                                      periodLabel: p.label,
                                      status: 'Menunggu Verifikasi',
                                      amount: rec.amount,
                                      transactionId: rec.transactionId,
                                      receiptAttachmentId: rec.receiptAttachmentId,
                                    });
                                  }
                                }}
                                className="w-8 h-8 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 inline-flex items-center justify-center hover:scale-110 hover:shadow-md transition-all animate-pulse"
                                title={`${p.label}: Menunggu Verifikasi — Klik untuk verifikasi transaksi (Rp ${rec.amount.toLocaleString('id-ID')})`}
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </button>
                            ) : isManagerOrAdmin ? (
                              /* Tombol Plus Abu-abu: Pengurus Dapat Langsung Mencatat Setoran */
                              <button
                                type="button"
                                onClick={() => {
                                  setPrefillUserId(member.userId);
                                  setPrefillPeriods([p.key]);
                                  setRecordModalOpen(true);
                                }}
                                className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 hover:border hover:border-emerald-300 dark:hover:bg-emerald-950/40 dark:hover:border-emerald-700 inline-flex items-center justify-center text-xs transition-all cursor-pointer group"
                                title={`Klik untuk catat setoran ${member.fullName} (${p.label})`}
                              >
                                <span className="group-hover:hidden">—</span>
                                <Plus className="w-3.5 h-3.5 hidden group-hover:block text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                              </button>
                            ) : (
                              /* Garis Strip Abu-abu: Belum Bayar */
                              <span
                                className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 inline-flex items-center justify-center text-xs"
                                title={`${p.label}: Belum Bayar`}
                              >
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Sel Total Nominal Pembayaran Sukses */}
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        Rp {member.totalPaidAmount.toLocaleString('id-ID')}
                      </td>

                      {/* Sel Lencana Status Kepatuhan Anggota */}
                      <td className="py-3 px-4 text-center">
                        {member.isFullyPaid ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Lunas 🎉
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {member.paidCount}/{data?.periods.length || 12} Periode
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Modal Pop-up Rincian Sel Pembayaran */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Detail Pembayaran Iuran
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Anggota Penyetor:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {selectedCell.memberName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Periode:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {selectedCell.periodLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                    selectedCell.status === 'Lunas'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {selectedCell.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nominal:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Rp {selectedCell.amount.toLocaleString('id-ID')}
                </span>
              </div>
              {selectedCell.transactionId && (
                <div className="flex justify-between">
                  <span className="text-slate-500">ID Transaksi:</span>
                  <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
                    {selectedCell.transactionId.slice(0, 12)}...
                  </span>
                </div>
              )}
            </div>

            {/* Link Bukti Lampiran Transfer Bank jika Ada */}
            {selectedCell.receiptAttachmentId && (
              <a
                href={`/api/v1/attachments/${selectedCell.receiptAttachmentId}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Lihat Foto Bukti Transfer
              </a>
            )}

            {/* Tombol Menuju Halaman Verifikasi Transaksi */}
            {selectedCell.transactionId && (
              <button
                type="button"
                onClick={() => {
                  const txId = selectedCell.transactionId!;
                  const txAmount = selectedCell.amount;
                  const isPaid = selectedCell.status === 'Lunas';
                  setSelectedCell(null);
                  setSelectedTx({
                    id: txId,
                    amount: txAmount,
                    type: 'INCOME',
                    state: isPaid ? 'COMPLETED' : 'SUBMITTED',
                    currency: activeWallet.currency,
                    category: 'Iuran / Setoran Bulanan',
                  } as Transaction);
                }}
                className="w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-emerald-200 dark:border-emerald-800"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka Detail & Verifikasi Transaksi
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* 8. Modal Pencatatan Transaksi Setoran Iuran */}
      {recordModalOpen && (
        <RecordTransactionModal
          isOpen={recordModalOpen}
          initialType="INCOME"
          initialTargetUserId={prefillUserId}
          initialPeriods={prefillPeriods}
          onClose={() => {
            setRecordModalOpen(false);
            setPrefillUserId(undefined);
            setPrefillPeriods(undefined);
          }}
          onSuccess={() => {
            fetchDuesBoard();
          }}
        />
      )}

      {/* 9. Modal Konfigurasi Aturan & Nominal Iuran */}
      {duesConfigOpen && (
        <ManageDuesConfigModal
          isOpen={duesConfigOpen}
          onClose={() => setDuesConfigOpen(false)}
          onSuccess={() => {
            fetchDuesBoard();
          }}
        />
      )}

      {/* 10. Modal Inspeksi & Verifikasi Transaksi Kas Terkait */}
      {selectedTx && (
        <TransactionDetailModal
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
          onSuccess={() => {
            setSelectedTx(null);
            fetchDuesBoard();
          }}
        />
      )}
    </div>
  );
};

