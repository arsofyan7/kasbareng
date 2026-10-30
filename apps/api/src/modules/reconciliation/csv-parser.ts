/**
 * ============================================================================
 * MODUL REKONSILIASI: PARSER REKENING KORAN CSV (csv-parser.ts)
 * ============================================================================
 * Modul ini bertanggung jawab mengurai (parsing), membersihkan, dan menormalisasi
 * berkas CSV mutasi rekening bank dari berbagai perbankan di Indonesia (BCA, Mandiri,
 * BRI, BNI, serta format generic) menjadi struktur data transaksi yang seragam.
 * 
 * Tantangan Format Perbankan Indonesia:
 * 1. Delimiter CSV berbeda-beda: koma (,), titik koma (;), atau tab (\t).
 * 2. Pemisah ribuan dan desimal terbalik: 100.000,00 (standar Indo) vs 100,000.00 (standar US).
 * 3. Format debit/kredit: Ada yang memisahkan ke dua kolom (Debet vs Kredit), ada yang menggabungkan
 *    ke satu kolom nominal dengan kolom penanda tipe (DB / CR atau D / K), atau angka negatif (-50.000 / (50.000)).
 * 4. Format tanggal variatif: DD/MM/YYYY, DD-MM-YYYY, atau DD/MM (tanpa tahun seperti e-Statement BCA).
 */

import crypto from 'crypto';

/**
 * Interface `ParsedBankStatementRow`:
 * Baris mutasi rekening bank yang telah dinormalisasi.
 */
export interface ParsedBankStatementRow {
  sourceRowNumber: number;   // Nomor baris pada file CSV asli (1-based)
  transactionDate: string;   // Tanggal transaksi dalam format ISO YYYY-MM-DD
  externalReference: string | null; // Nomor referensi bank / no resi / no rekening lawan
  amount: number;            // Nominal mutasi dalam bilangan bulat Rupiah (integer)
  direction: 'CREDIT' | 'DEBIT'; // CREDIT (pemasukan kas) atau DEBIT (pengeluaran kas)
  description: string;       // Uraian atau berita transfer bank
  rawLine: string;           // Teks mentah asli baris CSV untuk auditabilitas
}

/**
 * Interface `CsvParseResult`:
 * Ringkasan hasil pembacaan berkas CSV bank statement.
 */
export interface CsvParseResult {
  checksum: string;          // SHA-256 hash dari konten teks berkas CSV untuk deteksi duplikasi unggahan
  totalRowsParsed: number;   // Total baris transaksi valid yang berhasil diekstraksi
  rows: ParsedBankStatementRow[]; // Daftar baris mutasi hasil normalisasi
  detectedBankFormat: 'BCA' | 'MANDIRI' | 'BRI' | 'BNI' | 'GENERIC'; // Format bank yang terdeteksi
  warnings: string[];        // Catatan peringatan jika terdapat ketidaksesuaian format
}

/**
 * Helper: splitLines
 * 
 * Fungsi Blok:
 * Memecah string teks panjang CSV menjadi array baris individual,
 * menangani perbedaan line endings Windows (CRLF `\r\n`) dan Unix/Linux (LF `\n`).
 */
function splitLines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
}

/**
 * Helper: parseCsvLine
 * 
 * Fungsi Blok:
 * Tokenizer baris CSV yang mematuhi spesifikasi RFC 4180.
 * Mendukung field yang dibungkus tanda petik ganda (`"..."`) dan escaped quote (`""`).
 * 
 * Alur Kerja:
 * 1. Iterasi karakter demi karakter.
 * 2. Toggle status `inQuotes` saat menemukan tanda petik ganda.
 * 3. Jika karakter adalah delimiter di luar tanda kutip, simpan token ke array dan reset buffer.
 * 4. Jika di dalam tanda kutip, karakter delimiter diperlakukan sebagai teks biasa.
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // lewati quote yang di-escape
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      tokens.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  tokens.push(current.trim());
  return tokens;
}

/**
 * Helper: detectDelimiter
 * 
 * Fungsi Blok:
 * Mendeteksi pembatas kolom (delimiter) CSV secara heuristik berdasarkan frekuensi kemunculan
 * pada baris pertama.
 * 
 * Alur Kerja:
 * Menghitung jumlah titik koma (;), koma (,), dan tab (\t).
 * Memilih karakter dengan kemunculan terbanyak.
 */
function detectDelimiter(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;

  if (semicolons > commas && semicolons > tabs) return ';';
  if (tabs > commas && tabs > semicolons) return '\t';
  return ',';
}

/**
 * Fungsi: normalizeAmount
 * 
 * Fungsi Blok:
 * Mengonversi beragam representasi string nominal uang (Rupiah & format asing)
 * menjadi nilai integer Rupiah absolut beserta status negatifnya.
 * 
 * Kasus yang Ditangani:
 * - Format Indonesia: "100.000,00" -> 100000
 * - Format Internasional / US: "1,000,000.50" -> 1000000
 * - Angka murni: "250000" -> 250000
 * - Format Akuntansi tanda kurung: "(50.000)" -> isNegative: true, amount: 50000
 * - Tanda minus: "-150000" -> isNegative: true, amount: 150000
 * - Prefix mata uang: "Rp 150.000", "IDR 50.000", "RP."
 */
export function normalizeAmount(raw: string): { amount: number; isNegative: boolean } {
  if (!raw || raw.trim().length === 0) {
    return { amount: 0, isNegative: false };
  }

  let cleaned = raw.trim();
  let isNegative = false;

  // Tangani format akuntansi tanda kurung: "(50000)" => -50000
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    isNegative = true;
    cleaned = cleaned.slice(1, -1).trim();
  } else if (cleaned.startsWith('-')) {
    isNegative = true;
    cleaned = cleaned.slice(1).trim();
  }

  // Hapus simbol prefix mata uang: "Rp", "IDR", "RP."
  cleaned = cleaned.replace(/^(rp\.?|idr)\s*/i, '').trim();

  // Jika kedua tanda '.' dan ',' ada, tentukan mana pemisah desimal
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      // Format Indonesia: 1.000.000,50 -> hapus titik ribuan, ganti koma desimal ke titik
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Format US: 1,000,000.50 -> hapus koma ribuan
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // Hanya ada koma: tentukan apakah koma desimal (misal 500,00) atau ribuan (1,000,000)
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = parts[0] + '.' + parts[1];
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (lastDot !== -1) {
    // Hanya ada titik: tentukan apakah titik ribuan (100.000 atau 1.000.000)
    const parts = cleaned.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      cleaned = cleaned.replace(/\./g, '');
    }
  }

  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) {
    return { amount: 0, isNegative };
  }

  return {
    amount: Math.round(Math.abs(parsed)),
    isNegative,
  };
}

/**
 * Fungsi: normalizeDate
 * 
 * Fungsi Blok:
 * Mengubah beragam variasi format tanggal perbankan menjadi format standar ISO `YYYY-MM-DD`.
 * 
 * Format yang Didukung:
 * - ISO: "YYYY-MM-DD"
 * - Tanggal Indonesia: "DD/MM/YYYY" atau "DD-MM-YYYY"
 * - Tanggal ringkas BCA (tanpa tahun): "DD/MM" -> menggunakan fallback tahun berjalan
 * - Parsing fallback Javascript Date
 */
export function normalizeDate(raw: string, fallbackYear?: number): string {
  if (!raw) return new Date().toISOString().split('T')[0];

  const cleaned = raw.trim();
  const currentYear = fallbackYear || new Date().getFullYear();

  // 1. Format ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    return cleaned.slice(0, 10);
  }

  // 2. Format DD/MM/YYYY atau DD-MM-YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 3. Format DD/MM atau DD-MM (format umum e-Statement BCA per bulan)
  const dmMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (dmMatch) {
    const day = dmMatch[1].padStart(2, '0');
    const month = dmMatch[2].padStart(2, '0');
    return `${currentYear}-${month}-${day}`;
  }

  // 4. Fallback ke native JavaScript Date parsing
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Fungsi: extractReference
 * 
 * Fungsi Blok:
 * Mengekstrak nomor referensi transaksi, kode invoice, nomor resi bank,
 * atau nomor rekening pengirim dari kolom eksplisit atau dari teks deskripsi mutasi.
 * 
 * Alur Kerja:
 * 1. Jika kolom referensi eksplisit ada dan tidak kosong, gunakan nilai tersebut (uppercase).
 * 2. Jika tidak ada, gunakan regex pattern matching pada deskripsi untuk mencari pola:
 *    - TRX-... (contoh: TRX-20260101-001)
 *    - REF:... atau REF #...
 *    - INV/... (contoh: INV/2026/01/99)
 *    - Nomor rekening 9 - 16 digit transfer bank.
 */
export function extractReference(explicitRef: string | null, description: string): string | null {
  if (explicitRef && explicitRef.trim().length > 0) {
    return explicitRef.trim().toUpperCase();
  }

  if (!description) return null;

  // Pola referensi umum pada perbankan Indonesia
  const patterns = [
    /\b(TRX-[A-Z0-9_\-]+)\b/i,
    /\b(REF[:\s#]*([A-Z0-9_\-]+))\b/i,
    /\b(INV\/[A-Z0-9\/\-]+)\b/i,
    /\b(TRANSFER\s+(?:KE|DARI)\s+([0-9]{8,16}))\b/i,
    /\b([0-9]{9,16})\b/, // 9-16 digit nomor rekening atau nomor referensi bank
  ];

  for (const p of patterns) {
    const m = description.match(p);
    if (m) {
      return (m[2] || m[1]).trim().toUpperCase();
    }
  }

  return null;
}

/**
 * ============================================================================
 * FUNGSI UTAMA: parseBankStatementCsv
 * ============================================================================
 * Fungsi Blok:
 * Mengurai seluruh berkas CSV mutasi bank, memetakan header kolom secara cerdas (fuzzy mapping),
 * mengenali template bank, dan menghasilkan baris transaksi ternormalisasi.
 * 
 * Alur Kerja:
 * 1. Hitung SHA-256 fingerprint dari seluruh string CSV untuk audit dan deteksi re-upload file yang sama.
 * 2. Pisahkan teks menjadi baris-baris data (`splitLines`).
 * 3. Identifikasi baris header pada 5 baris pertama dengan mencari kata kunci tanggal dan nominal.
 * 4. Petakan indeks kolom secara dinamis:
 *    - dateCol: tanggal / date / tgl
 *    - descCol: keterangan / deskripsi / uraian
 *    - debitCol & creditCol: debet / kredit / keluar / masuk
 *    - amountCol & typeCol: jumlah / nominal / tipe CR/DB
 *    - refCol: no referensi / ref
 * 5. Klasifikasikan template bank: BCA, Mandiri, BRI, BNI, atau Generic.
 * 6. Iterasi setiap baris data transaksi:
 *    - Abaikan baris kosong, komentar `#`, serta baris ringkasan "Saldo Awal / Saldo Akhir".
 *    - Ekstrak tanggal ISO via `normalizeDate`.
 *    - Ekstrak referensi via `extractReference`.
 *    - Tentukan nominal Rupiah dan arah mutasi (`CREDIT` untuk uang masuk, `DEBIT` untuk uang keluar).
 *    - Masukkan baris valid ke daftar `rows`.
 * 7. Kembalikan objek `CsvParseResult`.
 */
export function parseBankStatementCsv(csvText: string): CsvParseResult {
  const checksum = crypto.createHash('sha256').update(csvText, 'utf8').digest('hex');
  const lines = splitLines(csvText);
  const warnings: string[] = [];

  if (lines.length === 0) {
    return {
      checksum,
      totalRowsParsed: 0,
      rows: [],
      detectedBankFormat: 'GENERIC',
      warnings: ['File CSV kosong atau tidak memiliki data.'],
    };
  }

  // 1. Deteksi baris header dan delimiter
  let headerIndex = -1;
  let delimiter = ',';

  // Periksa 5 baris pertama untuk kata kunci header tipikal
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    const testDelim = detectDelimiter(line);
    const tokens = parseCsvLine(line, testDelim).map((t) => t.toLowerCase());

    const hasDate = tokens.some((t) => t.includes('tgl') || t.includes('tanggal') || t.includes('date'));
    const hasAmount = tokens.some(
      (t) =>
        t.includes('jumlah') ||
        t.includes('amount') ||
        t.includes('nominal') ||
        t.includes('debet') ||
        t.includes('kredit') ||
        t.includes('debit') ||
        t.includes('credit')
    );

    if (hasDate && hasAmount) {
      headerIndex = i;
      delimiter = testDelim;
      break;
    }
  }

  // Fallback jika tidak ditemukan header yang eksplisit: anggap baris pertama sebagai header
  if (headerIndex === -1) {
    headerIndex = 0;
    delimiter = detectDelimiter(lines[0]);
    warnings.push('Header CSV tidak terdeteksi secara otomatis, menggunakan baris pertama sebagai kolom.');
  }

  const rawHeaders = parseCsvLine(lines[headerIndex], delimiter).map((h) => h.toLowerCase().trim());

  // 2. Petakan Indeks Kolom
  let dateCol = -1;
  let descCol = -1;
  let amountCol = -1;
  let debitCol = -1;
  let creditCol = -1;
  let typeCol = -1;
  let refCol = -1;

  for (let c = 0; c < rawHeaders.length; c++) {
    const h = rawHeaders[c];
    if (dateCol === -1 && (h.includes('tanggal') || h.includes('date') || h.includes('tgl'))) {
      dateCol = c;
    } else if (refCol === -1 && (h.includes('referensi') || h.includes('reference') || h === 'ref' || h.includes('no ref') || h.includes('no. ref'))) {
      refCol = c;
    } else if (descCol === -1 && (h.includes('keterangan') || h.includes('deskripsi') || h.includes('description') || h.includes('uraian') || h.includes('rincian'))) {
      descCol = c;
    } else if (debitCol === -1 && (h === 'debet' || h === 'debit' || h === 'keluar' || h === 'out' || h === 'pengeluaran' || h.startsWith('debit') || h.startsWith('debet'))) {
      debitCol = c;
    } else if (creditCol === -1 && (h === 'kredit' || h === 'credit' || h === 'masuk' || h === 'in' || h === 'pemasukan' || h.startsWith('kredit') || h.startsWith('credit'))) {
      creditCol = c;
    } else if (amountCol === -1 && (h.includes('jumlah') || h.includes('amount') || h.includes('nominal') || h.includes('mutasi') || h.includes('nilai'))) {
      amountCol = c;
    } else if (typeCol === -1 && (h === 'tipe' || h === 'type' || h === 'arah' || h === 'direction' || h.includes('cr/db') || h === 'd/k' || h === 'db/cr')) {
      typeCol = c;
    }
  }

  // Identifikasi format perbankan berdasarkan komposisi kolom
  let detectedBankFormat: 'BCA' | 'MANDIRI' | 'BRI' | 'BNI' | 'GENERIC' = 'GENERIC';
  const headerStr = rawHeaders.join(' ');
  if (headerStr.includes('cabang') || (amountCol !== -1 && typeCol !== -1)) {
    detectedBankFormat = 'BCA';
  } else if (debitCol !== -1 && creditCol !== -1) {
    if (headerStr.includes('uraian')) detectedBankFormat = 'BRI';
    else detectedBankFormat = 'MANDIRI';
  }

  // 3. Parsing Baris Data Mutasi
  const rows: ParsedBankStatementRow[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith('#') || line.toLowerCase().includes('saldo awal') || line.toLowerCase().includes('saldo akhir')) {
      continue; // Lewati catatan kaki / komentar / ringkasan saldo
    }

    const tokens = parseCsvLine(line, delimiter);
    if (tokens.length <= 1) continue;

    // Ekstraksi Tanggal
    const rawDate = dateCol !== -1 && tokens[dateCol] ? tokens[dateCol] : '';
    const transactionDate = normalizeDate(rawDate);

    // Ekstraksi Deskripsi
    const description = descCol !== -1 && tokens[descCol] ? tokens[descCol] : 'Mutasi Rekening';

    // Ekstraksi Nomor Referensi Eksternal
    const explicitRef = refCol !== -1 && tokens[refCol] ? tokens[refCol] : null;
    const externalReference = extractReference(explicitRef, description);

    // Ekstraksi Nominal dan Arah Mutasi (Debet/Kredit)
    let amount = 0;
    let direction: 'CREDIT' | 'DEBIT' = 'CREDIT';

    if (debitCol !== -1 && creditCol !== -1) {
      // Format kolom terpisah Debet / Kredit (Mandiri, BRI)
      const debVal = normalizeAmount(tokens[debitCol] || '');
      const credVal = normalizeAmount(tokens[creditCol] || '');

      if (credVal.amount > 0) {
        amount = credVal.amount;
        direction = 'CREDIT';
      } else if (debVal.amount > 0) {
        amount = debVal.amount;
        direction = 'DEBIT';
      }
    } else if (amountCol !== -1) {
      // Format satu kolom nominal + penanda tipe DB/CR opsional (BCA, BNI, Generic)
      const amtResult = normalizeAmount(tokens[amountCol] || '');
      amount = amtResult.amount;

      if (typeCol !== -1 && tokens[typeCol]) {
        const rawType = tokens[typeCol].trim().toUpperCase();
        if (rawType === 'CR' || rawType.includes('CR') || rawType === 'K' || rawType.includes('MASUK')) {
          direction = 'CREDIT';
        } else if (rawType === 'DB' || rawType.includes('DB') || rawType === 'D' || rawType.includes('KELUAR')) {
          direction = 'DEBIT';
        } else {
          direction = amtResult.isNegative ? 'DEBIT' : 'CREDIT';
        }
      } else {
        // Inferensi arah dari nilai minus atau teks deskripsi
        if (amtResult.isNegative) {
          direction = 'DEBIT';
        } else if (/\b(CR)\b/i.test(description)) {
          direction = 'CREDIT';
        } else if (/\b(DB)\b/i.test(description)) {
          direction = 'DEBIT';
        } else {
          direction = 'CREDIT';
        }
      }
    }

    if (amount <= 0) {
      continue; // Abaikan baris bernilai 0
    }

    rows.push({
      sourceRowNumber: i + 1,
      transactionDate,
      externalReference,
      amount,
      direction,
      description,
      rawLine: line,
    });
  }

  return {
    checksum,
    totalRowsParsed: rows.length,
    rows,
    detectedBankFormat,
    warnings,
  };
}

