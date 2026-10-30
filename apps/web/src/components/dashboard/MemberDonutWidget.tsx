import React from 'react';
import { Users2, ChevronRight } from 'lucide-react';
import { WalletMember } from '../../types';

/**
 * Interface properti untuk komponen MemberDonutWidget.
 * @property members - Daftar seluruh anggota yang tergabung dalam dompet kas aktif.
 * @property isLoading - Indikator status pemuatan data anggota dari server.
 * @property onNavigateToMembers - Callback fungsi navigasi langsung ke halaman manajemen anggota.
 */
interface MemberDonutWidgetProps {
  members: WalletMember[];
  isLoading: boolean;
  onNavigateToMembers: () => void;
}

/**
 * Komponen Visualisasi Distribusi Anggota (MemberDonutWidget).
 * 
 * Menampilkan diagram donat (SVG Donut Chart murni tanpa dependensi eksternal berat):
 * 1. Agregasi Status Keanggotaan: Membagi anggota kas menjadi Aktif (ACTIVE),
 *    Menunggu Persetujuan Kuorum (PENDING), dan Nonaktif (INACTIVE).
 * 2. Geometri SVG Dinamis: Menghitung keliling lingkaran (circumference) serta proporsi panjang
 *    goresan (stroke-dasharray & stroke-dashoffset) berdasarkan persentase anggota riil.
 * 3. Indikator Tengah & Legenda Interaktif: Menampilkan angka total di rongga tengah donat
 *    dan menyediakan tombol akses cepat (one-click jump) ke modul manajemen anggota.
 */
export const MemberDonutWidget: React.FC<MemberDonutWidgetProps> = ({
  members,
  isLoading,
  onNavigateToMembers,
}) => {
  // Menghitung jumlah anggota berstatus aktif
  const activeCount = members.filter((m) => m.status === 'ACTIVE').length;
  // Menghitung jumlah anggota berstatus nonaktif/dibekukan
  const inactiveCount = members.filter((m) => m.status === 'INACTIVE').length;
  // Placeholder slot untuk calon anggota yang menunggu kuorum persetujuan warga
  const pendingCount = 0;
  // Total keseluruhan anggota kas
  const totalCount = members.length;

  // Konfigurasi parameter geometri SVG Donut Chart
  const radius = 42;
  const circumference = 2 * Math.PI * radius; // Keliling lingkaran: ~263.89 unit

  // Menghitung panjang busur lingkaran (stroke length) proporsional untuk tiap segmen
  const activeLength = totalCount > 0 ? (activeCount / totalCount) * circumference : circumference;
  const pendingLength = totalCount > 0 ? (pendingCount / totalCount) * circumference : 0;
  const inactiveLength = totalCount > 0 ? (inactiveCount / totalCount) * circumference : 0;

  return (
    // Kontainer kartu widget donat ringkasan anggota
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
      {/* Header Widget: Ikon Grup Warga, Judul, dan Badge Total Anggota */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-300/80 dark:border-sky-700/80 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Users2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              Ringkasan Anggota
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Distribusi status keanggotaan kas
            </p>
          </div>
        </div>

        {/* Badge Pil Total Anggota */}
        <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-1 rounded-xl border border-sky-300 dark:border-sky-700 shadow-xs">
          {totalCount} Anggota
        </span>
      </div>

      {/* Baris Visual Donut Chart SVG & Legenda Status */}
      <div className="flex items-center justify-around gap-4 py-1">
        {/* Lingkaran Donut SVG */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            {/* Jalur Lingkaran Dasar (Background Track) */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              strokeWidth="14"
              className="stroke-slate-100 dark:stroke-slate-800"
            />

            {/* Irisan Busur Anggota Aktif (Warna Hijau Zamrud) */}
            {activeLength > 0 && (
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                strokeWidth="14"
                strokeDasharray={`${activeLength} ${circumference - activeLength}`}
                strokeDashoffset="0"
                strokeLinecap="round"
                className="stroke-emerald-500 dark:stroke-emerald-400 transition-all duration-700"
              />
            )}

            {/* Irisan Busur Anggota Nonaktif (Warna Merah Mawar) */}
            {inactiveLength > 0 && (
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                strokeWidth="14"
                strokeDasharray={`${inactiveLength} ${circumference - inactiveLength}`}
                strokeDashoffset={`-${activeLength + pendingLength}`}
                strokeLinecap="round"
                className="stroke-rose-500 dark:stroke-rose-400 transition-all duration-700"
              />
            )}
          </svg>

          {/* Teks Penanda Tengah (Center Counter Label) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-none">
              {isLoading ? '...' : totalCount}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Total Anggota
            </span>
          </div>
        </div>

        {/* Kolom Legenda Kategori Status Keanggotaan */}
        <div className="space-y-2.5 text-xs">
          {/* Status Aktif */}
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {activeCount}
            </span>
            <span className="text-slate-500 dark:text-slate-400">Aktif</span>
          </div>

          {/* Status Menunggu Verifikasi */}
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {pendingCount}
            </span>
            <span className="text-slate-500 dark:text-slate-400">Menunggu</span>
          </div>

          {/* Status Nonaktif / Diberhentikan */}
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {inactiveCount}
            </span>
            <span className="text-slate-500 dark:text-slate-400">Nonaktif</span>
          </div>
        </div>
      </div>

      {/* Footer Widget: Tombol Pintas Navigasi ke Modul Manajemen Anggota */}
      <div className="pt-1 flex justify-end">
        <button
          type="button"
          onClick={onNavigateToMembers}
          className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 group cursor-pointer transition-colors"
        >
          <span>Kelola Anggota</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
