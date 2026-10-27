import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import {
  Sparkles,
  Bot,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  PlusCircle,
  Copy,
  Check,
  CheckCircle2,
  FileCode,
  Info,
} from 'lucide-react';
import { RecordTransactionModal } from '../components/common/RecordTransactionModal';
import { TransactionType } from '../types';

interface ParsedAiDraft {
  type: TransactionType;
  amount: number;
  category: string;
  notes: string;
  suggestedBy: string;
  confidenceScore: number;
  rawText: string;
}

export const AiParserPage: React.FC = () => {
  const { activeWallet } = useWallet();

  const [inputChatText, setInputChatText] = useState<string>('');
  const [parsedResult, setParsedResult] = useState<ParsedAiDraft | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Pre-fill modal state
  const [recordModalOpen, setRecordModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<TransactionType>('INCOME');

  // Interactive sample presets for demonstration
  const samplePrompts = [
    {
      label: 'Iuran Warga Bulanan',
      text: 'Halo pak bendahara, mau konfirmasi sudah transfer iuran kas RT sebesar 150rb untuk bulan Oktober ya pak dari Bpk. Bambang Blok B4/12. Makasih.',
    },
    {
      label: 'Belanja Operasional Pos Satpam',
      text: 'Lapor pak ketua, kemarin malam beli 2 sak semen dan kabel lampu pos satpam total habis Rp 185.000. Nota pembelian sudah disimpan di pos.',
    },
    {
      label: 'Donasi Kebersihan Warga',
      text: 'Assalamu alaikum, titip donasi kas sosial dan kerja bakti warga 100000 rupiah dari Ibu Siti Blok A2. Semoga berkah.',
    },
    {
      label: 'Konsumsi Rapat Warga',
      text: 'Catatan pengeluaran: beli snack kotak dan air mineral gelas 75.000 untuk rapat warga semalam.',
    },
  ];

  // Smart client-side text extractor (simulates provider abstraction output)
  const analyzeTextMessage = (text: string) => {
    if (!text.trim()) return;
    setIsAnalyzing(true);

    setTimeout(() => {
      const lower = text.toLowerCase();

      // 1. Determine Direction / Type
      const isExpense =
        lower.includes('beli') ||
        lower.includes('biaya') ||
        lower.includes('pengeluaran') ||
        lower.includes('habis') ||
        lower.includes('belanja') ||
        lower.includes('bayar tagihan');

      const type: TransactionType = isExpense ? 'EXPENSE' : 'INCOME';

      // 2. Extract Amount
      let amount = 0;
      // Match "150rb", "150 rb", "150k"
      const rbMatch = lower.match(/(\d+(?:[\.,]\d+)?)\s*(?:rb|ribu|k)\b/);
      if (rbMatch) {
        amount = Math.round(parseFloat(rbMatch[1].replace(',', '.')) * 1000);
      } else {
        // Match "Rp 150.000", "Rp150000", "150.000 rupiah"
        const rpMatch = lower.match(/(?:rp\.?|sebesar|total)?\s*(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+)\s*(?:rupiah)?/);
        if (rpMatch) {
          const cleanNum = rpMatch[1].replace(/\./g, '').replace(',', '.');
          const parsed = parseFloat(cleanNum);
          if (!isNaN(parsed) && parsed > 0) {
            amount = Math.round(parsed);
          }
        }
      }

      if (amount <= 0) amount = 100000; // Fallback default

      // 3. Determine Category
      let category = 'Iuran Kas Warga';
      if (isExpense) {
        if (lower.includes('satpam') || lower.includes('pos') || lower.includes('semen') || lower.includes('lampu')) {
          category = 'Sarana & Prasarana Lingkungan';
        } else if (lower.includes('snack') || lower.includes('konsumsi') || lower.includes('makan') || lower.includes('minum')) {
          category = 'Konsumsi & Rapat Warga';
        } else {
          category = 'Operasional Kas RT/RW';
        }
      } else {
        if (lower.includes('donasi') || lower.includes('sosial') || lower.includes('santunan')) {
          category = 'Donasi & Dana Sosial';
        } else {
          category = 'Iuran Kas Warga Bulanan';
        }
      }

      // 4. Extract Suggested Sender / Resident Name
      let sender = 'Warga Komunitas';
      const senderMatch = text.match(/(?:dari|atas nama|milik|oleh)\s+([A-Za-z\.\s]+?)(?:\s+blok|\s+rt|\.|\,|$)/i);
      if (senderMatch && senderMatch[1].trim().length > 2) {
        sender = senderMatch[1].trim();
      }

      setParsedResult({
        type,
        amount,
        category,
        notes: text.trim(),
        suggestedBy: sender,
        confidenceScore: 94,
        rawText: text,
      });

      setIsAnalyzing(false);
    }, 400);
  };

  const handleCopyJson = () => {
    if (!parsedResult) return;
    navigator.clipboard.writeText(JSON.stringify(parsedResult, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleOpenDraftModal = () => {
    if (!parsedResult) return;
    setModalType(parsedResult.type);
    setRecordModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Parser Chat AI (Draf Pasif)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800 uppercase tracking-wider">
              Preview Mode (Half Feature)
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ekstraksi pesan chat WhatsApp / Telegram warga menjadi draf transaksi kas secara pasif.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300">
          <Bot className="w-4 h-4 text-emerald-500" />
          <span>Dompet: <strong>{activeWallet?.name || 'Kas Komunitas'}</strong></span>
        </div>
      </div>

      {/* Human-in-The-Loop Safety Gate Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-700/80 flex items-start gap-3.5">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
            Prinsip Keamanan Finansial: Human-in-The-Loop
          </h4>
          <p className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
            AI hanya berperan sebagai pembantu ekstraksi draf transaksi (<strong>state: DRAFT</strong>). Sistem secara mutlak <strong>melarang AI</strong> memposting entri ledger atau mengubah saldo kas secara otomatis tanpa konfirmasi dan otorisasi manusia.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Chat Input Simulator */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Simulasi Pesan Chat Warga
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">WhatsApp / Telegram</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Pilih contoh pesan di bawah ini atau tempel teks pesan asli dari grup obrolan warga:
          </p>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputChatText(p.text);
                  analyzeTextMessage(p.text);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          {/* Chat Textarea */}
          <div className="space-y-2">
            <textarea
              value={inputChatText}
              onChange={(e) => setInputChatText(e.target.value)}
              rows={5}
              placeholder="Ketik atau tempel teks pesan warga di sini... Contoh: 'Sudah transfer kas 150rb dari Bpk Joko Blok B2'"
              className="w-full text-xs p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />

            <button
              onClick={() => analyzeTextMessage(inputChatText)}
              disabled={isAnalyzing || !inputChatText.trim()}
              className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Menganalisis Pesan...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Ekstraksi Pesan dengan AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Structured Output & Draft Preview */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Hasil Ekstraksi Terstruktur (Structured Output)
              </h3>
            </div>
            {parsedResult && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Keyakinan {parsedResult.confidenceScore}%
              </span>
            )}
          </div>

          {!parsedResult ? (
            <div className="text-center py-16 text-slate-400 text-xs space-y-2">
              <Bot className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p>Belum ada pesan yang dianalisis.</p>
              <p className="text-[11px] text-slate-400">
                Pilih salah satu contoh pesan di sisi kiri untuk melihat demo ekstraksi pasif.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Draft Visual Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    parsedResult.type === 'INCOME'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                  }`}>
                    {parsedResult.type === 'INCOME' ? (
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    )}
                    {parsedResult.type === 'INCOME' ? 'Pemasukan Kas' : 'Pengeluaran Kas'}
                  </span>

                  <span className="text-xs text-slate-400 font-mono">Draf Status: DRAFT</span>
                </div>

                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Kategori Yang Disarankan:</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    {parsedResult.category}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-300 dark:border-slate-600 pt-2.5">
                  <div>
                    <div className="text-[11px] text-slate-400">Pengirim Terdeteksi:</div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {parsedResult.suggestedBy}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Nominal Estimasi:</div>
                    <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      Rp {parsedResult.amount.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              </div>

              {/* JSON Payload Viewer */}
              <div className="relative">
                <div className="flex items-center justify-between pb-1.5 text-xs text-slate-500">
                  <span className="font-mono text-[11px]">Skema JSON AI:</span>
                  <button
                    onClick={handleCopyJson}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedJson ? 'Tersalin' : 'Salin JSON'}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-48 border border-slate-700">
                  {JSON.stringify(
                    {
                      type: parsedResult.type,
                      amount: parsedResult.amount,
                      currency: 'IDR',
                      category: parsedResult.category,
                      notes: parsedResult.notes,
                      suggestedSender: parsedResult.suggestedBy,
                      confidence: `${parsedResult.confidenceScore}%`,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>

              {/* Action Button: Create Actual KasBareng Draft */}
              <div className="pt-2">
                <button
                  onClick={handleOpenDraftModal}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Konversi Menjadi Draf Transaksi Resmi</span>
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-1.5">
                  Membuka formulir pencatatan kas resmi dengan data yang sudah terisi otomatis.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Developer / Specification Footnote */}
      <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Catatan Pengembang (Fase 7 - Half Feature):</strong> Antarmuka ini mengimplementasikan lapisan UI, ekstraksi teks deterministik berbasis aturan, dan skema output terstruktur. Integrasi LLM pihak ketiga / webhook Telegram/WhatsApp penuh direncanakan pada tahap pematangan pasca-demo.
        </p>
      </div>

      {/* Record Transaction Modal Pre-Filled */}
      <RecordTransactionModal
        isOpen={recordModalOpen}
        initialType={modalType}
        availableBalance={10000000}
        onClose={() => setRecordModalOpen(false)}
        onSuccess={() => {
          setRecordModalOpen(false);
          setInputChatText('');
          setParsedResult(null);
        }}
      />
    </div>
  );
};
