import crypto from 'crypto';

export interface ParsedBankStatementRow {
  sourceRowNumber: number;
  transactionDate: string; // ISO date YYYY-MM-DD
  externalReference: string | null;
  amount: number; // Integer Rupiah
  direction: 'CREDIT' | 'DEBIT';
  description: string;
  rawLine: string;
}

export interface CsvParseResult {
  checksum: string;
  totalRowsParsed: number;
  rows: ParsedBankStatementRow[];
  detectedBankFormat: 'BCA' | 'MANDIRI' | 'BRI' | 'BNI' | 'GENERIC';
  warnings: string[];
}

/**
 * Splits a CSV text into lines, handling CRLF and LF.
 */
function splitLines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
}

/**
 * Parses a single CSV line into tokens, respecting double quotes.
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
        i++; // skip escaped quote
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
 * Autodetects CSV delimiter: comma, semicolon, or tab.
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
 * Normalizes Indonesian and international numeric string representations to integer Rupiah.
 * Handles: "100.000,00", "1,000,000.00", "250000", "(50.000)", "-150000"
 */
export function normalizeAmount(raw: string): { amount: number; isNegative: boolean } {
  if (!raw || raw.trim().length === 0) {
    return { amount: 0, isNegative: false };
  }

  let cleaned = raw.trim();
  let isNegative = false;

  // Handle accounting parentheses: "(50000)" => -50000
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    isNegative = true;
    cleaned = cleaned.slice(1, -1).trim();
  } else if (cleaned.startsWith('-')) {
    isNegative = true;
    cleaned = cleaned.slice(1).trim();
  }

  // Strip currency prefixes: "Rp", "IDR", "RP."
  cleaned = cleaned.replace(/^(rp\.?|idr)\s*/i, '').trim();

  // If both '.' and ',' exist, determine which is decimal
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      // Indonesian format: 1.000.000,50 -> remove dots, replace comma with dot
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,000,000.50 -> remove commas
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // Only comma exists: check if comma is decimal (e.g. 500,00) or thousand (e.g. 1,000,000)
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = parts[0] + '.' + parts[1];
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (lastDot !== -1) {
    // Only dot exists: check if dot is thousand separator (e.g. 100.000 or 1.000.000)
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
 * Normalizes diverse date formats to ISO YYYY-MM-DD.
 * Handles: "YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY", "DD/MM", "DD-MMM-YYYY"
 */
export function normalizeDate(raw: string, fallbackYear?: number): string {
  if (!raw) return new Date().toISOString().split('T')[0];

  const cleaned = raw.trim();
  const currentYear = fallbackYear || new Date().getFullYear();

  // 1. YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    return cleaned.slice(0, 10);
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 3. DD/MM or DD-MM (common BCA format)
  const dmMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (dmMatch) {
    const day = dmMatch[1].padStart(2, '0');
    const month = dmMatch[2].padStart(2, '0');
    return `${currentYear}-${month}-${day}`;
  }

  // 4. Try native Date parse
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Extracts external reference number from explicit token or transaction description.
 */
export function extractReference(explicitRef: string | null, description: string): string | null {
  if (explicitRef && explicitRef.trim().length > 0) {
    return explicitRef.trim().toUpperCase();
  }

  if (!description) return null;

  // Patterns common in Indonesian banking:
  // e.g. "TRX-123456", "REF: 998811", "INV/2026/01", "BCA 12345678"
  const patterns = [
    /\b(TRX-[A-Z0-9_\-]+)\b/i,
    /\b(REF[:\s#]*([A-Z0-9_\-]+))\b/i,
    /\b(INV\/[A-Z0-9\/\-]+)\b/i,
    /\b(TRANSFER\s+(?:KE|DARI)\s+([0-9]{8,16}))\b/i,
    /\b([0-9]{9,16})\b/, // 9-16 digit bank reference or account number
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
 * Parses bank statement CSV data into normalized rows.
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

  // 1. Detect header row & delimiter
  let headerIndex = -1;
  let delimiter = ',';

  // Check top 5 lines for typical header keywords
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

  // Fallback if no explicit header recognized: treat line 0 as header
  if (headerIndex === -1) {
    headerIndex = 0;
    delimiter = detectDelimiter(lines[0]);
    warnings.push('Header CSV tidak terdeteksi secara otomatis, menggunakan baris pertama sebagai kolom.');
  }

  const rawHeaders = parseCsvLine(lines[headerIndex], delimiter).map((h) => h.toLowerCase().trim());

  // 2. Map Column Indexes
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

  // Identify Bank Format
  let detectedBankFormat: 'BCA' | 'MANDIRI' | 'BRI' | 'BNI' | 'GENERIC' = 'GENERIC';
  const headerStr = rawHeaders.join(' ');
  if (headerStr.includes('cabang') || (amountCol !== -1 && typeCol !== -1)) {
    detectedBankFormat = 'BCA';
  } else if (debitCol !== -1 && creditCol !== -1) {
    if (headerStr.includes('uraian')) detectedBankFormat = 'BRI';
    else detectedBankFormat = 'MANDIRI';
  }

  // 3. Parse Data Rows
  const rows: ParsedBankStatementRow[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith('#') || line.toLowerCase().includes('saldo awal') || line.toLowerCase().includes('saldo akhir')) {
      continue; // Skip footer / comments
    }

    const tokens = parseCsvLine(line, delimiter);
    if (tokens.length <= 1) continue;

    // Date
    const rawDate = dateCol !== -1 && tokens[dateCol] ? tokens[dateCol] : '';
    const transactionDate = normalizeDate(rawDate);

    // Description
    const description = descCol !== -1 && tokens[descCol] ? tokens[descCol] : 'Mutasi Rekening';

    // External Reference
    const explicitRef = refCol !== -1 && tokens[refCol] ? tokens[refCol] : null;
    const externalReference = extractReference(explicitRef, description);

    // Amount & Direction
    let amount = 0;
    let direction: 'CREDIT' | 'DEBIT' = 'CREDIT';

    if (debitCol !== -1 && creditCol !== -1) {
      // Split Debit / Credit column format (Mandiri, BRI)
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
      // Single amount column + optional Type column (BCA, BNI, Generic)
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
        // Infer from negative or description
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
      continue; // Skip zero-value header/footer rows
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
