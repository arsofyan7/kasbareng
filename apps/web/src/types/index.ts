/**
 * ============================================================================
 * DEFINISI TIPE DATA & SKEMA INTERFACE UTAMA KASBARENG
 * ============================================================================
 * Berkas ini menyediakan definisi tipe TypeScript yang lengkap untuk seluruh
 * entitas domain aplikasi KasBareng, meliputi:
 * - Manajemen Pengguna & Peran Akses Dompet (RBAC)
 * - State Machine Transaksi Keuangan & Persetujuan Multi-Pihak
 * - Audit Trail Kriptografis (SHA-256 Merkle-like Hash Chain)
 * - Rekonsiliasi Mutasi Bank Otomatis (Algoritma 4 Lapisan)
 * - Papan Matriks Iuran Warga/Komunitas (Bulanan, Target Bertahap, Sukarela)
 */

// ----------------------------------------------------------------------------
// Peran Pengguna di Tingkat Dompet (Role-Based Access Control)
// ----------------------------------------------------------------------------
/**
 * Peran pengguna dalam satu dompet kas tertentu:
 * - ADMIN: Pemilik/ketua dompet dengan akses penuh (kebijakan, hapus, kelola anggota).
 * - PENGELOLA: Bendahara/sekretaris yang bertugas mencatat dan memverifikasi pembayaran.
 * - WARGA: Anggota biasa yang berpartisipasi membayar iuran dan melihat transparansi saldo.
 */
export type WalletRole = 'ADMIN' | 'PENGELOLA' | 'WARGA';

// ----------------------------------------------------------------------------
// Tipe & Status Alur Transaksi (Financial State Machine)
// ----------------------------------------------------------------------------
/**
 * Jenis arus kas transaksi:
 * - INCOME: Kas masuk (iuran warga, donasi, pendapatan sponsor, dll.)
 * - EXPENSE: Kas keluar (biaya operasional, perbaikan fasilitas, konsumsi, dll.)
 */
export type TransactionType = 'INCOME' | 'EXPENSE';

/**
 * Status siklus hidup transaksi mengikuti State Machine yang ketat:
 * - DRAFT: Draf transaksi baru yang belum diajukan.
 * - SUBMITTED: Diajukan oleh anggota/pengurus, menunggu proses evaluasi persetujuan.
 * - PENDING_APPROVAL: Sedang menunggu tanda tangan/approval kuorum pengurus.
 * - NEEDS_CLARIFICATION: Pengurus meminta perbaikan kuitansi atau keterangan tambahan.
 * - REJECTED: Ditolak oleh pengurus atau tidak memenuhi ambang batas persetujuan.
 * - APPROVED: Disetujui secara mufakat oleh pengurus yang berwenang.
 * - PAYMENT_PENDING: Menunggu eksekusi pembayaran / transfer dana.
 * - PAYMENT_VERIFICATION: Bukti bayar telah diunggah dan sedang dicek oleh bendahara.
 * - COMPLETED: Transaksi final, dana terposting, dan masuk ke buku besar (ledger).
 * - DISPUTED: Terdapat sanggahan/komplain dari warga terkait keabsahan bukti bayar.
 * - CANCELLED: Transaksi dibatalkan sebelum dieksekusi.
 */
export type TransactionState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'NEEDS_CLARIFICATION'
  | 'REJECTED'
  | 'APPROVED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_VERIFICATION'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'CANCELLED';

// ----------------------------------------------------------------------------
// Entitas Profil Pengguna Global
// ----------------------------------------------------------------------------
/**
 * Representasi akun pengguna terdaftar di platform KasBareng
 */
export interface User {
  /** Identifier unik UUID pengguna */
  id: string;
  /** Nama lengkap sesuai tanda pengenal */
  fullName: string;
  /** Alamat email unik untuk autentikasi */
  email: string;
  /** Status keaktifan akun pengguna */
  status: 'ACTIVE' | 'INACTIVE';
  /** Stempel waktu pendaftaran akun (format ISO-8601) */
  createdAt?: string;
}

// ----------------------------------------------------------------------------
// Entitas Dompet Kas Bersama (Multi-Tenant Shared Wallet)
// ----------------------------------------------------------------------------
/**
 * Dompet kas bersama yang menampung dana komunitas/organisasi
 */
export interface Wallet {
  /** Identifier unik UUID dompet */
  id: string;
  /** Nama dompet (misal: "Kas RT 05 Kemang", "Alumni Angkatan 2018") */
  name: string;
  /** Deskripsi tujuan atau aturan pengelolaan kas */
  description?: string | null;
  /** Mata uang yang digunakan (default: "IDR") */
  currency: string;
  /** Kode unik untuk mengundang anggota bergabung (contoh: "RT05-SEJAHTERA") */
  inviteCode?: string;
  /** Status siklus hidup dompet */
  status: 'ACTIVE' | 'ARCHIVED';
  /** Peran pengguna saat ini di dalam dompet ini */
  myRole: WalletRole;
  /** Jumlah total anggota aktif dalam dompet */
  memberCount: number;
  /** Total transaksi yang tercatat dalam dompet */
  transactionCount: number;
  /** Jumlah minimum persetujuan pengurus yang diperlukan untuk pengeluaran */
  requiredApprovals: number;
  /** Waktu ketika pengguna saat ini bergabung ke dompet */
  joinedAt?: string;
  /** Nomor versi konkurensi optimistik untuk mencegah race conditions */
  version?: number;
  /** Model iuran kas yang diterapkan: BULANAN, TARGET BERTAHAP, atau SUKARELA */
  duesType?: DuesType;
  /** Nominal iuran wajib per periode (dalam Rupiah) */
  duesAmount?: number | null;
  /** Jumlah target termin pembayaran iuran (berlaku untuk skema TARGET_INSTALLMENTS) */
  targetInstallmentsCount?: number | null;
}

/**
 * Data pratinjau publik dompet saat calon anggota memasukkan kode undangan (Invite Code)
 */
export interface WalletPreview {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  memberCount: number;
  inviteCode: string;
  createdAt?: string;
}

/**
 * Representasi keanggotaan pengguna di dalam dompet tertentu
 */
export interface WalletMember {
  /** Identifier relasi keanggotaan */
  id: string;
  /** UUID akun pengguna */
  userId: string;
  /** Nama lengkap anggota */
  fullName: string;
  /** Alamat email anggota */
  email: string;
  /** Hak akses di dompet ini (ADMIN, PENGELOLA, atau WARGA) */
  role: WalletRole;
  /** Status partisipasi anggota */
  status: 'ACTIVE' | 'INACTIVE';
  /** Tanggal anggota bergabung ke dompet */
  joinedAt: string;
}

// ----------------------------------------------------------------------------
// Kebijakan & Jejak Persetujuan Pengeluaran Kas (Approval Governance)
// ----------------------------------------------------------------------------
/**
 * Keputusan pengurus atas pengajuan transaksi
 */
export type ApprovalDecision = 'APPROVE' | 'REJECT';

/**
 * Rekam jejak persetujuan digital oleh satu pengurus
 */
export interface TransactionApproval {
  id: string;
  transactionId: string;
  approverId: string;
  decision: ApprovalDecision;
  /** Versi data transaksi saat disetujui (memastikan data tidak diubah pasca-approval) */
  transactionVersion: number;
  /** Versi aturan kebijakan approval yang berlaku saat penandatanganan */
  policyVersion: number;
  signedAt: string;
  /** Informasi profil singkat pengurus yang menyetujui */
  approver?: {
    id: string;
    fullName: string;
    email: string;
  };
}

/**
 * Catatan realisasi transfer dana dan bukti transfer perbankan
 */
export interface PaymentRecord {
  id: string;
  transactionId: string;
  paymentStatus: 'PENDING' | 'PAID' | 'VERIFIED' | 'REJECTED';
  paymentReference?: string | null;
  evidenceAttachmentId?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

/**
 * Aturan tata kelola persetujuan pengeluaran kas berdasarkan ambang batas nominal
 */
export interface ApprovalPolicy {
  id: string;
  walletId: string;
  /** Jumlah kuorum persetujuan minimum yang wajib dipenuhi */
  requiredApprovals: number;
  /** Batas nominal pengeluaran di atas mana aturan ini aktif */
  thresholdAmount?: number | null;
  policyVersion: number;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt?: string;
}

// ----------------------------------------------------------------------------
// Entitas Transaksi Kas (Financial Ledger Entry)
// ----------------------------------------------------------------------------
/**
 * Representasi penuh transaksi pencatatan pemasukan maupun pengeluaran kas
 */
export interface Transaction {
  id: string;
  walletId: string;
  creatorId: string;
  type: TransactionType;
  /** Nominal transaksi (selalu bilangan positif) */
  amount: number;
  currency: string;
  /** Kategori pos keuangan (misal: "Iuran Bulanan", "Konsumsi Rapat", "Perbaikan Lampu") */
  category: string;
  /** Catatan rincian operasional */
  notes?: string | null;
  /** ID lampiran file struk/kuitansi bukti transaksi */
  receiptAttachmentId?: string | null;
  /** Status alur saat ini di State Machine */
  state: TransactionState;
  /** Versi mutasi optimistik */
  version: number;
  createdAt: string;
  /** Profil pembuat/pencatat transaksi */
  creator?: {
    id: string;
    fullName: string;
    email: string;
  };
  /** Akumulasi jumlah approval yang telah diterima */
  approvalsCount?: number;
  eventsCount?: number;
  /** Daftar detail persetujuan dari pengurus */
  approvals?: TransactionApproval[];
  /** Daftar pembayaran/bukti transfer terkait transaksi ini */
  paymentRecords?: PaymentRecord[];
  /** Referensi ringkas ke dompet kas */
  wallet?: {
    id: string;
    name: string;
    currency: string;
    approvalPolicies?: ApprovalPolicy[];
  };
  /** Riwayat audit jejak perubahan status (Audit Trail Event Log) */
  events?: Array<{
    id: string;
    eventType: string;
    fromState: string | null;
    toState: string;
    transactionVersion: number;
    createdAt: string;
    metadata?: any;
    actor?: {
      id: string;
      fullName: string;
      email: string;
    };
  }>;
}

// ----------------------------------------------------------------------------
// Ringkasan Keuangan Dompet (Double-Entry Ledger Invariants)
// ----------------------------------------------------------------------------
/**
 * Ringkasan saldo dan metrik pembukuan ganda dompet kas
 */
export interface WalletSummary {
  walletId: string;
  currency: string;
  /** Saldo dana riil yang sudah final dibukukan */
  postedBalance: number;
  /** Saldo efektif siap pakai setelah dikurangi alokasi/reservasi transaksi berjalan */
  availableBalance: number;
  /** Total nominal dana yang sedang ditahan untuk transaksi dalam antrean persetujuan */
  activeReservations: number;
  /** Total akumulasi seluruh arus kas masuk yang pernah dibukukan */
  postedCreditTotal: number;
  /** Total akumulasi seluruh arus kas keluar yang pernah dibukukan */
  postedDebitTotal: number;
  /** Validitas matematis: postedBalance === (postedCreditTotal - postedDebitTotal) */
  isValid: boolean;
}

// ----------------------------------------------------------------------------
// Kriptografi Rantai Audit SHA-256 (Tamper-Evident Merkle Log)
// ----------------------------------------------------------------------------
/**
 * Satu blok catatan peristiwa yang terenkapsulasi dalam rantai hash tak terbantahkan
 */
export interface AuditLog {
  id: string;
  walletId: string;
  sequenceNo: number;
  eventId: string;
  payloadHash: string;
  previousHash: string;
  currentHash: string;
  createdAt: string;
  payload?: any;
}

/**
 * Hasil verifikasi integritas rantai hash kriptografis untuk menjamin anti-pemalsuan
 */
export interface AuditVerificationResult {
  /** True jika seluruh rantai hash valid dan tidak ada manipulasi data */
  valid: boolean;
  totalEvents: number;
  walletId: string;
  latestSequenceNo: number;
  latestCurrentHash: string;
  verifiedAt: string;
  failedIndex?: number;
  failedSequenceNo?: number;
  errorCode?: string;
  errorMessage?: string;
}

// ----------------------------------------------------------------------------
// Standar Format Respon API Backend
// ----------------------------------------------------------------------------
/**
 * Format amplop respon terstandarisasi untuk seluruh endpoint REST API KasBareng
 */
export interface ApiResponse<T> {
  data: T | null;
  meta: {
    request_id: string;
    timestamp?: string;
    [key: string]: unknown;
  };
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
}

// ----------------------------------------------------------------------------
// Rekonsiliasi Mutasi Bank Otomatis (Bank Reconciliation Engine)
// ----------------------------------------------------------------------------
/**
 * Arah mutasi rekening koran bank:
 * - CREDIT: Dana masuk ke rekening bank
 * - DEBIT: Dana keluar dari rekening bank
 */
export type MovementDirection = 'CREDIT' | 'DEBIT';

/**
 * Status pencocokan mutasi bank dengan transaksi internal aplikasi:
 * - MATCHED: Cocok pasti secara otomatis berdasarkan aturan deterministik
 * - AMBIGUOUS: Ditemukan lebih dari 1 kandidat transaksi internal yang cocok
 * - UNMATCHED: Belum ditemukan transaksi internal yang bersesuaian
 * - DUPLICATE_POTENTIAL: Terdeteksi ada kemungkinan pengulangan impor mutasi yang sama
 */
export type ReconciliationStatus = 'MATCHED' | 'AMBIGUOUS' | 'UNMATCHED' | 'DUPLICATE_POTENTIAL';

/**
 * Satu baris transaksi pada rekening koran (bank statement item)
 */
export interface BankStatementItem {
  id: string;
  sourceRowNumber: number;
  transactionDate: string;
  amount: number;
  direction: MovementDirection;
  description: string;
  externalReference: string | null;
  matchStatus: ReconciliationStatus;
  ruleCode: string;
  transactionId: string | null;
  /** Transaksi internal yang berhasil dicocokkan */
  transaction?: {
    id: string;
    category: string;
    amount: number;
    type: TransactionType;
    state: TransactionState;
    creatorName?: string;
    reference?: string;
  } | null;
  /** Kandidat transaksi jika statusnya ambigu */
  candidateTransactions?: Array<{
    id: string;
    category: string;
    amount: number;
    type: TransactionType;
    createdAt: string;
    reference?: string;
  }>;
}

/**
 * Transaksi internal kas yang belum memiliki pasangan di rekening koran bank
 */
export interface UnmatchedInternalTransaction {
  id: string;
  category: string;
  amount: number;
  type: TransactionType;
  state: TransactionState;
  createdAt: string;
  notes?: string | null;
  reference: string;
}

/**
 * Laporan ringkasan hasil rekonsiliasi mutasi rekening koran per batch impor
 */
export interface ReconciliationSummary {
  importBatchId?: string;
  totalBankMutations: number;
  matchedCount: number;
  ambiguousCount: number;
  unmatchedBankCount: number;
  unmatchedInternalCount: number;
  duplicateAlertsCount: number;
  /** Persentase akurasi pencocokan otomatis tanpa intervensi manual */
  precisionAutoMatchPercent: number;
  bankStatements: BankStatementItem[];
  unmatchedInternalTransactions: UnmatchedInternalTransaction[];
}

// ----------------------------------------------------------------------------
// Model Matriks Iuran Warga (Dues Management Matrix)
// ----------------------------------------------------------------------------
/**
 * Model skema penagihan iuran:
 * - MONTHLY: Iuran berulang tiap bulan (Januari - Desember)
 * - TARGET_INSTALLMENTS: Target dana tertentu yang dibagi menjadi N termin cicilan
 * - FREEFORM: Donasi/iuran sukarela tanpa ikatan nominal periodik kaku
 */
export type DuesType = 'MONTHLY' | 'TARGET_INSTALLMENTS' | 'FREEFORM';

/**
 * Status pelunasan iuran per periode tertentu:
 * - PENDING: Menunggu konfirmasi pembayaran oleh pengurus
 * - PAID: Sudah lunas terbayar
 * - CANCELLED: Dibatalkan atau dibebaskan
 */
export type DuesPaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED';

/**
 * Definisi kolom periode iuran pada tabel matriks
 */
export interface DuesPeriod {
  key: string;
  label: string;
  shortLabel: string;
  monthNumber?: number;
  year?: number;
}

/**
 * Satu baris data anggota dalam tabel matriks iuran beserta status tiap periode
 */
export interface DuesBoardMemberRow {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  /** Peta catatan iuran per periode, di mana key adalah periodKey (misal: "2026-03") */
  records: Record<
    string,
    {
      id: string;
      status: DuesPaymentStatus;
      amount: number;
      transactionId: string | null;
      receiptAttachmentId: string | null;
      updatedAt: string;
    }
  >;
  /** Total akumulasi nominal rupiah yang sudah lunas dibayar */
  totalPaidAmount: number;
  paidCount: number;
  pendingCount: number;
  unpaidCount: number;
  isFullyPaid: boolean;
}

/**
 * Ringkasan statistik kepatuhan dan agregasi pembayaran iuran seluruh komunitas
 */
export interface DuesBoardSummary {
  walletId: string;
  walletName: string;
  duesType: DuesType;
  duesAmount: number | null;
  targetInstallmentsCount: number | null;
  selectedYear: number;
  totalMembers: number;
  totalCollected: number;
  totalPending: number;
  totalTargetPotential: number;
  /** Rasio kepatuhan iuran warga dalam persentase */
  complianceRatePercent: number;
  /** Daftar nama warga yang belum melunasi kewajiban iuran */
  unpaidMembers: {
    userId: string;
    fullName: string;
    unpaidPeriods: string[];
  }[];
  /** Teks draf pesan penagihan otomatis yang siap dikirim melalui WhatsApp */
  whatsappReminderText: string;
}

/**
 * Paket lengkap data matriks iuran yang dikirimkan oleh API ke antarmuka frontend
 */
export interface DuesBoardResult {
  periods: DuesPeriod[];
  members: DuesBoardMemberRow[];
  summary: DuesBoardSummary;
}



