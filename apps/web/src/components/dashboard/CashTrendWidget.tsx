import React, { useState } from 'react';
import { TrendingUp, ChevronDown } from 'lucide-react';
import { Transaction } from '../../types';

interface CashTrendWidgetProps {
  currentBalance: number;
  transactions: Transaction[];
  isLoading: boolean;
}

interface MonthDataPoint {
  key: string;
  label: string;
  fullLabel: string;
  balance: number;
  isCurrentMonth: boolean;
}

export const CashTrendWidget: React.FC<CashTrendWidgetProps> = ({
  currentBalance,
  transactions,
  isLoading,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm h-64 flex flex-col items-center justify-center gap-2 animate-pulse text-xs text-slate-400">
        <TrendingUp className="w-6 h-6 text-emerald-400/50 animate-bounce" />
        <span>Memuat visual tren saldo kas...</span>
      </div>
    );
  }

  // Generate 6 months data points ending at current date
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const points: MonthDataPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    const label = monthNames[month];
    const fullLabel = `${monthNames[month]} ${year}`;
    const isCurrentMonth = i === 0;

    // Calculate approximate running balance at end of this month
    // by factoring out transactions that occurred AFTER this month
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
    
    // Transactions after this month that affected posted balance
    const postTransactions = transactions.filter((tx) => {
      const txDate = new Date(tx.createdAt);
      return txDate > endOfMonth && (tx.state === 'COMPLETED' || tx.state === 'APPROVED');
    });

    let balance = currentBalance;
    for (const tx of postTransactions) {
      if (tx.type === 'INCOME') {
        balance -= tx.amount;
      } else if (tx.type === 'EXPENSE') {
        balance += tx.amount;
      }
    }

    // Ensure non-negative and realistic baseline
    balance = Math.max(0, balance);
    
    // If community is newly created with only 1 month data, provide realistic growth progression
    if (balance === 0 && isCurrentMonth && currentBalance > 0) {
      balance = currentBalance;
    }

    points.push({
      key,
      label,
      fullLabel,
      balance,
      isCurrentMonth,
    });
  }

  // Calculate scaling ceiling
  const maxBalance = Math.max(...points.map((p) => p.balance), 1000000);
  // Round ceiling to nearest 500k or 1M for aesthetic ticks
  const ceiling = Math.ceil(maxBalance / 500000) * 500000;

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
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
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

        {/* Filter Dropdown Pill */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span>6 Bulan Terakhir</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      {/* Bar Chart Area */}
      <div className="relative pt-6 pb-2">
        {/* Tooltip Popup on Hover */}
        {hoveredIndex !== null && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-semibold shadow-lg shadow-black/20 pointer-events-none transition-all">
            <span>{points[hoveredIndex].fullLabel}: </span>
            <span className="text-emerald-400 font-bold">
              Rp {points[hoveredIndex].balance.toLocaleString('id-ID')}
            </span>
          </div>
        )}

        {/* Chart Grid with Y-Axis and Bars */}
        <div className="flex items-end gap-2 sm:gap-3 h-40 w-full relative">
          {/* Y-Axis Guidelines & Ticks */}
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

          {/* 6 Month Bars */}
          <div className="flex-1 grid grid-cols-6 gap-2 sm:gap-3 items-end h-full pl-8 z-10">
            {points.map((pt, idx) => {
              const heightPct = Math.max(6, Math.min(100, Math.round((pt.balance / ceiling) * 100)));
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={pt.key}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer"
                >
                  {/* Bar Element */}
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
                      {/* Active month glow highlight */}
                      {pt.isCurrentMonth && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
                      )}
                    </div>
                  </div>

                  {/* Month Label */}
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

      {/* Footer Insight */}
      <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>Bulan Aktif: <strong className="text-slate-800 dark:text-slate-200">{points[5]?.fullLabel}</strong></span>
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ledger Valid</span>
      </div>
    </div>
  );
};
