import React, { useState } from 'react';
import { CalendarDays, ChevronRight, CheckCircle2, Clock, ChevronDown } from 'lucide-react';
import { DuesBoardResult } from '../../types';

interface MiniDuesWidgetProps {
  duesBoard: DuesBoardResult | null;
  isLoading: boolean;
  onNavigateToDues: () => void;
}

export const MiniDuesWidget: React.FC<MiniDuesWidgetProps> = ({
  duesBoard,
  isLoading,
  onNavigateToDues,
}) => {
  // Determine current period or default to the latest period
  const periods = duesBoard?.periods || [];
  const currentDateKey = new Date().toISOString().slice(0, 7); // e.g. "2026-10"

  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>(() => {
    if (periods.length === 0) return currentDateKey;
    const match = periods.find((p) => p.key === currentDateKey);
    return match ? match.key : periods[periods.length - 1].key;
  });

  const activePeriod = periods.find((p) => p.key === selectedPeriodKey) || periods[0];
  const members = duesBoard?.members || [];
  const totalMembers = members.length;

  const paidMembers = activePeriod
    ? members.filter((m) => m.records[activePeriod.key]?.status === 'PAID').length
    : 0;
  const unpaidMembers = Math.max(0, totalMembers - paidMembers);
  const compliancePercent = totalMembers > 0 ? Math.round((paidMembers / totalMembers) * 100) : 0;

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
      {/* Header with Title and Period Dropdown */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              Papan Iuran Bulan Ini
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Kepatuhan iuran warga aktif
            </p>
          </div>
        </div>

        {/* Month Selector Pill */}
        {periods.length > 0 ? (
          <div className="relative">
            <select
              value={activePeriod?.key || selectedPeriodKey}
              onChange={(e) => setSelectedPeriodKey(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-semibold py-1.5 pl-3 pr-7 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              {periods.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
          </div>
        ) : (
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Progress Bar Section */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-slate-600 dark:text-slate-400">
            {isLoading ? 'Memuat data...' : `${paidMembers} dari ${totalMembers} anggota`}
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
            {compliancePercent}%
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${compliancePercent}%` }}
          />
        </div>
      </div>

      {/* 2 Status Sub-Boxes */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* Box 1: Sudah Membayar */}
        <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-none">
              {isLoading ? '...' : paidMembers}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Sudah membayar
            </div>
          </div>
        </div>

        {/* Box 2: Belum Membayar */}
        <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-none">
              {isLoading ? '...' : unpaidMembers}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Belum membayar
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation Action */}
      <div className="pt-1 flex justify-end">
        <button
          type="button"
          onClick={onNavigateToDues}
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 group cursor-pointer transition-colors"
        >
          <span>Lihat Detail Papan Iuran</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
