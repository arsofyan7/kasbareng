import React from 'react';
import { Users2, ChevronRight } from 'lucide-react';
import { WalletMember } from '../../types';

interface MemberDonutWidgetProps {
  members: WalletMember[];
  isLoading: boolean;
  onNavigateToMembers: () => void;
}

export const MemberDonutWidget: React.FC<MemberDonutWidgetProps> = ({
  members,
  isLoading,
  onNavigateToMembers,
}) => {
  const activeCount = members.filter((m) => m.status === 'ACTIVE').length;
  const inactiveCount = members.filter((m) => m.status === 'INACTIVE').length;
  const pendingCount = 0; // Default placeholder for pending applicant quorum
  const totalCount = members.length;

  // SVG Donut geometry
  const radius = 42;
  const circumference = 2 * Math.PI * radius; // ~263.89

  // Calculate stroke lengths
  const activeLength = totalCount > 0 ? (activeCount / totalCount) * circumference : circumference;
  const pendingLength = totalCount > 0 ? (pendingCount / totalCount) * circumference : 0;
  const inactiveLength = totalCount > 0 ? (inactiveCount / totalCount) * circumference : 0;

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
      {/* Header */}
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

        <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-1 rounded-xl border border-sky-300 dark:border-sky-700 shadow-xs">
          {totalCount} Anggota
        </span>
      </div>

      {/* Donut Chart & Legend Row */}
      <div className="flex items-center justify-around gap-4 py-1">
        {/* SVG Donut Circle */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            {/* Background Track */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              strokeWidth="14"
              className="stroke-slate-100 dark:stroke-slate-800"
            />

            {/* Active Slice (Emerald) */}
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

            {/* Inactive Slice (Red/Rose) */}
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

          {/* Center Text (Counter) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-none">
              {isLoading ? '...' : totalCount}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Total Anggota
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="space-y-2.5 text-xs">
          {/* Active */}
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {activeCount}
            </span>
            <span className="text-slate-500 dark:text-slate-400">Aktif</span>
          </div>

          {/* Pending */}
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {pendingCount}
            </span>
            <span className="text-slate-500 dark:text-slate-400">Menunggu</span>
          </div>

          {/* Inactive */}
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {inactiveCount}
            </span>
            <span className="text-slate-500 dark:text-slate-400">Nonaktif</span>
          </div>
        </div>
      </div>

      {/* Footer Navigation Action */}
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
