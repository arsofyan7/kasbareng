/**
 * ============================================================================
 * MODUL ALGORITMA: PENCATAT REKONSILIASI BANK DETERMINISTIK (BANK RECONCILIATION MATCHER)
 * ============================================================================
 *
 * FUNGSI MODUL:
 * Menjalankan algoritma pencocokan multi-tahap (multi-pass matching) antara mutasi rekening koran bank
 * (eksternal) dengan catatan pembukuan transaksi kas bersama (internal) secara otomatis dan presisi.
 *
 * KONTEKS BISNIS & KEAMANAN FINANSIAL:
 * Pada pengelolaan kas RT/RW dan komunitas:
 * 1. Selisih Antara Buku Kas dan Rekening Bank:
 *    Bendahara sering mengalami perbedaan saldo antara catatan kas di aplikasi dengan mutasi riil di rekening
 *    bank (BCA, Mandiri, BRI, BNI). Faktor penyebabnya antara lain:
 *    - Keterlambatan kliring antar-bank (transfer dilakukan Jumat sore, baru masuk di bank Senin pagi / H+3).
 *    - Warga salah atau lupa menuliskan nomor referensi saat transfer via mobile banking.
 *    - Adanya mutasi yang belum tercatat di kas (bunga bank, biaya administrasi bulanan, setoran anonim).
 * 2. Perlindungan Terhadap False Positive & Duplicate Reference Conflict:
 *    Jika dua transaksi internal memiliki nomor referensi yang sama secara keliru (duplikat),
 *    sistem TIDAK BOLEH mencocokkannya secara membabi buta. Sistem harus menandainya sebagai `DUPLICATE_POTENTIAL`
 *    dan mem-blacklist nomor referensi tersebut dari pencocokan otomatis demi mencegah salah pasang dana.
 * 3. Mekanisme Human-in-the-Loop untuk Kasus Ambigu:
 *    Jika dalam jendela toleransi tanggal (+/- 3 hari) ditemukan lebih dari 1 transaksi internal dengan
 *    nominal dan arah mutasi yang identik, sistem tidak menebak secara spekulatif. Item diklasifikasikan
 *    sebagai `AMBIGUOUS` agar bendahara manusia yang memutuskan mana pasangan yang benar.
 */

/**
 * Arah aliran dana transaksi:
 * - `CR` (Credit): Dana masuk ke rekening kas (penerimaan iuran warga, sumbangan).
 * - `DB` (Debit): Dana keluar dari rekening kas (pembayaran pengeluaran, transfer keluar).
 */
export type TransactionDirection = 'CR' | 'DB';

/**
 * Representasi satu baris mutasi rekening koran dari bank eksternal.
 */
export interface BankStatementMutation {
  /** Identifier unik baris mutasi bank di basis data */
  id: string;
  /** Nomor referensi transaksi dari bank (misal: nomor referensi transfer BI-FAST/SKN) */
  externalReference?: string | null;
  /** Nominal mutasi dalam minor units (integer rupiah penuh) */
  amount: bigint | number | string;
  /** Arah mutasi (CR = kredit/masuk, DB = debit/keluar) */
  direction: TransactionDirection;
  /** Tanggal efektif pembukuan oleh bank (format ISO YYYY-MM-DD atau ISO Timestamp) */
  bookingDate: string;
  /** Berita acara / deskripsi mutasi dari bank */
  description?: string | null;
}

/**
 * Representasi rekaman transaksi internal kas yang dicatat di aplikasi Kasbareng.
 */
export interface InternalTransactionRecord {
  /** Identifier unik transaksi kas internal */
  id: string;
  /** Nomor referensi bukti bayar / kode unik transaksi kas */
  reference: string;
  /** Nominal transaksi dalam minor units */
  amount: bigint | number | string;
  /** Arah transaksi internal (CR = pemasukan, DB = pengeluaran) */
  direction: TransactionDirection;
  /** Tanggal terjadinya transaksi menurut catatan internal */
  transactionDate: string;
  /** Catatan / keterangan pengeluaran atau pemasukan */
  description?: string | null;
}

/**
 * Klasifikasi status hasil pencocokan rekonsiliasi:
 * - `MATCHED`: Berhasil dipasangkan secara sah dan terverifikasi.
 * - `AMBIGUOUS`: Ditemukan lebih dari 1 kandidat pasangan potensial (memerlukan verifikasi manusia).
 * - `UNMATCHED`: Belum ditemukan pasangannya baik di mutasi bank maupun transaksi internal.
 * - `DUPLICATE_POTENTIAL`: Terdeteksi nomor referensi kembar yang memicu konflik integritas.
 */
export type MatchStatus = 'MATCHED' | 'AMBIGUOUS' | 'UNMATCHED' | 'DUPLICATE_POTENTIAL';

/**
 * Pasangan mutasi bank dan transaksi internal yang sukses direkonsiliasi.
 */
export interface MatchPair {
  /** ID mutasi bank eksternal */
  bankMutationId: string;
  /** ID transaksi internal kas */
  internalTransactionId: string;
  /**
   * Kode aturan pencocokan yang digunakan:
   * - `EXACT_REFERENCE`: Cocok 100% pada nomor referensi unik, nominal, dan arah.
   * - `NOMINAL_DIRECTION_DATE_WINDOW`: Cocok pada nominal, arah, dan jendela waktu tanggal.
   */
  ruleCode: 'EXACT_REFERENCE' | 'NOMINAL_DIRECTION_DATE_WINDOW';
  /** Versi kumpulan aturan algoritma yang diterapkan */
  rulesetVersion: string;
  /** Timestamp waktu terjadinya pencocokan */
  matchedAt: string;
}

/**
 * Rincian mutasi bank yang bersifat ambigu (memiliki banyak kandidat transaksi internal).
 */
export interface AmbiguousBankItem {
  /** ID mutasi bank yang ambigu */
  bankMutationId: string;
  /** Daftar ID transaksi internal yang cocok secara parsial */
  candidateInternalIds: string[];
  /** Alasan spesifik mengapa item ini ditandai ambigu */
  reason: string;
}

/**
 * Peringatan terdeteksinya nomor referensi duplikat yang dapat membahayakan keakuratan rekonsiliasi.
 */
export interface DuplicateAlert {
  /** Entitas asal duplikasi ('BANK_STATEMENT' atau 'INTERNAL_TRANSACTION') */
  entityType: 'BANK_STATEMENT' | 'INTERNAL_TRANSACTION';
  /** Nomor referensi yang terdeteksi kembar */
  reference: string;
  /** Daftar ID data yang saling berkonflik menggunakan referensi tersebut */
  conflictingIds: string[];
}

/**
 * Hasil akhir eksekusi proses rekonsiliasi bank secara menyeluruh.
 */
export interface ReconciliationResult {
  /** Versi aturan rekonsiliasi yang dijalankan */
  rulesetVersion: string;
  /** Daftar pasangan yang berhasil direkonsiliasi secara otomatis */
  matchedPairs: MatchPair[];
  /** Daftar ID mutasi bank yang belum memiliki pasangan di internal */
  unmatchedBankMutationIds: string[];
  /** Daftar ID transaksi internal yang belum muncul di mutasi bank */
  unmatchedInternalTransactionIds: string[];
  /** Daftar mutasi bank yang membutuhkan konfirmasi manual bendahara karena ambigu */
  ambiguousBankItems: AmbiguousBankItem[];
  /** Daftar anomali duplikasi referensi yang ditemukan */
  duplicateAlerts: DuplicateAlert[];
  /** Jumlah total mutasi bank yang diproses */
  totalBankMutations: number;
  /** Jumlah total transaksi internal yang diproses */
  totalInternalTransactions: number;
  /** Jumlah pasangan yang berhasil dicocokkan */
  matchedCount: number;
}

/**
 * Opsi konfigurasi untuk proses pencocokan rekonsiliasi.
 */
export interface ReconciliationOptions {
  /** Versi aturan pencocokan yang hendak digunakan (default: 'RECON_RULESET_V1_DETERMINISTIC') */
  rulesetVersion?: string;
  /** Toleransi selisih tanggal kalender dalam satuan hari (default: +/- 3 hari) */
  dateToleranceDays?: number;
}

/**
 * Utilitas konversi nominal moneter ke BigInt tanpa pembulatan desimal.
 * Melarang nilai pecahan (floating point) demi presisi pencocokan finansial.
 *
 * @param val - Nilai nominal moneter.
 * @returns Nilai BigInt minor units.
 * @throws Error jika ditemukan bilangan desimal berkoma.
 */
function toBigIntSafe(val: bigint | number | string): bigint {
  if (typeof val === 'bigint') return val;
  if (typeof val === 'number') {
    if (!Number.isInteger(val)) throw new Error(`Floating point amount not allowed in reconciliation: ${val}`);
    return BigInt(val);
  }
  return BigInt(val);
}

/**
 * Mengonversi string tanggal ISO menjadi indeks bilangan hari bulat sejak Unix Epoch (UTC).
 * Memudahkan kalkulasi selisih hari absolut antar dua tanggal tanpa terpengaruh jam, menit, atau detik.
 *
 * @param dateStr - String tanggal format ISO.
 * @returns Jumlah hari sejak 1 Januari 1970.
 */
function parseDateDays(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.floor(d.getTime() / (1000 * 60 * 60 * 24));
}

/**
 * Algoritma Pencocokan Rekonsiliasi Deterministik (Deterministic Multi-Pass Reconciliation).
 *
 * Tahapan Eksekusi:
 * 1. Deteksi Dini Duplikasi Nomor Referensi (Pre-pass Duplicate Conflict Detection):
 *    Memindai referensi pada mutasi bank dan transaksi internal. Jika ada referensi kembar,
 *    dikeluarkan peringatan DuplicateAlert dan nomor tersebut diblokir dari pencocokan otomatis.
 * 2. Pass 1: Pencocokan Referensi Eksak (Exact Unique Reference Matching):
 *    Mencocokkan mutasi bank dengan transaksi internal jika nomor referensi sama persis,
 *    nominal identik, dan arah transaksi sama (CR/DB).
 * 3. Pass 2: Pencocokan Jendela Tanggal & Nominal (Amount, Direction & Date Window Matching):
 *    Untuk mutasi bank yang belum terpasang, cari transaksi internal dengan nominal identik,
 *    arah sama, dan selisih tanggal berada dalam batas toleransi (default +/- 3 hari).
 *    Jika ditemukan tepat 1 calon: pasangkan sebagai matched pair.
 *    Jika ditemukan > 1 calon: tandai sebagai ambigu (ambiguous item) untuk intervensi manusia.
 * 4. Pass 3: Agregasi Data Unmatched:
 *    Mengelompokkan seluruh mutasi dan transaksi yang belum berhasil dipasangkan.
 *
 * @param bankMutations - Kumpulan data mutasi rekening koran dari bank.
 * @param internalTransactions - Kumpulan data transaksi kas dari pembukuan internal.
 * @param options - Konfigurasi toleransi tanggal dan versi ruleset.
 * @returns ReconciliationResult komprehensif.
 */
export function reconcileStatements(
  bankMutations: BankStatementMutation[],
  internalTransactions: InternalTransactionRecord[],
  options: ReconciliationOptions = {}
): ReconciliationResult {
  const rulesetVersion = options.rulesetVersion ?? 'RECON_RULESET_V1_DETERMINISTIC';
  const toleranceDays = options.dateToleranceDays ?? 3;
  const matchedAt = new Date().toISOString();

  const matchedPairs: MatchPair[] = [];
  const ambiguousBankItems: AmbiguousBankItem[] = [];
  const duplicateAlerts: DuplicateAlert[] = [];

  const matchedBankIds = new Set<string>();
  const matchedInternalIds = new Set<string>();

  // --------------------------------------------------------------------------
  // Langkah 1A: Deteksi Referensi Duplikat pada Mutasi Bank Eksternal
  // --------------------------------------------------------------------------
  const bankRefMap = new Map<string, string[]>();
  for (const b of bankMutations) {
    if (b.externalReference && b.externalReference.trim().length > 0) {
      const ref = b.externalReference.trim().toUpperCase();
      const existing = bankRefMap.get(ref) || [];
      existing.push(b.id);
      bankRefMap.set(ref, existing);
    }
  }

  for (const [ref, ids] of bankRefMap.entries()) {
    if (ids.length > 1) {
      duplicateAlerts.push({
        entityType: 'BANK_STATEMENT',
        reference: ref,
        conflictingIds: ids,
      });
    }
  }

  // --------------------------------------------------------------------------
  // Langkah 1B: Deteksi Referensi Duplikat pada Transaksi Internal Kas
  // --------------------------------------------------------------------------
  const internalRefMap = new Map<string, string[]>();
  for (const t of internalTransactions) {
    if (t.reference && t.reference.trim().length > 0) {
      const ref = t.reference.trim().toUpperCase();
      const existing = internalRefMap.get(ref) || [];
      existing.push(t.id);
      internalRefMap.set(ref, existing);
    }
  }

  for (const [ref, ids] of internalRefMap.entries()) {
    if (ids.length > 1) {
      duplicateAlerts.push({
        entityType: 'INTERNAL_TRANSACTION',
        reference: ref,
        conflictingIds: ids,
      });
    }
  }

  // Kumpulan referensi yang berkonflik untuk dilewati dari pencocokan otomatis
  const conflictedBankRefs = new Set(
    duplicateAlerts
      .filter((d) => d.entityType === 'BANK_STATEMENT')
      .map((d) => d.reference)
  );
  const conflictedInternalRefs = new Set(
    duplicateAlerts
      .filter((d) => d.entityType === 'INTERNAL_TRANSACTION')
      .map((d) => d.reference)
  );

  const bankIdsWithConflictedRef = new Set<string>();
  for (const b of bankMutations) {
    if (b.externalReference && conflictedBankRefs.has(b.externalReference.trim().toUpperCase())) {
      bankIdsWithConflictedRef.add(b.id);
    }
  }

  const internalIdsWithConflictedRef = new Set<string>();
  for (const t of internalTransactions) {
    if (t.reference && conflictedInternalRefs.has(t.reference.trim().toUpperCase())) {
      internalIdsWithConflictedRef.add(t.id);
    }
  }

  // --------------------------------------------------------------------------
  // Langkah 2: Pass 1 — Pencocokan Referensi Eksak & Unik (Exact Unique Reference)
  // --------------------------------------------------------------------------
  for (const b of bankMutations) {
    if (!b.externalReference) continue;
    const ref = b.externalReference.trim().toUpperCase();
    // Abaikan referensi yang memiliki potensi duplikasi ambigu
    if (conflictedBankRefs.has(ref) || conflictedInternalRefs.has(ref)) {
      continue;
    }

    // Cari transaksi internal yang belum terpasang, referensi sama, nominal cocok, dan arah sama
    const internalMatches = internalTransactions.filter(
      (t) =>
        !matchedInternalIds.has(t.id) &&
        !internalIdsWithConflictedRef.has(t.id) &&
        t.reference.trim().toUpperCase() === ref &&
        toBigIntSafe(t.amount) === toBigIntSafe(b.amount) &&
        t.direction === b.direction
    );

    // Pasangkan hanya jika tepat ditemukan 1 pasangan unik
    if (internalMatches.length === 1) {
      const matchedInternal = internalMatches[0];
      matchedPairs.push({
        bankMutationId: b.id,
        internalTransactionId: matchedInternal.id,
        ruleCode: 'EXACT_REFERENCE',
        rulesetVersion,
        matchedAt,
      });
      matchedBankIds.add(b.id);
      matchedInternalIds.add(matchedInternal.id);
    }
  }

  // --------------------------------------------------------------------------
  // Langkah 3: Pass 2 — Pencocokan Nominal, Arah, dan Jendela Toleransi Tanggal
  // Digunakan untuk mutasi bank yang belum terpasang di Pass 1
  // --------------------------------------------------------------------------
  for (const b of bankMutations) {
    // Lewati jika sudah berhasil dipasangkan di Pass 1
    if (matchedBankIds.has(b.id)) continue;
    // Lewati jika memiliki referensi yang berkonflik duplikasi
    if (bankIdsWithConflictedRef.has(b.id)) continue;

    const bAmt = toBigIntSafe(b.amount);
    const bDays = parseDateDays(b.bookingDate);

    // Cari seluruh kandidat transaksi internal yang memenuhi kriteria nominal, arah, dan jendela tanggal
    const candidates = internalTransactions.filter((t) => {
      if (matchedInternalIds.has(t.id)) return false;
      if (internalIdsWithConflictedRef.has(t.id)) return false;
      if (t.direction !== b.direction) return false;
      if (toBigIntSafe(t.amount) !== bAmt) return false;

      const tDays = parseDateDays(t.transactionDate);
      const diff = Math.abs(bDays - tDays);
      return diff <= toleranceDays;
    });

    if (candidates.length === 1) {
      // Tepat 1 kandidat: Pasangkan secara otomatis
      const matchedInternal = candidates[0];
      matchedPairs.push({
        bankMutationId: b.id,
        internalTransactionId: matchedInternal.id,
        ruleCode: 'NOMINAL_DIRECTION_DATE_WINDOW',
        rulesetVersion,
        matchedAt,
      });
      matchedBankIds.add(b.id);
      matchedInternalIds.add(matchedInternal.id);
    } else if (candidates.length > 1) {
      // Lebih dari 1 kandidat: Jangan spekulasi! Tandai sebagai item ambigu untuk direview bendahara
      ambiguousBankItems.push({
        bankMutationId: b.id,
        candidateInternalIds: candidates.map((c) => c.id),
        reason: `Found ${candidates.length} candidate transactions matching amount ${bAmt.toString()} and direction ${b.direction} within +/-${toleranceDays} days.`,
      });
    }
  }

  // --------------------------------------------------------------------------
  // Langkah 4: Pass 3 — Pengumpulan Item yang Belum Berhasil Direkonsiliasi (Unmatched)
  // --------------------------------------------------------------------------
  const unmatchedBankMutationIds = bankMutations
    .filter((b) => !matchedBankIds.has(b.id))
    .map((b) => b.id);

  const unmatchedInternalTransactionIds = internalTransactions
    .filter((t) => !matchedInternalIds.has(t.id))
    .map((t) => t.id);

  // Mengembalikan hasil laporan rekonsiliasi menyeluruh
  return {
    rulesetVersion,
    matchedPairs,
    unmatchedBankMutationIds,
    unmatchedInternalTransactionIds,
    ambiguousBankItems,
    duplicateAlerts,
    totalBankMutations: bankMutations.length,
    totalInternalTransactions: internalTransactions.length,
    matchedCount: matchedPairs.length,
  };
}