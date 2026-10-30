/**
 * ============================================================================
 * MODUL ALGORITMA: VALIDATOR TRANSISI STATUS FINANSIAL (FINITE STATE MACHINE - FSM)
 * ============================================================================
 *
 * FUNGSI MODUL:
 * Mengatur dan memvalidasi seluruh siklus hidup (lifecycle) transaksi keuangan kas
 * secara matematis menggunakan model Finite State Machine (FSM) berbasis tabel aturan.
 *
 * KONTEKS BISNIS & KEAMANAN FINANSIAL:
 * Dalam sistem perbendaharaan bersama (multi-treasury Kasbareng):
 * 1. Pencegahan Bypass Otorisasi: Pengguna tidak boleh melompati tahapan tata kelola.
 *    Misalnya: DRAFT tidak boleh langsung melompat menjadi COMPLETED tanpa melalui
 *    persetujuan kuorum (APPROVAL) dan eksekusi pembayaran (PAYMENT).
 * 2. Integritas Dana & Anti-Double Spending: Transaksi yang telah mencapai status
 *    akhir (TERMINAL) seperti COMPLETED, REJECTED, atau CANCELLED dikunci secara permanen.
 * 3. Pencegahan Race Condition (Optimistic Concurrency Control): Memastikan bahwa
 *    dua pengurus tidak mengeksekusi aksi yang berkonflik secara bersamaan
 *    dengan memvalidasi `expectedVersion` vs `currentVersion`.
 * 4. Dual-Control Enforcement: Memastikan bukti transfer telah diverifikasi dan
 *    buku kas (double-entry ledger) telah diposting sebelum transaksi dianggap tuntas.
 *
 * Sifat Algoritma: Pure Function — Deterministik, tanpa efek samping (zero side-effects),
 * dan mudah diuji secara terisolasi (testable).
 */

/**
 * Representasi seluruh kemungkinan status (state) dalam siklus hidup transaksi.
 *
 * - `DRAFT`: Draf awal pengeluaran kas yang baru dicatat oleh pembuat transaksi.
 * - `SUBMITTED`: Transaksi telah diajukan secara resmi dan menunggu tahapan berikutnya.
 * - `PENDING_APPROVAL`: Transaksi sedang dalam proses pengumpulan suara persetujuan kuorum.
 * - `APPROVED`: Kuorum terpenuhi; transaksi disetujui untuk dieksekusi pembayarannya.
 * - `REJECTED`: Transaksi ditolak oleh pengurus berwenang atau tidak memenuhi kuorum (Terminal).
 * - `PAYMENT_PENDING`: Pembayaran sedang diproses ke rekening/tujuan eksternal.
 * - `COMPLETED`: Pembayaran selesai, bukti bayar diverifikasi, dan saldo kas resmi terpotong (Terminal).
 * - `CANCELLED`: Transaksi dibatalkan sebelum dieksekusi (Terminal).
 */
export type TransactionState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAYMENT_PENDING'
  | 'COMPLETED'
  | 'CANCELLED';

/**
 * Daftar peristiwa (events) atau aksi nyata pengguna yang dapat memicu transisi status.
 *
 * - `SUBMIT`: Pengajuan draf transaksi ke sistem.
 * - `REQUEST_APPROVAL`: Membuka sesi voting kuorum kepada para pengurus yang berhak.
 * - `APPROVE_WITH_QUORUM`: Pencatatan persetujuan kuorum yang sah (M-of-N terpenuhi).
 * - `REJECT`: Penolakan transaksi oleh salah satu pengurus yang berhak.
 * - `CANCEL`: Pembatalan transaksi oleh pembuat atau admin.
 * - `INITIATE_PAYMENT`: Memulai proses pencairan atau pengiriman dana kas.
 * - `PAYMENT_FAILED`: Pembayaran gagal di gateway/bank, mengembalikan status untuk dicoba ulang.
 * - `CONFIRM_PAYMENT`: Konfirmasi akhir bahwa dana telah keluar dan bukti bayar terverifikasi.
 */
export type TransactionEvent =
  | 'SUBMIT'
  | 'REQUEST_APPROVAL'
  | 'APPROVE_WITH_QUORUM'
  | 'REJECT'
  | 'CANCEL'
  | 'INITIATE_PAYMENT'
  | 'PAYMENT_FAILED'
  | 'CONFIRM_PAYMENT';

/**
 * Konteks tambahan yang disertakan saat mengevaluasi transisi status.
 * Digunakan oleh fungsi *guard* untuk memeriksa prasyarat keamanan dan konsistensi data.
 */
export interface TransitionContext {
  /** Versi data yang diharapkan oleh klien saat aksi dipicu (Optimistic Locking) */
  expectedVersion?: number;
  /** Versi aktual data transaksi di basis data saat ini */
  currentVersion?: number;
  /** Flag penanda apakah kuorum persetujuan M-of-N telah terpenuhi */
  quorumSatisfied?: boolean;
  /** Flag penanda apakah bukti transfer fisik/digital telah divalidasi keabsahannya */
  paymentVerified?: boolean;
  /** Flag penanda apakah entri jurnal buku kas berpasangan (double-entry ledger) telah diposting */
  ledgerPosted?: boolean;
  /** Alasan spesifik jika transaksi ditolak (untuk kebutuhan audit trail) */
  rejectionReason?: string;
  /** Alasan spesifik jika transaksi dibatalkan */
  cancellationReason?: string;
  /** Metadata tambahan fleksibel untuk kebutuhan audit lanjutan */
  metadata?: Record<string, unknown>;
}

/**
 * Struktur data input yang dikirimkan ke fungsi validator transisi.
 */
export interface TransitionInput {
  /** Status transaksi saat ini sebelum transisi */
  currentState: TransactionState;
  /** Peristiwa/aksi yang memicu percobaan perpindahan status */
  event: TransactionEvent;
  /** Konteks pendukung untuk evaluasi guard dan konkurensi */
  context?: TransitionContext;
}

/**
 * Kode error standar yang dikembalikan ketika transisi FSM ditolak.
 * Memudahkan API layer dan UI untuk menampilkan pesan kesalahan yang spesifik.
 *
 * - `INVALID_STATE_TRANSITION`: Peristiwa tidak diizinkan pada status saat ini.
 * - `VERSION_MISMATCH`: Terjadi tabrakan konkurensi (optimistic locking conflict).
 * - `QUORUM_NOT_MET`: Syarat kuorum persetujuan pengurus belum terpenuhi.
 * - `PAYMENT_NOT_VERIFIED`: Bukti pembayaran belum diverifikasi.
 * - `LEDGER_NOT_POSTED`: Pembukuan kas double-entry belum dicatat.
 * - `TERMINAL_STATE`: Transaksi sudah berada di status akhir yang tidak dapat diubah lagi.
 */
export type TransitionErrorCode =
  | 'INVALID_STATE_TRANSITION'
  | 'VERSION_MISMATCH'
  | 'QUORUM_NOT_MET'
  | 'PAYMENT_NOT_VERIFIED'
  | 'LEDGER_NOT_POSTED'
  | 'TERMINAL_STATE';

/**
 * Objek hasil evaluasi transisi FSM.
 */
export interface TransitionResult {
  /** Bernilai true jika transisi sah dan diizinkan; false jika ditolak */
  allowed: boolean;
  /** Status transaksi saat evaluasi dilakukan */
  currentState: TransactionState;
  /** Status baru yang sah jika allowed bernilai true */
  nextState?: TransactionState;
  /** Kode error jika transisi ditolak (allowed: false) */
  errorCode?: TransitionErrorCode;
  /** Pesan penjelasan penyebab penolakan dalam bahasa manusia */
  errorMessage?: string;
}

/**
 * Definisi aturan transisi individual dalam tabel FSM.
 */
interface TransitionRule {
  /** Status awal yang disyaratkan */
  from: TransactionState;
  /** Event pemicu yang harus cocok */
  event: TransactionEvent;
  /** Status tujuan jika syarat terpenuhi */
  to: TransactionState;
  /**
   * Fungsi guard opsional: Evaluasi logika bisnis kondisional tambahan.
   * Mengembalikan ok: true jika syarat khusus terpenuhi, atau ok: false beserta kode error.
   */
  guard?: (context?: TransitionContext) => { ok: boolean; errorCode?: TransitionErrorCode; errorMsg?: string };
}

/**
 * ============================================================================
 * TABEL ATURAN TRANSISI RESMI (FSM TRANSITION RULES TABLE)
 * ============================================================================
 * Mendefinisikan seluruh jalur perpindahan status yang legal dalam sistem Kasbareng.
 * Setiap kombinasi (from, event) yang tidak terdaftar di sini otomatis dianggap ILEGAL.
 */
const TRANSITION_RULES: TransitionRule[] = [
  // --------------------------------------------------------------------------
  // 1. Transisi dari Status DRAFT
  // Pada tahap draf, pembuat transaksi dapat mengajukan (SUBMIT) draf
  // atau membatalkannya (CANCEL) jika draf tersebut salah input.
  // --------------------------------------------------------------------------
  {
    from: 'DRAFT',
    event: 'SUBMIT',
    to: 'SUBMITTED',
  },
  {
    from: 'DRAFT',
    event: 'CANCEL',
    to: 'CANCELLED',
  },

  // --------------------------------------------------------------------------
  // 2. Transisi dari Status SUBMITTED
  // Setelah diajukan, transaksi dapat diteruskan ke sesi voting persetujuan pengurus,
  // dibatalkan, atau langsung ditolak sebelum sesi approval dimulai.
  // --------------------------------------------------------------------------
  {
    from: 'SUBMITTED',
    event: 'REQUEST_APPROVAL',
    to: 'PENDING_APPROVAL',
  },
  {
    from: 'SUBMITTED',
    event: 'CANCEL',
    to: 'CANCELLED',
  },
  {
    from: 'SUBMITTED',
    event: 'REJECT',
    to: 'REJECTED',
  },

  // --------------------------------------------------------------------------
  // 3. Transisi dari Status PENDING_APPROVAL
  // Sesi pengumpulan suara pengurus (M-of-N Quorum).
  // Transisi ke APPROVED dijaga ketat oleh Guard Kuorum.
  // --------------------------------------------------------------------------
  {
    from: 'PENDING_APPROVAL',
    event: 'APPROVE_WITH_QUORUM',
    to: 'APPROVED',
    // Guard: Memastikan status kuorum telah terpenuhi secara eksplisit
    guard: (ctx) => {
      if (ctx && ctx.quorumSatisfied === false) {
        return {
          ok: false,
          errorCode: 'QUORUM_NOT_MET',
          errorMsg: 'Quorum M-of-N requirements have not been satisfied.',
        };
      }
      return { ok: true };
    },
  },
  {
    from: 'PENDING_APPROVAL',
    event: 'REJECT',
    to: 'REJECTED',
  },
  {
    from: 'PENDING_APPROVAL',
    event: 'CANCEL',
    to: 'CANCELLED',
  },

  // --------------------------------------------------------------------------
  // 4. Transisi dari Status APPROVED
  // Pengeluaran yang telah disetujui kuorum siap dieksekusi oleh bendahara.
  // Bendahara menginisiasi pembayaran ke rekening pihak ketiga atau kas tunai.
  // --------------------------------------------------------------------------
  {
    from: 'APPROVED',
    event: 'INITIATE_PAYMENT',
    to: 'PAYMENT_PENDING',
  },
  {
    from: 'APPROVED',
    event: 'CANCEL',
    to: 'CANCELLED',
  },

  // --------------------------------------------------------------------------
  // 5. Transisi dari Status PAYMENT_PENDING
  // Memerlukan Dual-Verification Guard sebelum menjadi COMPLETED:
  // (a) Bukti transfer/pembayaran valid (`paymentVerified: true`).
  // (b) Mutasi saldo di buku kas berpasangan telah diposting (`ledgerPosted: true`).
  // Jika transfer bank gagal/timeout, status dikembalikan ke APPROVED untuk dicoba ulang.
  // --------------------------------------------------------------------------
  {
    from: 'PAYMENT_PENDING',
    event: 'CONFIRM_PAYMENT',
    to: 'COMPLETED',
    guard: (ctx) => {
      // Guard A: Bukti pembayaran fisik/digital harus sudah diverifikasi
      if (!ctx?.paymentVerified) {
        return {
          ok: false,
          errorCode: 'PAYMENT_NOT_VERIFIED',
          errorMsg: 'Payment proof must be verified before marking completed.',
        };
      }
      // Guard B: Jurnal buku kas (double-entry ledger) wajib sudah diposting
      if (!ctx?.ledgerPosted) {
        return {
          ok: false,
          errorCode: 'LEDGER_NOT_POSTED',
          errorMsg: 'Ledger entry must be posted before completing transaction.',
        };
      }
      return { ok: true };
    },
  },
  {
    from: 'PAYMENT_PENDING',
    event: 'PAYMENT_FAILED',
    to: 'APPROVED', // Mengembalikan ke APPROVED agar bendahara bisa mencoba metode bayar lain
  },
];

/**
 * Kumpulan status terminal (titik akhir yang tidak dapat diubah lagi).
 * Transaksi yang sudah berada di salah satu status ini bersifat immutable (kekal).
 * Tidak ada event apa pun yang dapat memindahkan transaksi keluar dari status terminal.
 * Hal ini esensial untuk mencegah manipulasi histori finansial masa lalu.
 */
const TERMINAL_STATES: ReadonlySet<TransactionState> = new Set([
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
]);

/**
 * Memvalidasi transisi status transaksi berdasarkan aturan formal FSM Kasbareng.
 *
 * Alur Pemeriksaan Bertingkat:
 * 1. Pemeriksaan Status Terminal: Mencegah mutasi pada transaksi yang sudah final.
 * 2. Pemeriksaan Versi Konkurensi: Mencegah race condition (Optimistic Concurrency Control).
 * 3. Pencarian Aturan Valid: Memastikan kombinasi `currentState` dan `event` ada di tabel.
 * 4. Eksekusi Guard Kondisional: Memeriksa prasyarat bisnis (kuorum, bukti bayar, ledger).
 * 5. Keputusan Sukses: Menghasilkan status berikutnya (`nextState`).
 *
 * @param input - Objek input berisi currentState, event, dan context pendukung.
 * @returns TransitionResult yang menandakan apakah transisi diizinkan beserta status barunya.
 */
export function validateTransition(input: TransitionInput): TransitionResult {
  const { currentState, event, context } = input;

  // --------------------------------------------------------------------------
  // Langkah 1: Guard Status Terminal
  // Transaksi yang telah COMPLETED, CANCELLED, atau REJECTED tidak boleh diubah lagi.
  // --------------------------------------------------------------------------
  if (TERMINAL_STATES.has(currentState)) {
    return {
      allowed: false,
      currentState,
      errorCode: 'TERMINAL_STATE',
      errorMessage: `Cannot transition from terminal state ${currentState}.`,
    };
  }

  // --------------------------------------------------------------------------
  // Langkah 2: Guard Konkurensi Versi (Optimistic Locking)
  // Menghindari masalah kehilangan pembaruan (lost update) saat dua pengurus
  // membuka halaman yang sama dan mencoba mengambil tindakan secara simultan.
  // --------------------------------------------------------------------------
  if (
    context?.expectedVersion !== undefined &&
    context?.currentVersion !== undefined &&
    context.expectedVersion !== context.currentVersion
  ) {
    return {
      allowed: false,
      currentState,
      errorCode: 'VERSION_MISMATCH',
      errorMessage: `Version mismatch: current is ${context.currentVersion}, expected ${context.expectedVersion}.`,
    };
  }

  // --------------------------------------------------------------------------
  // Langkah 3: Pencocokan Aturan di Tabel Transisi FSM
  // Menemukan aturan resmi yang mengizinkan perpindahan dari currentState via event.
  // --------------------------------------------------------------------------
  const rule = TRANSITION_RULES.find(
    (r) => r.from === currentState && r.event === event
  );

  if (!rule) {
    return {
      allowed: false,
      currentState,
      errorCode: 'INVALID_STATE_TRANSITION',
      errorMessage: `Invalid state transition: from ${currentState} via event ${event}.`,
    };
  }

  // --------------------------------------------------------------------------
  // Langkah 4: Evaluasi Fungsi Guard Spesifik Aturan
  // Menguji prasyarat bisnis khusus (contoh: kecukupan kuorum, verifikasi pembayaran).
  // --------------------------------------------------------------------------
  if (rule.guard) {
    const guardResult = rule.guard(context);
    if (!guardResult.ok) {
      return {
        allowed: false,
        currentState,
        errorCode: guardResult.errorCode,
        errorMessage: guardResult.errorMsg,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Langkah 5: Transisi Sah dan Diterima
  // Mengembalikan izin transisi beserta nama status baru (nextState).
  // --------------------------------------------------------------------------
  return {
    allowed: true,
    currentState,
    nextState: rule.to,
  };
}
