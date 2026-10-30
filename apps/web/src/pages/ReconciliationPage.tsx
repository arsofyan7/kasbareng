/**
 * ============================================================================
 * HALAMAN REKONSILIASI MUTASI BANK OTOMATIS (RECONCILIATIONPAGE.TSX)
 * ============================================================================
 * Komponen ini merupakan antarmuka bagi mesin pencocokan mutasi bank (Reconciliation Engine):
 * 1. Impor Mutasi Rekening Koran (CSV Parser): Mendukung parsing otomatis multi-bank
 *    (BCA, Mandiri, BRI, BNI, dan CSV generik) dengan deteksi cerdas kolom & arah dana.
 * 2. Algoritma Pencocokan 4 Lapisan (4-Tier Matching Algorithm):
 *    - Lapisan 1: Nomor Referensi Unik (Exact Match).
 *    - Lapisan 2: Kesesuaian Nominal, Arah Dana (Kredit/Debit), & Rentang Tanggal (±3 Hari).
 *    - Lapisan 3: Deteksi Ambiguitas & Duplikasi untuk Mencegah Salah Pasang.
 *    - Lapisan 4: Pencocokan Manual Berbasis Jejak Audit Kriptografis SHA-256.
 * 3. Pembuatan Transaksi Instan: Mengonversi mutasi bank yang belum tercatat menjadi
 *    entri pembukuan kas resmi dengan satu klik.
 * 4. Metrik Akurasi Rekonsiliasi: Memantau persentase ketepatan pencocokan otomatis (Precision Auto-Match).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import {
  ReconciliationSummary,
  BankStatementItem,
  ApiResponse,
} from '../types';
import {
  Scale,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  HelpCircle,
  X,
  RefreshCw,
  Sparkles,
  Search,
} from 'lucide-react';

export const ReconciliationPage: React.FC = () => {
  // --------------------------------------------------------------------------
  // STATE & HOOKS: Konteks Autentikasi Pengguna & Dompet Aktif
  // --------------------------------------------------------------------------
  const { token } = useAuth();
  const { activeWallet } = useWallet();

  // --------------------------------------------------------------------------
  // STATE: Data Ringkasan Hasil Rekonsiliasi & Indikator Status
  // --------------------------------------------------------------------------
  /** Ringkasan hasil pemrosesan rekonsiliasi per batch impor */
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  /** Status pemuatan data dari server */
  const [isLoading, setIsLoading] = useState<boolean>(false);
  /** Pesan error validasi atau kegagalan jaringan */
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  /** Filter tab tampilan: SEMUA, COCOK, PERLU DITINJAU, BANK BELUM DICATAT, KAS TANPA BANK */
  const [activeTab, setActiveTab] = useState<'ALL' | 'MATCHED' | 'AMBIGUOUS' | 'UNMATCHED_BANK' | 'UNMATCHED_INTERNAL'>('ALL');
  /** Kata kunci pencarian mutasi (deskripsi, nominal, atau nomor referensi) */
  const [searchQuery, setSearchQuery] = useState<string>('');

  // --------------------------------------------------------------------------
  // STATE: Panel Impor Berkas Rekening Koran (CSV Import)
  // --------------------------------------------------------------------------
  /** Kontrol buka/tutup accordion panel input teks CSV */
  const [showImportCard, setShowImportCard] = useState<boolean>(false);
  /** Teks mentah CSV yang ditempelkan pengguna */
  const [csvText, setCsvText] = useState<string>('');
  /** Status proses pengunggahan dan pencocokan otomatis */
  const [isImporting, setIsImporting] = useState<boolean>(false);
  /** Pesan keberhasilan impor dan jumlah baris tercocokkan */
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // STATE: Modal Pencocokan Manual (Manual Match Modal)
  // --------------------------------------------------------------------------
  /** Item baris mutasi bank yang sedang dipilih untuk dipasangkan secara manual */
  const [selectedBankItem, setSelectedBankItem] = useState<BankStatementItem | null>(null);
  /** ID transaksi kas internal yang dipilih sebagai pasangan mutasi */
  const [selectedTxId, setSelectedTxId] = useState<string>('');
  /** Alasan justifikasi manual match (wajib diisi untuk audit trail) */
  const [manualMatchReason, setManualMatchReason] = useState<string>('');
  /** Status proses submit pasangan manual */
  const [isSubmittingMatch, setIsSubmittingMatch] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // STATE: Modal Pembuatan Transaksi Baru dari Mutasi Bank
  // --------------------------------------------------------------------------
  /** Item baris mutasi bank yang belum tercatat di kas dan akan dibuatkan transaksinya */
  const [createTxBankItem, setCreateTxBankItem] = useState<BankStatementItem | null>(null);
  /** Kategori pos transaksi yang akan dibuat */
  const [newTxCategory, setNewTxCategory] = useState<string>('');
  /** Catatan rincian operasional transaksi baru */
  const [newTxNotes, setNewTxNotes] = useState<string>('');
  /** Status proses penyimpanan transaksi baru */
  const [isCreatingTx, setIsCreatingTx] = useState<boolean>(false);

  /** Cek hak otorisasi peran pengurus (Admin atau Pengelola) */
  const isManagerOrAdmin = activeWallet?.myRole === 'ADMIN' || activeWallet?.myRole === 'PENGELOLA';

  // --------------------------------------------------------------------------
  // QUERY & DATA FETCHING: Pengambilan Laporan Ringkasan Rekonsiliasi Bank
  // --------------------------------------------------------------------------
  const fetchSummary = useCallback(async () => {
    if (!token || !activeWallet) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/wallets/${activeWallet.id}/reconciliation/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json: ApiResponse<ReconciliationSummary> = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal memuat data rekonsiliasi.');
      }
      setSummary(json.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memuat data.');
    } finally {
      setIsLoading(false);
    }
  }, [token, activeWallet]);

  // --------------------------------------------------------------------------
  // EFEK SAMPING: Sinkronisasi Data Saat Komponen Dimuat
  // --------------------------------------------------------------------------
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // --------------------------------------------------------------------------
  // AKSI USER: Pengunggahan & Parsing Berkas CSV Mutasi Bank
  // --------------------------------------------------------------------------
  const handleImportCsv = async () => {
    if (!token || !activeWallet || !csvText.trim()) return;
    setIsImporting(true);
    setErrorMsg(null);
    setImportSuccessMsg(null);
    try {
      const res = await fetch(`/api/v1/wallets/${activeWallet.id}/reconciliation/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          csvContent: csvText,
          filename: 'mutasi_bank_impor.csv',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal mengimpor mutasi CSV.');
      }

      setImportSuccessMsg(json.meta?.message || 'Mutasi bank berhasil diimpor dan dicocokkan otomatis!');
      setCsvText('');
      setShowImportCard(false);
      await fetchSummary();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // --------------------------------------------------------------------------
  // HELPER TEMPLATE: Contoh Muatan Sampel Format CSV Mutasi BCA
  // --------------------------------------------------------------------------
  const loadBcaSample = () => {
    const today = new Date().toISOString().split('T')[0];
    const sample = `Tanggal,Keterangan,Cabang,Jumlah,Tipe,Saldo
${today},TRX-IURAN-01 IURAN WARGA RT BLOK A,0123,"250.000,00",CR,"1.250.000,00"
${today},BELANJA PERBAIKAN LAMPU JALAN,0123,"150.000,00",DB,"1.100.000,00"
${today},DONASI KEBERSIHAN LINGKUNGAN,0123,"100.000,00",CR,"1.200.000,00"
${today},TRANSFER DARI HAMBA ALLAH 998811,0123,"50.000,00",CR,"1.250.000,00"`;
    setCsvText(sample);
  };

  // --------------------------------------------------------------------------
  // HELPER TEMPLATE: Contoh Muatan Sampel Format CSV Mutasi Mandiri
  // --------------------------------------------------------------------------
  const loadMandiriSample = () => {
    const today = new Date().toISOString().split('T')[0];
    const sample = `Tanggal Transaksi,No Referensi,Keterangan,Debet,Kredit,Saldo
${today},REF-MDR-101,IURAN BULANAN WARGA BLOK B,,300000.00,300000.00
${today},REF-MDR-102,KONSUMSI KERJA BAKTI MINGGU,120000.00,,180000.00
${today},,KAS MASUK SPONTAN,,75000.00,255000.00`;
    setCsvText(sample);
  };

  // --------------------------------------------------------------------------
  // AKSI USER: Simpan Pencocokan Manual Mutasi Bank dengan Transaksi Internal
  // Menyimpan alasan ke rantai hash SHA-256 untuk pemenuhan kepatuhan audit
  // --------------------------------------------------------------------------
  const handleManualMatchSubmit = async () => {
    if (!token || !activeWallet || !selectedBankItem || !selectedTxId || !manualMatchReason.trim()) return;
    setIsSubmittingMatch(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/wallets/${activeWallet.id}/reconciliation/manual-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bankStatementId: selectedBankItem.id,
          transactionId: selectedTxId,
          reason: manualMatchReason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal menyimpan pencocokan manual.');
      }

      setSelectedBankItem(null);
      setSelectedTxId('');
      setManualMatchReason('');
      await fetchSummary();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmittingMatch(false);
    }
  };

  // --------------------------------------------------------------------------
  // AKSI USER: Konversi Mutasi Bank Langsung Menjadi Transaksi Kas Resmi
  // --------------------------------------------------------------------------
  const handleCreateTxSubmit = async () => {
    if (!token || !activeWallet || !createTxBankItem || !newTxCategory.trim()) return;
    setIsCreatingTx(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/wallets/${activeWallet.id}/reconciliation/create-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bankStatementId: createTxBankItem.id,
          category: newTxCategory.trim(),
          notes: newTxNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal membuat transaksi dari mutasi bank.');
      }

      setCreateTxBankItem(null);
      setNewTxCategory('');
      setNewTxNotes('');
      await fetchSummary();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsCreatingTx(false);
    }
  };

  // --------------------------------------------------------------------------
  // LOGIKA FILTERING: Penyaringan Baris Mutasi Berdasarkan Tab & Input Cari
  // --------------------------------------------------------------------------
  const filteredBankStatements = (summary?.bankStatements || []).filter((b) => {
    // Filter status tab
    if (activeTab === 'MATCHED' && b.matchStatus !== 'MATCHED') return false;
    if (activeTab === 'AMBIGUOUS' && b.matchStatus !== 'AMBIGUOUS' && b.matchStatus !== 'DUPLICATE_POTENTIAL') return false;
    if (activeTab === 'UNMATCHED_BANK' && b.matchStatus !== 'UNMATCHED') return false;

    // Filter teks pencarian bebas
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = b.description.toLowerCase().includes(q);
      const matchRef = (b.externalReference || '').toLowerCase().includes(q);
      const matchAmt = b.amount.toString().includes(q);
      return matchDesc || matchRef || matchAmt;
    }

    return true;
  });

  // --------------------------------------------------------------------------
  // HELPER FORMAT: Lencana Indikator Visual Status Rekonsiliasi
  // --------------------------------------------------------------------------
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MATCHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Cocok (Matched)
          </span>
        );
      case 'AMBIGUOUS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Ambiguitas ({'>'}1 Kandidat)
          </span>
        );
      case 'DUPLICATE_POTENTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Referensi Duplikat
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Belum Dicatat
          </span>
        );
    }
  };

  // --------------------------------------------------------------------------
  // HELPER FORMAT: Lencana Aturan Algoritma yang Berhasil Memasangkan Transaksi
  // --------------------------------------------------------------------------
  const getRuleBadge = (rule: string) => {
    switch (rule) {
      case 'EXACT_REFERENCE':
        return <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">R1: Ref Unik Cocok</span>;
      case 'NOMINAL_DIRECTION_DATE_WINDOW':
        return <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded">R2: Nominal & Tgl Cocok</span>;
      case 'MANUAL_MATCH':
        return <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded">Pencocokan Manual</span>;
      case 'CREATED_FROM_BANK_MUTATION':
        return <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded">Dibuat Otomatis</span>;
      default:
        return null;
    }
  };

  // --------------------------------------------------------------------------
  // RENDER UI: Tampilan Halaman Rekonsiliasi Bank
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Bar Atas: Judul & Tombol Pemicu Impor CSV */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Rekonsiliasi Bank CSV
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider">
              3-Pass Matching
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pencocokan mutasi rekening koran dan kas bersama secara transparan, deterministik, dan dapat diaudit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tombol Muat Ulang Data */}
          <button
            onClick={fetchSummary}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Tombol Buka/Tutup Accordion Impor CSV */}
          {isManagerOrAdmin && (
            <button
              onClick={() => setShowImportCard(!showImportCard)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>{showImportCard ? 'Tutup Panel Impor' : 'Impor CSV Bank'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Banner Notifikasi Status (Error & Sukses) */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {importSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{importSuccessMsg}</span>
          </div>
          <button onClick={() => setImportSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Panel Formulir Tempel Berkas CSV Mutasi Bank */}
      {showImportCard && isManagerOrAdmin && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-800 shadow-md space-y-4 animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Impor Mutasi Rekening Bank (CSV)
              </h3>
            </div>
            {/* Tombol Contoh CSV Bank Nasional */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadBcaSample}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Contoh CSV BCA
              </button>
              <button
                type="button"
                onClick={loadMandiriSample}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                Contoh CSV Mandiri
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Format yang didukung otomatis: <strong>BCA</strong>, <strong>Mandiri</strong>, <strong>BRI</strong>, <strong>BNI</strong>, atau <strong>Standar KasBareng</strong>. Sistem otomatis mendeteksi header, pemisah desimal, nomor referensi, serta arah kredit/debit.
          </p>

          {/* Area Input Teks CSV */}
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={6}
            placeholder="Tempel (paste) isi berkas CSV mutasi bank Anda di sini..."
            className="w-full font-mono text-xs p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setShowImportCard(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleImportCsv}
              disabled={isImporting || !csvText.trim()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>{isImporting ? 'Memproses & Mencocokkan...' : 'Mulai Rekonsiliasi Otomatis'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Kartu Indikator Metrik Kunci Hasil Rekonsiliasi */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Metrik 1: Persentase Akurasi Pencocokan Otomatis */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-md shadow-indigo-600/10 col-span-2 md:col-span-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">
            Akurasi Match
          </div>
          <div className="text-3xl font-extrabold tracking-tight mt-1">
            {summary?.precisionAutoMatchPercent || 0}%
          </div>
          <div className="text-[11px] text-indigo-100/90 mt-1">
            Dari {summary?.totalBankMutations || 0} baris mutasi bank
          </div>
        </div>

        {/* Metrik 2: Jumlah Mutasi Cocok Pasti (Matched) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Cocok</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {summary?.matchedCount || 0}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
            Terkonfirmasi valid
          </div>
        </div>

        {/* Metrik 3: Ambiguitas & Duplikasi (Perlu Peninjauan Pengurus) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Perlu Ditinjau</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {(summary?.ambiguousCount || 0) + (summary?.duplicateAlertsCount || 0)}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
            Kandidat ganda
          </div>
        </div>

        {/* Metrik 4: Mutasi Bank yang Belum Tercatat di Kas */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Bank Tanpa Kas</span>
            <ArrowDownLeft className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {summary?.unmatchedBankCount || 0}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
            Belum ada draf kas
          </div>
        </div>

        {/* Metrik 5: Transaksi Kas Internal yang Belum Muncul di Bank */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Kas Tanpa Bank</span>
            <ArrowUpRight className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {summary?.unmatchedInternalCount || 0}
          </div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5">
            Belum terverifikasi mutasi
          </div>
        </div>
      </div>

      {/* 5. Wadah Utama Tab Navigasi & Feed Daftar Mutasi */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm space-y-4">
        {/* Bilah Tab Kategori Status Mutasi & Input Pencarian */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
          {/* Tombol Tab Pilihan Status */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Semua Mutasi ({summary?.totalBankMutations || 0})
            </button>
            <button
              onClick={() => setActiveTab('MATCHED')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'MATCHED'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Cocok ({summary?.matchedCount || 0})
            </button>
            <button
              onClick={() => setActiveTab('AMBIGUOUS')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'AMBIGUOUS'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Perlu Ditinjau ({(summary?.ambiguousCount || 0) + (summary?.duplicateAlertsCount || 0)})
            </button>
            <button
              onClick={() => setActiveTab('UNMATCHED_BANK')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'UNMATCHED_BANK'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Bank Belum Dicatat ({summary?.unmatchedBankCount || 0})
            </button>
            <button
              onClick={() => setActiveTab('UNMATCHED_INTERNAL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'UNMATCHED_INTERNAL'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Kas Tanpa Bank ({summary?.unmatchedInternalCount || 0})
            </button>
          </div>

          {/* Kolom Pencarian Kata Kunci */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari deskripsi / nominal..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Tab 5: Transaksi Kas Internal yang Belum Memiliki Pasangan Mutasi Bank */}
        {activeTab === 'UNMATCHED_INTERNAL' ? (
          <div>
            {(summary?.unmatchedInternalTransactions || []).length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">
                Semua transaksi kas internal telah memiliki bukti mutasi bank yang cocok!
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {(summary?.unmatchedInternalTransactions || []).map((t) => (
                  <div key={t.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        t.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                      }`}>
                        {t.type === 'INCOME' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {t.category}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span>Ref: {t.reference}</span>
                          <span>-</span>
                          <span>{t.createdAt.split('T')[0]}</span>
                          {t.notes && <span className="italic truncate max-w-xs text-slate-400">({t.notes})</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-bold text-sm ${t.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                        {t.type === 'INCOME' ? '+ ' : '- '}
                        Rp {t.amount.toLocaleString('id-ID')}
                      </div>
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                        Menunggu Rekening Koran
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Daftar Baris Mutasi Rekening Koran Bank */
          <div>
            {isLoading ? (
              <div className="text-center py-12 text-xs text-slate-400 animate-pulse">
                Memuat data mutasi bank...
              </div>
            ) : filteredBankStatements.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-xs space-y-3">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  {summary?.totalBankMutations === 0
                    ? 'Belum ada data mutasi rekening bank yang diimpor.'
                    : 'Tidak ada mutasi yang cocok dengan kriteria filter.'}
                </p>
                {summary?.totalBankMutations === 0 && isManagerOrAdmin && (
                  <button
                    onClick={() => setShowImportCard(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-semibold text-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Impor Rekening Koran Sekarang
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredBankStatements.map((b) => {
                  const isCredit = b.direction === 'CREDIT';
                  return (
                    <div key={b.id} className="py-4 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        {/* Informasi Mutasi Bank */}
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isCredit
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}>
                            {isCredit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                          </div>

                          <div className="space-y-0.5">
                            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                              {b.description}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                              <span>Baris #{b.sourceRowNumber}</span>
                              <span> </span>
                              <span>{b.transactionDate}</span>
                              {b.externalReference && (
                                <>
                                  <span> </span>
                                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                                    Ref: {b.externalReference}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Nominal & Status Pencocokan */}
                        <div className="text-right space-y-1">
                          <div className={`font-extrabold text-sm ${
                            isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                          }`}>
                            {isCredit ? '+ ' : '- '}
                            Rp {b.amount.toLocaleString('id-ID')}
                          </div>
                          <div className="flex items-center justify-end gap-1.5">
                            {getStatusBadge(b.matchStatus)}
                            {getRuleBadge(b.ruleCode)}
                          </div>
                        </div>
                      </div>

                      {/* Kartu Transaksi Kas yang Berhasil Tercocokkan */}
                      {b.matchStatus === 'MATCHED' && b.transaction && (
                        <div className="ml-12 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-slate-600 dark:text-slate-300">
                              Tercocokkan ke kas internal:{' '}
                              <strong className="text-slate-900 dark:text-white">{b.transaction.category}</strong>{' '}
                              ({b.transaction.reference || b.transaction.id.slice(0, 8)})
                            </span>
                          </div>
                          <span className="text-slate-400 font-mono text-[11px]">
                            Rp {b.transaction.amount.toLocaleString('id-ID')}
                          </span>
                        </div>
                      )}

                      {/* Peringatan Kandidat Ambiguitas & Tombol Tindakan Manual */}
                      {(b.matchStatus === 'AMBIGUOUS' || b.matchStatus === 'DUPLICATE_POTENTIAL') && (
                        <div className="ml-12 p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                              <HelpCircle className="w-4 h-4" />
                              Ditemukan {b.candidateTransactions?.length || 0} transaksi kas yang berpotensi cocok:
                            </span>
                            {isManagerOrAdmin && (
                              <button
                                onClick={() => setSelectedBankItem(b)}
                                className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-sm transition-colors"
                              >
                                Cocokkan Manual
                              </button>
                            )}
                          </div>
                          {b.candidateTransactions && b.candidateTransactions.length > 0 && (
                            <div className="space-y-1">
                              {b.candidateTransactions.map((c) => (
                                <div key={c.id} className="text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between py-1 border-t border-amber-200/40 dark:border-amber-900/40">
                                  <span>{c.category} ({c.reference})</span>
                                  <span className="font-mono">Rp {c.amount.toLocaleString('id-ID')} • {c.createdAt.split('T')[0]}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Aksi Tambah Transaksi untuk Mutasi yang Belum Ada di Kas */}
                      {b.matchStatus === 'UNMATCHED' && isManagerOrAdmin && (
                        <div className="ml-12 flex items-center justify-between text-xs text-slate-500 pt-1">
                          <span className="text-slate-400">
                            Mutasi ini belum tercatat pada draf kas bersama.
                          </span>
                          <button
                            onClick={() => {
                              setCreateTxBankItem(b);
                              setNewTxCategory(b.description.slice(0, 30));
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold transition-colors"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            + Catat ke Buku Kas
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Modal Interaktif Pencocokan Manual (Manual Match Modal) */}
      {selectedBankItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 space-y-4 shadow-2xl border border-slate-300 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Pencocokan Manual Rekonsiliasi
                </h3>
              </div>
              <button
                onClick={() => setSelectedBankItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 text-xs space-y-1">
              <div className="text-slate-400">Mutasi Rekening Bank:</div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {selectedBankItem.description}
              </div>
              <div className="text-indigo-600 dark:text-indigo-400 font-semibold">
                Rp {selectedBankItem.amount.toLocaleString('id-ID')} • {selectedBankItem.transactionDate}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pilih Transaksi Kas Internal:
              </label>
              <select
                value={selectedTxId}
                onChange={(e) => setSelectedTxId(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Pilih Transaksi yang Cocok --</option>
                {selectedBankItem.candidateTransactions?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.category} - Rp {c.amount.toLocaleString('id-ID')} ({c.reference}) [{c.createdAt.split('T')[0]}]
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Alasan Pencocokan Manual (Wajib Audit):
              </label>
              <textarea
                value={manualMatchReason}
                onChange={(e) => setManualMatchReason(e.target.value)}
                rows={3}
                placeholder="Contoh: Dikonfirmasi melalui bukti transfer screenshot WhatsApp dari anggota/keluarga..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-400">
                Peraturan audit mewajibkan pencatatan alasan, pelaku, dan waktu pencocokan manual ke rantai audit SHA-256.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedBankItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleManualMatchSubmit}
                disabled={isSubmittingMatch || !selectedTxId || manualMatchReason.trim().length < 5}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors"
              >
                {isSubmittingMatch ? 'Menyimpan...' : 'Simpan Pencocokan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Pembuatan Transaksi Baru dari Mutasi Bank */}
      {createTxBankItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Catat Kas dari Mutasi Bank
                </h3>
              </div>
              <button
                onClick={() => setCreateTxBankItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 text-xs space-y-1">
              <div className="text-slate-400">Mutasi Rekening Bank:</div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {createTxBankItem.description}
              </div>
              <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Rp {createTxBankItem.amount.toLocaleString('id-ID')} ({createTxBankItem.direction})
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Kategori Transaksi Kas:
              </label>
              <input
                type="text"
                value={newTxCategory}
                onChange={(e) => setNewTxCategory(e.target.value)}
                placeholder="Contoh: Setoran Kas Bersama, Tabungan Rutin, Donasi..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Catatan Tambahan:
              </label>
              <input
                type="text"
                value={newTxNotes}
                onChange={(e) => setNewTxNotes(e.target.value)}
                placeholder="Keterangan tambahan untuk pembukuan kas..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCreateTxBankItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleCreateTxSubmit}
                disabled={isCreatingTx || !newTxCategory.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors"
              >
                {isCreatingTx ? 'Menyimpan...' : 'Buat Transaksi Kas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
