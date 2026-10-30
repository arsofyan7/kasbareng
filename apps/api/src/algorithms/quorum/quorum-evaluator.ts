/**
 * ============================================================================
 * MODUL ALGORITMA: EVALUATOR KUORUM PERSETUJUAN M-OF-N (M-OF-N QUORUM ENGINE)
 * ============================================================================
 *
 * FUNGSI MODUL:
 * Mengevaluasi apakah suatu usulan pengeluaran kas telah memenuhi ambang batas (threshold)
 * kuorum persetujuan M-dari-N pengurus yang sah secara objektif dan matematis.
 *
 * KONTEKS BISNIS & KEAMANAN FINANSIAL:
 * 1. Tata Kelola Demokratis Kas Komunitas (Multi-Signature Governance):
 *    Di kas paguyuban, RT/RW, atau organisasi nirlaba, uang kas rentan disalahgunakan
 *    apabila satu orang bendahara memiliki wewenang mencairkan uang secara sepihak.
 *    Sistem Kuorum M-of-N mewajibkan minimal M pengurus (misal: 2 dari 3 pengurus)
 *    memberikan persetujuan digital sebelum dana dapat dibelanjakan.
 * 2. Perlindungan Anti-Self Approval (Zero Conflict of Interest):
 *    Pembuat pengajuan (misal: Bendahara yang mengajukan reimburse konsumsi pos ronda)
 *    TIDAK BOLEH menyetujui pengeluarannya sendiri. Persetujuan harus datang dari
 *    pengurus lain (misal: Ketua RT dan Sekretaris) guna menghindari *moral hazard*.
 * 3. Proteksi Mutasi Versi Transaksi (Transaction Invalidation Guard):
 *    Jika seorang pembuat transaksi mengubah nominal atau detail transaksi setelah
 *    sebagian pengurus memberi approval (versi berubah), suara voting sebelumnya otomatis
 *    dibatalkan karena persetujuan tersebut diberikan untuk draf versi lama.
 * 4. Anti-Sybil & Deduplikasi Suara (One Person One Vote):
 *    Mencegah satu pengurus memberikan suara ganda secara sengaja maupun tidak sengaja.
 */

/**
 * Keputusan formal yang diambil oleh pengurus dalam sesi evaluasi transaksi:
 * - `APPROVE`: Menyetujui pengeluaran kas.
 * - `REJECT`: Menolak pengeluaran kas secara tegas.
 */
export type ApprovalDecision = 'APPROVE' | 'REJECT';

/**
 * Struktur data rekaman suara persetujuan/penolakan dari seorang pengurus.
 */
export interface ApprovalRecord {
  /** Identifier unik pengguna pengurus yang memberikan suara */
  approverId: string;
  /** Keputusan yang diambil (APPROVE atau REJECT) */
  decision: ApprovalDecision;
  /** Nomor versi transaksi saat suara ini diberikan (untuk mencegah approval injection pada versi berbeda) */
  transactionVersion: number;
  /** Nomor versi kebijakan kuorum dompet saat suara diberikan */
  policyVersion: number;
  /** Waktu suara dicatat */
  createdAt: string | Date;
  /** Catatan atau alasan opsional dari pengurus */
  comment?: string;
}

/**
 * Parameter input lengkap yang dibutuhkan untuk mengevaluasi kuorum.
 */
export interface QuorumInput {
  /** ID pembuat/inisiator transaksi (untuk penegakan aturan anti-self approval) */
  creatorId: string;
  /** Nomor versi transaksi aktif saat ini di basis data */
  transactionVersion: number;
  /** Nomor versi kebijakan kuorum yang sedang berlaku */
  policyVersion: number;
  /** Jumlah minimum persetujuan sah yang disyaratkan (M) */
  requiredApprovals: number;
  /** Daftar ID seluruh pengurus yang memiliki hak suara sah (N) */
  eligibleApproverIds: string[];
  /** Riwayat seluruh rekaman approval/rejection yang masuk */
  approvals: ApprovalRecord[];
  /** Opsi konfigurasi lanjutan */
  options?: {
    /** Izinkan pembuat menyetujui transaksinya sendiri (default: false / strictly forbidden) */
    allowSelfApproval?: boolean;
  };
}

/**
 * Rincian rekaman suara yang digugurkan / ditolak oleh mesin kuorum beserta alasannya.
 */
export interface RejectedApproval {
  /** ID pengurus yang suaranya tidak diakui */
  approverId: string;
  /**
   * Alasan penolakan suara:
   * - `DECISION_IS_NOT_APPROVE`: Suara bertipe REJECT, bukan persetujuan.
   * - `TRANSACTION_VERSION_MISMATCH`: Suara diberikan pada versi draf transaksi terdahulu.
   * - `POLICY_VERSION_MISMATCH`: Suara diberikan pada versi aturan kuorum terdahulu.
   * - `NOT_AN_ELIGIBLE_APPROVER`: Pengguna tidak memiliki wewenang peran (bukan pengurus).
   * - `SELF_APPROVAL_FORBIDDEN`: Pelanggaran aturan anti-self approval (pembuat voting dirinya sendiri).
   * - `DUPLICATE_APPROVAL`: Suara kedua dari pengurus yang sama diabaikan.
   */
  reason:
    | 'DECISION_IS_NOT_APPROVE'
    | 'TRANSACTION_VERSION_MISMATCH'
    | 'POLICY_VERSION_MISMATCH'
    | 'NOT_AN_ELIGIBLE_APPROVER'
    | 'SELF_APPROVAL_FORBIDDEN'
    | 'DUPLICATE_APPROVAL';
  /** Keterangan tambahan */
  details?: string;
}

/**
 * Hasil akhir evaluasi kuorum M-of-N.
 */
export interface QuorumResult {
  /** Menandakan apakah transaksi resmi disetujui (validApprovalCount >= requiredApprovals) */
  approved: boolean;
  /** Target kuorum M yang harus dicapai */
  requiredApprovals: number;
  /** Jumlah suara sah yang terverifikasi dan memenuhi seluruh kriteria */
  validApprovalCount: number;
  /** Total banyaknya pengurus berhak (N) */
  eligibleApproverCount: number;
  /** Daftar ID pengurus yang suaranya diakui sah */
  validApproverIds: string[];
  /** Daftar suara yang digugurkan oleh sistem beserta rincian alasannya */
  rejectedApprovals: RejectedApproval[];
  /** Menandakan apakah terdapat keputusan REJECT eksplisit dari pengurus */
  hasRejectionDecision: boolean;
  /** Kesalahan konfigurasi sistem jika batas kuorum tidak masuk akal secara matematis */
  configurationError?: string;
}

/**
 * Mengevaluasi ketercapaian kuorum M-of-N secara deterministik (Pure Function).
 *
 * Alur Kerja Evaluasi:
 * 1. Validasi Batas Konfigurasi (Boundary Validation):
 *    - `requiredApprovals` (M) minimal bernilai 1.
 *    - `requiredApprovals` (M) tidak boleh melebihi jumlah pengurus berhak (N).
 * 2. Filtrasi dan Verifikasi Setiap Suara (Filtering & Anti-Fraud Checks):
 *    - Penolakan suara eksplisit (REJECT).
 *    - Pencegahan Stale Version (Transaction Version & Policy Version Match).
 *    - Pemeriksaan Wewenang (Eligible Approver Check).
 *    - Pencegahan Konflik Kepentingan (Anti-Self Approval Guard).
 *    - Pencegahan Suara Ganda (Deduplication Check).
 * 3. Keputusan Kuorum:
 *    - `approved: true` jika dan hanya jika total suara sah >= target M.
 *
 * @param input - Konfigurasi dan kumpulan suara pada QuorumInput.
 * @returns QuorumResult dengan transparansi penuh atas suara sah dan suara yang ditolak.
 */
export function evaluateQuorum(input: QuorumInput): QuorumResult {
  const {
    creatorId,
    transactionVersion,
    policyVersion,
    requiredApprovals,
    eligibleApproverIds,
    approvals,
    options = {},
  } = input;

  const allowSelfApproval = options.allowSelfApproval ?? false;
  const eligibleSet = new Set(eligibleApproverIds);
  const rejectedApprovals: RejectedApproval[] = [];
  const validApproverSet = new Set<string>();
  let hasRejectionDecision = false;

  // --------------------------------------------------------------------------
  // Langkah 1: Validasi Batas & Invarian Konfigurasi Kebijakan
  // --------------------------------------------------------------------------
  // Kuorum tidak boleh bernilai kurang dari 1 (pengeluaran wajib ada yang menyetujui)
  if (requiredApprovals < 1) {
    return {
      approved: false,
      requiredApprovals,
      validApprovalCount: 0,
      eligibleApproverCount: eligibleSet.size,
      validApproverIds: [],
      rejectedApprovals: [],
      hasRejectionDecision: false,
      configurationError: 'requiredApprovals (M) must be at least 1.',
    };
  }

  // Syarat kuorum M tidak boleh lebih besar dari total pengurus sah yang ada (N)
  // karena akan menjadi kondisi deadlock permanen yang mustahil terpenuhi.
  if (requiredApprovals > eligibleSet.size) {
    return {
      approved: false,
      requiredApprovals,
      validApprovalCount: 0,
      eligibleApproverCount: eligibleSet.size,
      validApproverIds: [],
      rejectedApprovals: [],
      hasRejectionDecision: false,
      configurationError: `requiredApprovals (${requiredApprovals}) cannot exceed eligible approver count (${eligibleSet.size}).`,
    };
  }

  // --------------------------------------------------------------------------
  // Langkah 2: Pemrosesan Riwayat Suara Masuk (Approvals Processing)
  // --------------------------------------------------------------------------
  for (const record of approvals) {
    // Guard 2A: Penanganan Keputusan Tolak (REJECT)
    // Jika ada pengurus yang menolak, tandai `hasRejectionDecision: true` untuk alerting
    if (record.decision === 'REJECT') {
      hasRejectionDecision = true;
      rejectedApprovals.push({
        approverId: record.approverId,
        reason: 'DECISION_IS_NOT_APPROVE',
        details: 'Explicit rejection submitted.',
      });
      continue;
    }

    // Guard 2B: Pemeriksaan Kesesuaian Versi Transaksi (Anti-Stale Approval)
    // Suara yang diberikan pada versi draf lama tidak boleh dihitung jika draf telah diedit
    if (record.transactionVersion !== transactionVersion) {
      rejectedApprovals.push({
        approverId: record.approverId,
        reason: 'TRANSACTION_VERSION_MISMATCH',
        details: `Approval was on tx version ${record.transactionVersion}, expected ${transactionVersion}`,
      });
      continue;
    }

    // Guard 2C: Pemeriksaan Kesesuaian Versi Kebijakan Kuorum
    // Menolak suara jika aturan kuorum telah berubah sejak voting diberikan
    if (record.policyVersion !== policyVersion) {
      rejectedApprovals.push({
        approverId: record.approverId,
        reason: 'POLICY_VERSION_MISMATCH',
        details: `Approval was on policy version ${record.policyVersion}, expected ${policyVersion}`,
      });
      continue;
    }

    // Guard 2D: Pemeriksaan Kelayakan Hak Suara (Role/Eligibility Check)
    // Memastikan pemberi suara terdaftar sebagai pengurus aktif yang sah
    if (!eligibleSet.has(record.approverId)) {
      rejectedApprovals.push({
        approverId: record.approverId,
        reason: 'NOT_AN_ELIGIBLE_APPROVER',
        details: `${record.approverId} is not in the eligible approvers list.`,
      });
      continue;
    }

    // Guard 2E: Penegakan Aturan Anti-Self Approval
    // Mencegah konflik kepentingan: pembuat transaksi dilarang menyetujui pengajuannya sendiri
    if (!allowSelfApproval && record.approverId === creatorId) {
      rejectedApprovals.push({
        approverId: record.approverId,
        reason: 'SELF_APPROVAL_FORBIDDEN',
        details: 'Transaction creator cannot approve their own transaction.',
      });
      continue;
    }

    // Guard 2F: Deduplikasi Suara (One Approver One Vote)
    // Mengabaikan suara duplikat dari pengguna yang sama
    if (validApproverSet.has(record.approverId)) {
      rejectedApprovals.push({
        approverId: record.approverId,
        reason: 'DUPLICATE_APPROVAL',
        details: `Duplicate approval from ${record.approverId} ignored.`,
      });
      continue;
    }

    // Suara lolos seluruh filter dan diakui sah secara hukum sistem
    validApproverSet.add(record.approverId);
  }

  // --------------------------------------------------------------------------
  // Langkah 3: Penentuan Akhir Ketercapaian Kuorum
  // --------------------------------------------------------------------------
  const validApproverIds = Array.from(validApproverSet);
  const validApprovalCount = validApproverIds.length;
  // Kuorum terpenuhi jika jumlah suara sah mencapai atau melampaui requiredApprovals
  const approved = validApprovalCount >= requiredApprovals;

  return {
    approved,
    requiredApprovals,
    validApprovalCount,
    eligibleApproverCount: eligibleSet.size,
    validApproverIds,
    rejectedApprovals,
    hasRejectionDecision,
  };
}
