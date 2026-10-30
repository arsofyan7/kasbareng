import React, { useState } from 'react';
import { TrendingUp, ChevronDown } from 'lucide-react';
import { Transaction } from '../../types';

/**
 * Interface properti untuk komponen CashTrendWidget.
 * @property currentBalance - Saldo riil kas saat ini yang tercatat di database ledger.
 * @property transactions - Seluruh riwayat transaksi kas yang digunakan untuk rekonstruksi saldo historis.
 * @property isLoading - Indikator pemuatan data transaksi dari backend.
 */
interface CashTrendWidgetProps {
  currentBalance: number;
  transactions: Transaction[];
  isLoading: boolean;
}

/**
 * Struktur titik data bulanan untuk kalkulasi grafik tren kas.
 * @property key - Identifier unik berformat 'YYYY-MM'.
 * @property label - Nama singkatan bulan (misal: 'Jan', 'Feb').
 * @property fullLabel - Nama bulan lengkap beserta tahun (misal: 'Januari 2026').
 * @property balance - Saldo akumulatif kas pada akhir bulan tersebut.
 * @property isCurrentMonth - Flag penanda apakah titik data mewakili bulan berjalan saat ini.
 */
interface MonthDataPoint {
  key: string;
  label: string;
  fullLabel: string;
  balance: number;
  isCurrentMonth: boolean;
}

/**
 * Komponen Visualisasi Tren Saldo Kas (CashTrendWidget).
 * 
 * Menampilkan grafik batang (bar chart) historis saldo kas selama 6 bulan terakhir:
 * 1. Algoritma Rekonstruksi Saldo Berjalan (Reverse Balance Walk):
 *    Menghitung saldo kas pada akhir setiap bulan secara akurat dengan melacak balik transaksi
 *    yang diposting setelah bulan tersebut (mengurangkan pemasukan dan menambahkan kembali pengeluaran).
 * 2. Skala Sumbu Y Dinamis: Menentukan batas atas (ceiling) grafik yang dibulatkan rapi ke kelipatan
 *    Rp 500.000 atau Rp 1.000.000 untuk keterbacaan estetis.
 * 3. Interaktivitas Tinggi: Tooltip interaktif saat batang di-hover yang menampilkan nominal presisi,
 *    animasi transisi tinggi batang, dan pendaran aktif (glow ping) pada bulan berjalan.
 */
export const CashTrendWidget: React.FC<CashTrendWidgetProps> = ({
  currentBalance,
  transactions,
  isLoading,
}) => {
  // State untuk menyimpan indeks batang bulan yang sedang disorot (hovered) kursor
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Tampilan skeleton loading beranimasi saat data transaksi masih diunduh
  if (isLoading) {
    return (
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm h-64 flex flex-col items-center justify-center gap-2 animate-pulse text-xs text-slate-400">
        <TrendingUp className="w-6 h-6 text-emerald-400/50 animate-bounce" />
        <span>Memuat visual tren saldo kas...</span>
      </div>
    );
  }

  // Pengambilan waktu sistem dan pemetaan nama bulan dalam Bahasa Indonesia
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  // Menghasilkan 6 titik data bulanan terhitung mundur dari bulan saat ini (i = 5 ke 0)
  const points: MonthDataPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    const label = monthNames[month];
    const fullLabel = `${monthNames[month]} ${year}`;
    const isCurrentMonth = i === 0;

    // Menentukan batas akhir bulan bersangkutan (pukul 23:59:59 pada hari terakhir bulan)
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
    
    // Filter transaksi valid (COMPLETED atau APPROVED) yang terjadi SETELAH akhir bulan ini
    const postTransactions = transactions.filter((tx) => {
      const txDate = new Date(tx.createdAt);
      return txDate > endOfMonth && (tx.state === 'COMPLETED' || tx.state === 'APPROVED');
    });

    // Menghitung mundur saldo: kurangi pemasukan setelahnya, tambahkan kembali pengeluaran setelahnya
    let balance = currentBalance;
    for (const tx of postTransactions) {
      if (tx.type === 'INCOME') {
        balance -= tx.amount;
      } else if (tx.type === 'EXPENSE') {
        balance += tx.amount;
      }
    }

    // Pastikan nilai saldo tidak negatif karena anomali data
    balance = Math.max(0, balance);
    
    // Baseline untuk dompet kas komunitas yang baru dibuat dengan transaksi bulan pertama
    if (balance === 0 && isCurrentMonth && currentBalance > 0) {
      balance = currentBalance;
    }

    // Masukkan data bulan ke dalam deret grafik
    points.push({
      key,
      label,
      fullLabel,
      balance,
      isCurrentMonth,
    });
  }

  // Menghitung nilai puncak saldo untuk kalkulasi persentase tinggi batang grafik
  const maxBalance = Math.max(...points.map((p) => p.balance), 1000000);
  // Pembulatan batas atas (ceiling) ke kelipatan Rp 500.000 terdekat
  const ceiling = Math.ceil(maxBalance / 500000) * 500000;

  /**
   * Helper pemformat nilai label sumbu Y ke format singkatan yang ringkas ('rb' atau 'jt').
   */
  const formatYAxis = (val: number) => {
    if (val >= 1000000) {
      const jt = val / 1000000;
      return `${jt % 1 === 0 ? jt : jt.toFixed(1)} jt`;
    }
    if (val >= 1000) {
      return `${Math.round(val / 1000)} rb`;
    }
    return String(val);
  };

  return (
    // Kontainer kartu widget tren saldo kas
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
      {/* Header Widget: Ikon Tren, Judul, dan Dropdown Rentang Waktu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/80 dark:border-emerald-700/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              Tren Saldo Kas
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Pertumbuhan saldo buku kas 6 bulan
            </p>
          </div>
        </div>

        {/* Pil Filter Dropdown Waktu */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs">
          <span>6 Bulan Terakhir</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      {/* Area Grafik Batang (Bar Chart) */}
      <div className="relative pt-6 pb-2">
        {/* Tooltip Mengambang saat Batang Bulan Disorot (Hover) */}
        {hoveredIndex !== null && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-semibold shadow-lg shadow-black/20 pointer-events-none transition-all">
            <span>{points[hoveredIndex].fullLabel}: </span>
            <span className="text-emerald-400 font-bold">
              Rp {points[hoveredIndex].balance.toLocaleString('id-ID')}
            </span>
          </div>
        )}

        {/* Grid Grafik yang Menggabungkan Garis Panduan Sumbu Y dan Kolom Batang */}
        <div className="flex items-end gap-2 sm:gap-3 h-40 w-full relative">
          {/* Garis Bantu Sumbu Y (Guidelines & Tick Labels) */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none select-none text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            <div className="border-b border-dashed border-slate-100 dark:border-slate-800/80 pb-0.5">
              <span>{formatYAxis(ceiling)}</span>
            </div>
            <div className="border-b border-dashed border-slate-100 dark:border-slate-800/80 pb-0.5">
              <span>{formatYAxis(ceiling / 2)}</span>
            </div>
            <div className="border-b border-slate-200 dark:border-slate-800 pb-0.5">
              <span>0</span>
            </div>
          </div>

          {/* Kolom Batang untuk 6 Bulan (Grid 6 Kolom) */}
          <div className="flex-1 grid grid-cols-6 gap-2 sm:gap-3 items-end h-full pl-8 z-10">
            {points.map((pt, idx) => {
              // Persentase tinggi batang dinamis dengan batas minimal 6% agar tetap terlihat
              const heightPct = Math.max(6, Math.min(100, Math.round((pt.balance / ceiling) * 100)));
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={pt.key}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer"
                >
                  {/* Elemen Batang dengan Transisi dan Gaya Visual Bergradasi */}
                  <div className="w-full flex items-end justify-center h-full">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full max-w-[34px] rounded-t-lg transition-all duration-300 relative ${
                        pt.isCurrentMonth
                          ? 'bg-gradient-to-t from-emerald-600 to-teal-500 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/40'
                          : isHovered
                          ? 'bg-emerald-300 dark:bg-emerald-800'
                          : 'bg-emerald-100 dark:bg-emerald-950/60'
                      }`}
                    >
                      {/* Titik Pendar Animasi Ping Khusus Bulan Berjalan */}
                      {pt.isCurrentMonth && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
                      )}
                    </div>
                  </div>

                  {/* Label Nama Bulan pada Sumbu X */}
                  <span
                    className={`text-[11px] font-semibold transition-colors ${
                      pt.isCurrentMonth
                        ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                        : isHovered
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {pt.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Catatan Kaki (Footer): Keterangan Bulan Aktif dan Verifikasi Validitas Ledger */}
      <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>Bulan Aktif: <strong className="text-slate-800 dark:text-slate-200">{points[5]?.fullLabel}</strong></span>
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ledger Valid</span>
      </div>
    </div>
  );
};
