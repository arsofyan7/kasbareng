/**
 * ============================================================================
 * MODUL ALGORITMA: KALKULATOR SALDO BUKU KAS (DOUBLE-ENTRY LEDGER BALANCE ENGINE)
 * ============================================================================
 *
 * FUNGSI MODUL:
 * Mengkalkulasi saldo riil (posted balance), dana terikat/reservasi aktif (active reservations),
 * dan saldo efektif yang siap digunakan (available balance) secara deterministik dan presisi tinggi.
 *
 * KONTEKS BISNIS & KEAMANAN FINANSIAL:
 * 1. Larangan Mutlak Nilai Floating Point (Anti-IEEE 754 Inaccuracy):
 *    Operasi komputasi keuangan dengan angka pecahan standar JavaScript (misal: `0.1 + 0.2 === 0.30000000000000004`)
 *    dapat menciptakan selisih saldo siluman atau kerugian kumulatif.
 *    Seluruh perhitungan saldo pada modul ini WAJIB menggunakan `BigInt` pada representasi minor units
 *    (satuan integer terkecil, misal: rupiah penuh atau sen).
 * 2. Pemisahan Tegas Antara Posted Balance vs Available Balance:
 *    - `Posted Balance`: Saldo buku riil berdasarkan transaksi yang telah tuntas dan sah (POSTED).
 *    - `Active Reservations`: Dana kas yang sedang di-"booking" / dikunci sementara karena ada pengajuan
 *      pengeluaran yang sedang menunggu persetujuan atau proses kliring bank.
 *    - `Available Balance`: `postedBalance - activeReservations`. Saldo bersih yang benar-benar aman
 *      untuk disetujui pengeluarannya tanpa risiko defisit (overdraft / over-spending).
 * 3. Pencegahan Overdraft (Negative Balance Guard):
 *    Secara default, kas komunitas tidak boleh bersaldo negatif (kecuali dikonfigurasi khusus).
 * 4. Isolasi Data Multi-Tenant & Multi-Mata Uang (Strict Currency & Wallet Isolation):
 *    Mencegah percampuran entri antar-wallet berbeda atau antar-mata uang berbeda tanpa konversi kurs.
 */

/**
 * Tipe pergerakan akuntansi buku kas:
 * - `CREDIT`: Dana masuk (misal: pembayaran iuran warga, sumbangan, penerimaan bunga bank). Menambah saldo.
 * - `DEBIT`: Dana keluar (misal: biaya perbaikan pos ronda, pembayaran sampah, konsumsi). Mengurangi saldo.
 */
export type LedgerEntryType = 'CREDIT' | 'DEBIT';

/**
 * Status formal pencatatan entri jurnal buku kas:
 * - `POSTED`: Telah diverifikasi dan dibukukan secara permanen ke buku kas besar (mempengaruhi saldo buku).
 * - `PENDING`: Masih berupa draf atau menunggu konfirmasi eksternal (tidak mempengaruhi posted balance).
 * - `VOIDED`: Dibatalkan / digugurkan karena koreksi akuntansi atau pembatalan transaksi.
 */
export type LedgerEntryStatus = 'POSTED' | 'PENDING' | 'VOIDED';

/**
 * Siklus hidup reservasi (penguncian sementara) saldo:
 * - `ACTIVE`: Reservasi sedang berlaku aktif dan mengunci kapasitas belanja kas.
 * - `RELEASED`: Reservasi dilepas kembali karena transaksi dibatalkan atau ditolak (dana kembali tersedia).
 * - `CONSUMED`: Reservasi telah dipenuhi saat transaksi resmi dibukukan menjadi DEBIT POSTED.
 */
export type ReservationStatus = 'ACTIVE' | 'RELEASED' | 'CONSUMED';

/**
 * Struktur data entri jurnal buku kas individual.
 */
export interface LedgerEntry {
  /** Identifier unik entri ledger */
  id: string;
  /** Identifier dompet/kas pemilik entri ini */
  walletId: string;
  /** Arah mutasi akuntansi (CREDIT atau DEBIT) */
  type: LedgerEntryType;
  /** Nominal dalam minor units (rupiah/sen) integer aman tanpa pecahan desimal */
  amount: bigint | string | number;
  /** Kode mata uang standar (contoh: 'IDR', 'USD') */
  currency: string;
  /** Status pembukuan entri */
  status: LedgerEntryStatus;
  /** Flag penanda apakah entri ini merupakan jurnal balik (reversal entry) */
  isReversal?: boolean;
  /** Referensi ke ID entri asal yang dibatalkan oleh jurnal balik ini */
  reversalOfId?: string;
  /** Waktu pencatatan entri */
  createdAt: string | Date;
}

/**
 * Struktur data entri reservasi penguncian dana sementara.
 */
export interface ReservationEntry {
  /** Identifier unik reservasi */
  id: string;
  /** Identifier dompet tempat reservasi dialokasikan */
  walletId: string;
  /** Nominal dana yang dicadangkan dalam minor units */
  amount: bigint | string | number;
  /** Kode mata uang reservasi */
  currency: string;
  /** Status reservasi saat ini */
  status: ReservationStatus;
  /** Batas waktu kedaluwarsa reservasi (opsional; jika lewat waktu, reservasi hangus otomatis) */
  expiresAt?: string | Date;
  /** Waktu pembuatan reservasi */
  createdAt: string | Date;
}

/**
 * Struktur parameter masukan untuk mesin kalkulasi saldo.
 */
export interface BalanceCalculatorInput {
  /** ID dompet kas yang hendak dihitung saldonya */
  walletId: string;
  /** Kode mata uang yang dievaluasi */
  currency: string;
  /** Daftar seluruh entri mutasi kas yang tercatat */
  entries: LedgerEntry[];
  /** Daftar reservasi penguncian saldo yang tercatat (opsional) */
  reservations?: ReservationEntry[];
  /** Opsi konfigurasi perhitungan */
  options?: {
    /** Izinkan saldo negatif jika dompet memiliki fasilitas talangan (default: false) */
    allowNegativeBalance?: boolean;
    /** Patokan waktu simulasi 'sekarang' untuk pengujian kedaluwarsa reservasi */
    now?: Date;
  };
}

/**
 * Struktur data kesalahan validasi integritas entri/reservasi.
 */
export interface ValidationError {
  /** Kode klasifikasi kesalahan */
  code:
    | 'CURRENCY_MISMATCH'
    | 'INVALID_AMOUNT'
    | 'NEGATIVE_BALANCE_NOT_ALLOWED'
    | 'WALLET_ID_MISMATCH';
  /** Deskripsi rinci penyebab kesalahan validasi */
  message: string;
  /** ID entri atau reservasi yang bermasalah */
  entityId?: string;
}

/**
 * Hasil komputasi saldo lengkap yang bebas bias floating point.
 */
export interface BalanceCalculationResult {
  /** ID dompet yang dikomputasi */
  walletId: string;
  /** Kode mata uang hasil komputasi */
  currency: string;
  /** Saldo buku kas resmi (total CREDIT posted - total DEBIT posted) */
  postedBalance: bigint;
  /** Total dana kas yang sedang dikunci oleh pengajuan aktif */
  activeReservations: bigint;
  /** Saldo efektif siap pakai (postedBalance - activeReservations) */
  availableBalance: bigint;
  /** Akumulasi seluruh kredit berstatus POSTED */
  postedCreditTotal: bigint;
  /** Akumulasi seluruh debit berstatus POSTED */
  postedDebitTotal: bigint;
  /** Total seluruh entri yang dievaluasi */
  totalEntriesCount: number;
  /** Jumlah entri berstatus POSTED yang mempengaruhi saldo buku */
  postedEntriesCount: number;
  /** Jumlah reservasi aktif yang sedang mengikat saldo */
  activeReservationsCount: number;
  /** Daftar anomali/kesalahan validasi yang ditemukan */
  validationErrors: ValidationError[];
  /** Status apakah kalkulasi sah dan bebas dari pelanggaran aturan bisnis */
  isValid: boolean;
}

/**
 * Fungsi utilitas untuk konversi nilai moneter ke tipe BigInt secara aman.
 * Menegakkan kebijakan Zero-Tolerance terhadap angka floating point:
 * Jika nilai bertipe number tidak bulat (misal: 100.5), fungsi langsung melempar Exception
 * guna mencegah distorsi desimal dalam pembukuan kas.
 *
 * @param val - Nilai input (bigint, string numerik, atau integer number).
 * @returns Nilai BigInt murni.
 * @throws Error jika ditemukan bilangan berkoma (floating point).
 */
function toBigIntSafe(val: bigint | string | number): bigint {
  if (typeof val === 'bigint') return val;
  if (typeof val === 'number') {
    if (!Number.isInteger(val)) {
      throw new Error(`Floating point values are forbidden in ledger calculation: ${val}`);
    }
    return BigInt(val);
  }
  return BigInt(val);
}

/**
 * Mengkalkulasi saldo buku kas, dana reservasi, dan saldo tersedia secara presisi tinggi.
 *
 * Logika Komputasi:
 * 1. Filter & Agregasi Entri Ledger:
 *    - Validasi kepemilikan walletId dan kesesuaian mata uang (currency).
 *    - Validasi nominal bernilai positif (> 0n).
 *    - Hanya entri berstatus POSTED yang diperhitungkan ke `postedCreditTotal` atau `postedDebitTotal`.
 *    - Hitung `postedBalance = postedCreditTotal - postedDebitTotal`.
 * 2. Filter & Agregasi Reservasi:
 *    - Validasi walletId, currency, dan nominal positif.
 *    - Hanya reservasi ACTIVE dan belum melewati `expiresAt` yang dihitung ke `activeReservationsTotal`.
 * 3. Penentuan Saldo Tersedia (Available Balance):
 *    - `availableBalance = postedBalance - activeReservationsTotal`.
 * 4. Pengecekan Saldo Negatif:
 *    - Jika `allowNegativeBalance: false` dan `availableBalance < 0n`, catat error validasi.
 *
 * @param input - Objek konfigurasi BalanceCalculatorInput.
 * @returns BalanceCalculationResult komprehensif dengan nilai BigInt murni.
 */
export function calculateBalance(input: BalanceCalculatorInput): BalanceCalculationResult {
  const { walletId, currency, entries, reservations = [], options = {} } = input;
  const allowNegative = options.allowNegativeBalance ?? false;
  const now = options.now ? options.now.getTime() : Date.now();

  const validationErrors: ValidationError[] = [];

  let postedCreditTotal = 0n;
  let postedDebitTotal = 0n;
  let postedEntriesCount = 0;

  // --------------------------------------------------------------------------
  // Langkah 1: Pemrosesan Seluruh Entri Jurnal Buku Kas (Ledger Entries)
  // --------------------------------------------------------------------------
  for (const entry of entries) {
    // Guard 1A: Isolasi kepemilikan dompet (mencegah pencampuran kas antar-komunitas)
    if (entry.walletId !== walletId) {
      validationErrors.push({
        code: 'WALLET_ID_MISMATCH',
        message: `Entry ${entry.id} walletId ${entry.walletId} does not match target ${walletId}`,
        entityId: entry.id,
      });
      continue;
    }

    // Guard 1B: Validasi keselarasan mata uang (currency)
    if (entry.currency.toUpperCase() !== currency.toUpperCase()) {
      validationErrors.push({
        code: 'CURRENCY_MISMATCH',
        message: `Entry ${entry.id} currency ${entry.currency} does not match target ${currency}`,
        entityId: entry.id,
      });
      continue;
    }

    // Guard 1C: Konversi aman dan validasi nominal wajib bilangan bulat positif
    let amt: bigint;
    try {
      amt = toBigIntSafe(entry.amount);
      if (amt <= 0n) {
        validationErrors.push({
          code: 'INVALID_AMOUNT',
          message: `Entry ${entry.id} has invalid non-positive amount: ${entry.amount}`,
          entityId: entry.id,
        });
        continue;
      }
    } catch (err: unknown) {
      validationErrors.push({
        code: 'INVALID_AMOUNT',
        message: `Entry ${entry.id} amount cannot be parsed to integer minor units: ${(err as Error).message}`,
        entityId: entry.id,
      });
      continue;
    }

    // Guard 1D: Pengakuan Saldo Riil
    // Hanya entri dengan status 'POSTED' yang diakui menambah atau mengurangi kas riil
    if (entry.status === 'POSTED') {
      postedEntriesCount++;
      if (entry.type === 'CREDIT') {
        postedCreditTotal += amt;
      } else if (entry.type === 'DEBIT') {
        postedDebitTotal += amt;
      }
    }
  }

  // Hitung saldo buku kas resmi
  const postedBalance = postedCreditTotal - postedDebitTotal;

  // --------------------------------------------------------------------------
  // Langkah 2: Pemrosesan Dana Cadangan / Reservasi Aktif (Active Reservations)
  // --------------------------------------------------------------------------
  let activeReservationsTotal = 0n;
  let activeReservationsCount = 0;

  for (const res of reservations) {
    // Guard 2A: Validasi kecocokan ID dompet
    if (res.walletId !== walletId) {
      validationErrors.push({
        code: 'WALLET_ID_MISMATCH',
        message: `Reservation ${res.id} walletId ${res.walletId} does not match target ${walletId}`,
        entityId: res.id,
      });
      continue;
    }

    // Guard 2B: Validasi keselarasan mata uang
    if (res.currency.toUpperCase() !== currency.toUpperCase()) {
      validationErrors.push({
        code: 'CURRENCY_MISMATCH',
        message: `Reservation ${res.id} currency ${res.currency} does not match target ${currency}`,
        entityId: res.id,
      });
      continue;
    }

    // Guard 2C: Validasi nominal reservasi wajib bilangan bulat positif
    let amt: bigint;
    try {
      amt = toBigIntSafe(res.amount);
      if (amt <= 0n) {
        validationErrors.push({
          code: 'INVALID_AMOUNT',
          message: `Reservation ${res.id} has invalid non-positive amount: ${res.amount}`,
          entityId: res.id,
        });
        continue;
      }
    } catch (err: unknown) {
      validationErrors.push({
        code: 'INVALID_AMOUNT',
        message: `Reservation ${res.id} amount cannot be parsed: ${(err as Error).message}`,
        entityId: res.id,
      });
      continue;
    }

    // Guard 2D: Pemeriksaan status ACTIVE dan evaluasi masa kedaluwarsa (expiration)
    // Reservasi yang telah kedaluwarsa tidak lagi mengunci saldo kas
    if (res.status === 'ACTIVE') {
      const isExpired = res.expiresAt ? new Date(res.expiresAt).getTime() <= now : false;
      if (!isExpired) {
        activeReservationsTotal += amt;
        activeReservationsCount++;
      }
    }
  }

  // --------------------------------------------------------------------------
  // Langkah 3: Kalkulasi Saldo Tersedia (Available Balance)
  // Saldo tersedia adalah kapasitas belanja kas yang sebenarnya
  // --------------------------------------------------------------------------
  const availableBalance = postedBalance - activeReservationsTotal;

  // --------------------------------------------------------------------------
  // Langkah 4: Pemeriksaan Pelanggaran Saldo Defisit / Negatif
  // --------------------------------------------------------------------------
  if (!allowNegative && availableBalance < 0n) {
    validationErrors.push({
      code: 'NEGATIVE_BALANCE_NOT_ALLOWED',
      message: `Available balance (${availableBalance.toString()}) cannot be negative for wallet ${walletId}`,
    });
  }

  // Mengembalikan hasil kalkulasi lengkap
  return {
    walletId,
    currency,
    postedBalance,
    activeReservations: activeReservationsTotal,
    availableBalance,
    postedCreditTotal,
    postedDebitTotal,
    totalEntriesCount: entries.length,
    postedEntriesCount,
    activeReservationsCount,
    validationErrors,
    isValid: validationErrors.length === 0,
  };
}
