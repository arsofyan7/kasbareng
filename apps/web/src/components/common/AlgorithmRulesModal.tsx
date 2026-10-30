/**
 * ============================================================================
 * AlgorithmRulesModal.tsx - Modal Showcase Algoritma & Tata Kelola Kasbareng
 * ============================================================================
 * Komponen modal edukatif yang menampilkan transparansi fondasi teknis platform:
 * 1. Tata Kelola Kuorum M-of-N: Menampilkan jumlah persetujuan minimal pengurus aktif,
 *    aturan anti-self approval, dan hak akses peran pengguna.
 * 2. Rantai Audit Kriptografis SHA-256 (Hash Chain): Penjelasan audit trail anti-tamper,
 *    status integritas hash, dan tombol pintas ke simulator inspeksi audit.
 * 3. Buku Kas Ganda (Double-Entry Ledger): Prinsip pemisahan saldo riil (posted) vs
 *    dana yang dicadangkan sementara (reserved balance).
 * 4. Rekonsiliasi Bank 3-Pass: Pencocokan mutasi rekening koran secara deterministik.
 */

import React from 'react';
import { useWallet } from '../../context/WalletContext';
import {
  X,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Scale,
  FileCheck2,
} from 'lucide-react';

/**
 * Interface properti AlgorithmRulesModal
 */
interface AlgorithmRulesModalProps {
  isOpen: boolean;                      // Status visibilitas modal
  onClose: () => void;                  // Callback penutupan modal
  onOpenAuditChain?: () => void;        // Callback membuka modal rantai audit SHA-256
}

export const AlgorithmRulesModal: React.FC<AlgorithmRulesModalProps> = ({
  isOpen,
  onClose,
  onOpenAuditChain,
}) => {
  // Mengambil konteks dompet aktif untuk membaca parameter kuorum M-of-N
  const { activeWallet } = useWallet();

  // Jika status terbuka bernilai false, jangan render ke DOM
  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // RENDER UI MODAL SHOWCASE ALGORITMA
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl p-6 sm:p-7 space-y-6 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto my-auto">
        
        {/* HEADER MODAL: Ikon CPU & Penjelasan Singkat */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/40">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Fitur Algoritma & Tata Kelola
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pondasi matematis & kriptografis transparansi kas bersama
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KARTU 1: Parameter Kuorum M-of-N & Kebijakan Kas Dompet Aktif */}
        {activeWallet ? (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-300 dark:border-emerald-700/80 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Aturan Kas Bersama (Kuorum M-of-N)
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                {activeWallet.name}
              </span>
            </div>

            {/* Grid Kartu Syarat Kuorum & Peran Pengguna */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/60">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                  Syarat Persetujuan Pengeluaran
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  {activeWallet.requiredApprovals} dari {activeWallet.memberCount} Anggota
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/60">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                  Peran Anda di Dompet Ini
                </span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {activeWallet.myRole}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Transaksi pengeluaran dana kas bersama wajib disetujui oleh minimal{' '}
              <strong>{activeWallet.requiredApprovals} pengurus yang sah</strong>. Sistem menerapkan
              evaluasi kuorum dinamis dengan perlindungan <em>anti-self approval</em> untuk mencegah
              pencairan dana sepihak.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center">
            Pilih dompet kas aktif untuk melihat aturan kuorum spesifik kas bersama.
          </div>
        )}

        {/* KARTU 2: Rantai Audit Kriptografis SHA-256 (Hash Chain Anti-Tamper) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-indigo-950/30 dark:to-slate-900/50 border border-indigo-300 dark:border-indigo-700/80 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                Audit Rantai SHA-256 (Kriptografis)
              </span>
            </div>
            {/* Lencana Status Validitas Rantai Hash */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Rantai Hash Valid
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Setiap aksi penting (pembuatan kas, draf, persetujuan kuorum, pembukuan, hingga verifikasi iuran warga)
            disegel ke dalam <strong>rantai hash kriptografis SHA-256</strong> yang saling mengunci secara sekuensial.
            Manipulasi data ilegal langsung merusak integritas hash dan terdeteksi seketika.
          </p>

          {/* Tombol Pemicu Membuka Modal Simulator Audit SHA-256 */}
          {onOpenAuditChain && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuditChain();
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer group"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Buka Simulator & Inspeksi Audit SHA-256</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        {/* KARTU 3: Algoritma Tambahan (Double-Entry Ledger & Bank Reconciliation) */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
            Algoritma Inti Platform Lainnya
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Sorotan: Double-Entry Ledger */}
            <div className="p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-start gap-2.5">
              <Scale className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  Double-Entry Ledger
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pemisahan Saldo Tercatat (*Posted*) vs Dana Terkunci (*Reserved*).
                </span>
              </div>
            </div>

            {/* Sorotan: 3-Pass Bank Reconciliation */}
            <div className="p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-start gap-2.5">
              <FileCheck2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  Rekonsiliasi 3-Pass Bank
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pencocokan mutasi bank otomatis tanpa tebakan probabilistik.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER MODAL */}
        <div className="pt-2 flex justify-end border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

