import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { AuditLog, AuditVerificationResult } from '../../types';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Code2,
  Bug,
  RotateCcw,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AuditChainModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditChainModal: React.FC<AuditChainModalProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const { activeWallet } = useWallet();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [verification, setVerification] = useState<AuditVerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [expandedPayloadSeq, setExpandedPayloadSeq] = useState<number | null>(null);

  // Drill states
  const [showDrillPanel, setShowDrillPanel] = useState(false);
  const [isTampering, setIsTampering] = useState(false);
  const [tamperedOriginalPayload, setTamperedOriginalPayload] = useState<string | null>(null);
  const [tamperedSeq, setTamperedSeq] = useState<number | null>(null);

  const isAdmin = activeWallet?.myRole === 'ADMIN';

  const loadLogsAndVerify = useCallback(async () => {
    if (!isOpen || !activeWallet || !token) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch audit logs
      const logsRes = await fetch(`/api/v1/wallets/${activeWallet.id}/audit/events?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const logsJson = await logsRes.json();
      if (!logsRes.ok) throw new Error(logsJson.error?.message || 'Gagal memuat log audit.');
      setLogs(logsJson.data || []);

      // 2. Fetch verification status
      const verifyRes = await fetch(`/api/v1/wallets/${activeWallet.id}/audit/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyJson.error?.message || 'Gagal memverifikasi rantai audit.');
      setVerification(verifyJson.data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, activeWallet?.id, token]);

  useEffect(() => {
    if (isOpen) {
      loadLogsAndVerify();
    }
  }, [isOpen, loadLogsAndVerify]);

  if (!isOpen || !activeWallet) return null;

  const handleManualVerify = async () => {
    setIsVerifying(true);
    try {
      const verifyRes = await fetch(`/api/v1/wallets/${activeWallet.id}/audit/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const verifyJson = await verifyRes.json();
      setVerification(verifyJson.data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Tamper Simulation Drill
  const handleSimulateTamper = async () => {
    if (logs.length < 2) {
      alert('Dibutuhkan minimal 2 log audit untuk menguji simulasi manipulasi.');
      return;
    }

    const targetLog = logs[logs.length - 2]; // pick second to last
    setIsTampering(true);
    try {
      setTamperedOriginalPayload(JSON.stringify(targetLog.payload));
      setTamperedSeq(targetLog.sequenceNo);

      const malicious = JSON.stringify({
        ...targetLog.payload,
        metadata: {
          ...targetLog.payload?.metadata,
          amount: 999999999, // Altered nominal in DB directly!
          maliciousNote: 'ATTACKER_DIRECT_DB_INJECTION',
        },
      });

      await fetch(`/api/v1/wallets/${activeWallet.id}/audit/simulate-tamper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sequenceNo: targetLog.sequenceNo,
          maliciousPayload: malicious,
        }),
      });

      await handleManualVerify();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsTampering(false);
    }
  };

  const handleRepairTamper = async () => {
    if (!tamperedSeq || !tamperedOriginalPayload) return;

    setIsTampering(true);
    try {
      await fetch(`/api/v1/wallets/${activeWallet.id}/audit/repair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sequenceNo: tamperedSeq,
          restoredPayload: tamperedOriginalPayload,
        }),
      });

      setTamperedOriginalPayload(null);
      setTamperedSeq(null);
      await loadLogsAndVerify();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsTampering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Audit Rantai SHA-256 (Tamper-Evident)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pemeriksaan bukti kriptografis integritas data mutasi kas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 shrink-0">
            {errorMsg}
          </div>
        )}

        {/* Verification Status Banner */}
        {verification && (
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 ${
              verification.valid
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/80 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700/80 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {verification.valid ? (
                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h3 className="text-xs sm:text-sm font-bold">
                  {verification.valid
                    ? 'Rantai Audit SHA-256 Valid & Utuh'
                    : `Integritas Terlanggar pada Sequence #${verification.failedSequenceNo}!`}
                </h3>
                <p className="text-xs opacity-85 mt-0.5">
                  {verification.valid
                    ? `Total ${verification.totalEvents} peristiwa mutasi terhubung secara kriptografis tanpa modifikasi ilegal.`
                    : `${verification.errorMessage} (Data telah dimanipulasi di database langsung!)`}
                </p>
              </div>
            </div>

            <button
              onClick={handleManualVerify}
              disabled={isVerifying}
              className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              {isVerifying ? 'Menguji...' : 'Uji Sekarang'}
            </button>
          </div>
        )}

        {/* Drill Controls (Academic / Demo Testing) */}
        {isAdmin && (
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-xs shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Bug className="w-4 h-4 text-amber-500" />
                Simulasi Uji Manipulasi Database (Academic Drill)
              </span>
              <button
                type="button"
                onClick={() => setShowDrillPanel(!showDrillPanel)}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              >
                {showDrillPanel ? 'Sembunyikan' : 'Buka Pengujian'}
              </button>
            </div>

            {showDrillPanel && (
              <div className="pt-2.5 mt-2 border-t border-slate-300 dark:border-slate-700 space-y-2 text-slate-600 dark:text-slate-300">
                <p className="text-[11px] leading-relaxed">
                  Tombol ini mendemonstrasikan kemampuan <em>tamper-evidence</em>: mengubah data transaksi di database secara paksa tanpa memperbarui hash, lalu memicu verifier untuk membuktikan pelanggaran terdeteksi seketika.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  {!tamperedSeq ? (
                    <button
                      onClick={handleSimulateTamper}
                      disabled={isTampering}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {isTampering ? 'Menjalankan...' : 'Simulasikan Manipulasi Data'}
                    </button>
                  ) : (
                    <button
                      onClick={handleRepairTamper}
                      disabled={isTampering}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {isTampering ? 'Memulihkan...' : 'Kembalikan Data Asli (Pulihkan Rantai)'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit Log Chronology Feed */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Rantai Peristiwa ({logs.length} Blok)</span>
            <span>Urutan Kronologis</span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Memuat data rantai audit...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Belum ada peristiwa yang tercatat di rantai ini.
            </div>
          ) : (
            logs.map((log) => {
              const isExpanded = expandedPayloadSeq === log.sequenceNo;
              const isCorrupted =
                verification &&
                !verification.valid &&
                verification.failedSequenceNo === log.sequenceNo;

              return (
                <div
                  key={log.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isCorrupted
                      ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/80 hover:border-emerald-400 dark:hover:border-emerald-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold font-mono flex items-center justify-center">
                        #{log.sequenceNo}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                        {log.payload?.eventType || 'AUDIT_EVENT'}
                      </span>
                      {isCorrupted && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-300">
                          TITIK PELANGGARAN
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Hashes */}
                  <div className="mt-2.5 space-y-1 font-mono text-[11px] bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>Prev Hash (H<sub>n-1</sub>):</span>
                      <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[200px] sm:max-w-[280px]">
                        {log.previousHash.substring(0, 16)}...
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>Current Hash (H<sub>n</sub>):</span>
                      <div className="flex items-center gap-1">
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold truncate max-w-[180px] sm:max-w-[260px]">
                          {log.currentHash.substring(0, 16)}...
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(log.currentHash)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                          title="Salin Hash Lengkap"
                        >
                          {copiedHash === log.currentHash ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Payload toggle */}
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPayloadSeq(isExpanded ? null : log.sequenceNo)
                      }
                      className="text-[11px] font-semibold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1"
                    >
                      <Code2 className="w-3 h-3" />
                      {isExpanded ? 'Tutup Payload Kanonis' : 'Lihat Payload Kanonis'}
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <pre className="mt-2 p-2.5 rounded-xl bg-slate-900 text-slate-100 text-[10px] overflow-x-auto font-mono max-h-40">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
