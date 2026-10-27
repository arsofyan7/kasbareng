import React, { useState, useEffect } from 'react';
import { useWallet } from '../../context/WalletContext';
import { WalletPreview, ApiResponse } from '../../types';
import { X, KeyRound, Users, ShieldCheck, AlertCircle, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

interface JoinWalletModalProps {
  isOpen: boolean;
  initialCode?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const JoinWalletModal: React.FC<JoinWalletModalProps> = ({
  isOpen,
  initialCode = '',
  onClose,
  onSuccess,
}) => {
  const { joinWallet } = useWallet();
  const [code, setCode] = useState(initialCode);
  const [preview, setPreview] = useState<WalletPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync initialCode when modal opens
  useEffect(() => {
    if (initialCode) {
      handleCodeChange(initialCode);
    }
  }, [initialCode, isOpen]);

  if (!isOpen) return null;

  // Extract clean code if a URL was pasted
  const extractCode = (input: string): string => {
    let clean = input.trim();
    if (clean.includes('join=')) {
      const match = clean.match(/join=([A-Za-z0-9_-]+)/);
      if (match) return match[1].toUpperCase();
    }
    if (clean.includes('/join/')) {
      const parts = clean.split('/join/');
      if (parts[1]) return parts[1].split(/[?#&]/)[0].toUpperCase();
    }
    return clean.toUpperCase();
  };

  const handleCodeChange = async (val: string) => {
    const clean = extractCode(val);
    setCode(clean);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (clean.length >= 4) {
      setIsLoadingPreview(true);
      try {
        const res = await fetch(`/api/v1/wallets/preview-invite/${clean}`);
        const json: ApiResponse<WalletPreview> = await res.json();
        if (res.ok && json.data) {
          setPreview(json.data);
          setErrorMsg(null);
        } else {
          setPreview(null);
          setErrorMsg(json.error?.message || 'Kode undangan tidak valid.');
        }
      } catch (err) {
        setPreview(null);
      } finally {
        setIsLoadingPreview(false);
      }
    } else {
      setPreview(null);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMsg('Masukkan kode akses atau undangan.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const joined = await joinWallet(code.trim());
      setSuccessMsg(`Selamat datang di ${joined.name}!`);
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal bergabung ke dompet kas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Gabung Kas Bersama
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Akses tertutup dengan kode undangan
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

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Kode Undangan atau Kode Akses
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="Contoh: KELUARGA-KITA atau KAS-8X92"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="w-full px-3.5 py-2.5 uppercase font-mono tracking-wider rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all pr-10"
              />
              {isLoadingPreview && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              Dapatkan kode ini dari Admin atau pembuat dompet kas Anda.
            </p>
          </div>

          {/* Live Community Preview Card */}
          {preview && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Dompet Kas Ditemukan
                  </span>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                    {preview.name}
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                  {preview.currency}
                </span>
              </div>

              {preview.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {preview.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{preview.memberCount} Warga Terdaftar</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Role: <strong>WARGA</strong></span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !code.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Bergabung...</span>
                </>
              ) : (
                <>
                  <span>Gabung Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
