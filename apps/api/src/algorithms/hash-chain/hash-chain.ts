/**
 * ============================================================================
 * MODUL ALGORITMA: RANTAI AUDIT KRIPTOGRAFIS ANTI-MANIPULASI (TAMPER-EVIDENT HASH CHAIN)
 * ============================================================================
 *
 * FUNGSI MODUL:
 * Menyediakan struktur audit log berbasis linked hash-chain (serupa prinsip blockchain/Merkle chain)
 * yang menghubungkan setiap mutasi keuangan dan aksi administratif secara kriptografis menggunakan SHA-256.
 *
 * KONTEKS BISNIS & KEAMANAN FINANSIAL:
 * Pada sistem keuangan komunitas, salah satu risiko kecurangan terbesar adalah "midnight editing"
 * (pengurus atau pemilik akses database mengubah angka di baris transaksi masa lalu secara diam-diam).
 *
 * Mekanisme Perlindungan Hash Chain:
 * 1. Setiap blok kejadian (event) memiliki `payloadHash` yang merepresentasikan data transaksi murni.
 * 2. Blok tersebut menyertakan `previousHash`, yaitu hash dari blok kejadian tepat sebelumnya.
 * 3. Hash blok saat ini (`currentHash`) dihitung dari amplop (envelope) yang memuat `sequenceNo`,
 *    `previousHash`, `payloadHash`, `walletId`, dan `serverTimestamp`.
 * 4. Efek Rantai Kriptografis (Avalanche Effect):
 *    Jika seseorang mengubah 1 karakter saja pada transaksi masa lalu di tabel database,
 *    `payloadHash` blok tersebut akan berubah -> `currentHash` blok tersebut berubah ->
 *    `previousHash` blok berikutnya menjadi tidak cocok -> SELURUH RANTAI SETELAHNYA RUSAK SECARA INSTAN.
 * 5. Mesin audit dapat memverifikasi seluruh rantai kapan saja dan langsung menunjukkan:
 *    - Apakah data masih asli atau telah dimanipulasi.
 *    - Pada indeks nomor berapa dan urutan transaksi mana kerusakan/manipulasi terjadi.
 */

import { createHash } from 'node:crypto';
import { canonicalizeJson } from '../canonicalization/canonical-json';

/**
 * Hash jangkar awal (Genesis Anchor) untuk setiap dompet (wallet) baru.
 * Berupa 64 karakter heksadesimal nol (256-bit zeros), menandai awal mula rantai kejadian
 * sebelum ada transaksi apa pun yang tercatat.
 */
export const GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Parameter input mentah yang dibutuhkan untuk mencetak satu blok kejadian hash chain baru.
 */
export interface HashChainEventInput {
  /** ID unik dompet/komunitas tempat transaksi ini berlangsung */
  walletId: string;
  /** Nomor urut sekuensial event (wajib bernilai 1 untuk Genesis, 2, 3, dst.) */
  sequenceNo: number;
  /** Payload bisnis (dapat berupa string kanonikal atau objek JavaScript mentah) */
  canonicalPayload: string | Record<string, unknown>;
  /** Hash dari event sebelumnya (atau GENESIS_PREVIOUS_HASH jika ini event pertama) */
  previousHash: string;
  /** Timestamp waktu server saat event dicatat (ISO-8601 UTC) */
  serverTimestamp: string;
}

/**
 * Struktur data lengkap satu blok kejadian yang tersimpan di dalam rantai audit (Hash Chain Event).
 */
export interface HashChainEvent {
  /** ID unik dompet kas */
  walletId: string;
  /** Nomor urut sekuensial yang monotonik (1, 2, 3, ...) */
  sequenceNo: number;
  /** Digest SHA-256 dari payload transaksi yang telah dikanonikalkan */
  payloadHash: string;
  /** Tautan kriptografis ke blok sebelumnya */
  previousHash: string;
  /** Digest SHA-256 dari seluruh envelope metadata blok ini */
  currentHash: string;
  /** Waktu pencatatan resmi di server */
  serverTimestamp: string;
  /** String JSON payload dalam bentuk kanonikal (RFC 8785) */
  canonicalPayload: string;
}

/**
 * Hasil laporan komprehensif dari proses verifikasi integritas rantai audit.
 */
export interface VerificationResult {
  /** Bernilai true jika rantai 100% utuh tanpa manipulasi, false jika ditemukan kerusakan */
  valid: boolean;
  /** Total banyaknya blok event yang diperiksa */
  totalEvents: number;
  /** Indeks array di mana manipulasi pertama kali terdeteksi (0-based) */
  failedIndex?: number;
  /** Nomor urut sequenceNo pada blok yang mengalami kegagalan validasi */
  failedSequenceNo?: number;
  /** Kode klasifikasi penyebab kerusakan data */
  errorCode?:
    | 'INVALID_SEQUENCE'
    | 'INVALID_PREVIOUS_HASH'
    | 'PAYLOAD_HASH_MISMATCH'
    | 'CURRENT_HASH_MISMATCH'
    | 'GENESIS_HASH_MISMATCH';
  /** Pesan penjelasan teknis mengenai anomali yang ditemukan */
  errorMessage?: string;
}

/**
 * Menghitung nilai hash SHA-256 dari string UTF-8 sembarang.
 *
 * @param data - String teks masukan yang akan di-hash.
 * @returns String heksadesimal 64 karakter hasil enkripsi satu arah SHA-256.
 */
export function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Mengkalkulasi dan mencetak blok kejadian baru dalam rantai audit hash chain.
 *
 * Tahapan Komputasi:
 * 1. Normalisasi payload menjadi string JSON kanonikal (RFC 8785) deterministik.
 * 2. Hitung `payloadHash` dari string kanonikal tersebut via SHA-256.
 * 3. Bentuk objek envelope yang mengikat metadata keamanan (payloadHash, previousHash, sequenceNo, dsb).
 * 4. Kanonikalkan envelope dan hitung `currentHash` via SHA-256.
 *
 * @param input - Objek input berisi walletId, sequenceNo, canonicalPayload, previousHash, dan timestamp.
 * @returns HashChainEvent lengkap yang siap disimpan ke basis data audit.
 */
export function computeHashChainEvent(input: HashChainEventInput): HashChainEvent {
  // --------------------------------------------------------------------------
  // Langkah 1 & 2: Normalisasi Payload dan Kalkulasi Payload Hash
  // Memastikan bahwa representasi teks data transaksi seragam di semua lingkungan.
  // --------------------------------------------------------------------------
  const normalizedPayload = typeof input.canonicalPayload === 'string'
    ? input.canonicalPayload
    : canonicalizeJson(input.canonicalPayload);

  const payloadHash = sha256Hex(normalizedPayload);

  // --------------------------------------------------------------------------
  // Langkah 3: Penyusunan Amplop Metadata (Envelope Data)
  // Amplop ini mengikat identitas wallet, urutan, timestamp, serta tautan hash sebelumnya
  // sehingga data tidak dapat dipindahkan ke wallet lain atau diubah urutan waktunya.
  // --------------------------------------------------------------------------
  const envelopeData = {
    canonicalPayloadHash: payloadHash,
    previousHash: input.previousHash,
    sequenceNo: input.sequenceNo,
    serverTimestamp: input.serverTimestamp,
    walletId: input.walletId,
  };

  // --------------------------------------------------------------------------
  // Langkah 4: Kanonikalisasi Envelope dan Perhitungan Current Hash
  // --------------------------------------------------------------------------
  const canonicalEnvelope = canonicalizeJson(envelopeData);
  const currentHash = sha256Hex(canonicalEnvelope);

  // Mengembalikan objek event lengkap
  return {
    walletId: input.walletId,
    sequenceNo: input.sequenceNo,
    payloadHash,
    previousHash: input.previousHash,
    currentHash,
    serverTimestamp: input.serverTimestamp,
    canonicalPayload: normalizedPayload,
  };
}

/**
 * Memverifikasi keaslian dan integritas matematis dari rangkaian event hash chain.
 *
 * Logika Pengujian Berlapis untuk Setiap Blok:
 * 1. Verifikasi Urutan Monotonik (Monotonic Sequence Integrity):
 *    sequenceNo harus selalu bernilai index + 1 (mulai dari 1 tanpa celah atau lompatan).
 * 2. Verifikasi Tautan Kriptografis (Cryptographic Linkage):
 *    - Blok pertama (indeks 0) wajib berakar ke `GENESIS_PREVIOUS_HASH`.
 *    - Blok berikutnya (indeks i) wajib memiliki `previousHash` yang sama persis
 *      dengan `currentHash` blok (i - 1).
 * 3. Verifikasi Keaslian Payload (Payload Tamper Detection):
 *    Menghitung ulang SHA-256 dari `canonicalPayload` dan mencocokkannya dengan `payloadHash`.
 * 4. Verifikasi Keaslian Envelope (Envelope Tamper Detection):
 *    Menghitung ulang hash envelope metadata dan mencocokkannya dengan `currentHash`.
 *
 * @param events - Array seluruh event audit trail yang diurutkan berdasarkan urutan kronologis.
 * @returns VerificationResult yang menyatakan apakah rantai valid atau rincian titik kerusakan jika tampered.
 */
export function verifyHashChain(events: HashChainEvent[]): VerificationResult {
  // Jika riwayat masih kosong sama sekali (dompet baru tanpa aktivitas), rantai dianggap valid
  if (events.length === 0) {
    return { valid: true, totalEvents: 0 };
  }

  // Iterasi secara linier dari blok awal hingga blok terbaru
  for (let i = 0; i < events.length; i++) {
    const current = events[i];

    // ------------------------------------------------------------------------
    // Lapisan 1: Verifikasi Nomor Urut (Sequence Number)
    // Menjamin tidak ada transaksi yang diselipkan diam-diam atau dihapus di tengah.
    // ------------------------------------------------------------------------
    const expectedSeq = i + 1;
    if (current.sequenceNo !== expectedSeq) {
      return {
        valid: false,
        totalEvents: events.length,
        failedIndex: i,
        failedSequenceNo: current.sequenceNo,
        errorCode: 'INVALID_SEQUENCE',
        errorMessage: `Sequence mismatch at index ${i}: expected ${expectedSeq}, got ${current.sequenceNo}`,
      };
    }

    // ------------------------------------------------------------------------
    // Lapisan 2: Verifikasi Tautan Hash Sebelumnya (Previous Hash Linking)
    // ------------------------------------------------------------------------
    if (i === 0) {
      // Blok Genesis wajib merujuk ke nilai konstanta hash nol
      if (current.previousHash !== GENESIS_PREVIOUS_HASH) {
        return {
          valid: false,
          totalEvents: events.length,
          failedIndex: 0,
          failedSequenceNo: current.sequenceNo,
          errorCode: 'GENESIS_HASH_MISMATCH',
          errorMessage: `Genesis event must link to ${GENESIS_PREVIOUS_HASH}, got ${current.previousHash}`,
        };
      }
    } else {
      // Blok lanjutan wajib terikat erat pada hash blok tepat sebelumnya
      const prev = events[i - 1];
      if (current.previousHash !== prev.currentHash) {
        return {
          valid: false,
          totalEvents: events.length,
          failedIndex: i,
          failedSequenceNo: current.sequenceNo,
          errorCode: 'INVALID_PREVIOUS_HASH',
          errorMessage: `Broken hash link at index ${i}: previousHash does not match event[${i - 1}].currentHash`,
        };
      }
    }

    // ------------------------------------------------------------------------
    // Lapisan 3: Verifikasi Integritas Data Payload
    // Menghitung ulang hash isi transaksi untuk mendeteksi perubahan data sekecil apa pun.
    // ------------------------------------------------------------------------
    const expectedPayloadHash = sha256Hex(current.canonicalPayload);
    if (current.payloadHash !== expectedPayloadHash) {
      return {
        valid: false,
        totalEvents: events.length,
        failedIndex: i,
        failedSequenceNo: current.sequenceNo,
        errorCode: 'PAYLOAD_HASH_MISMATCH',
        errorMessage: `Tampered payload at index ${i}: expected ${expectedPayloadHash}, got ${current.payloadHash}`,
      };
    }

    // ------------------------------------------------------------------------
    // Lapisan 4: Verifikasi Integritas Envelope Metadata
    // Memastikan atribut pembungkus (walletId, sequence, previousHash, timestamp) tidak dipalsukan.
    // ------------------------------------------------------------------------
    const envelopeData = {
      canonicalPayloadHash: current.payloadHash,
      previousHash: current.previousHash,
      sequenceNo: current.sequenceNo,
      serverTimestamp: current.serverTimestamp,
      walletId: current.walletId,
    };
    const expectedCurrentHash = sha256Hex(canonicalizeJson(envelopeData));
    if (current.currentHash !== expectedCurrentHash) {
      return {
        valid: false,
        totalEvents: events.length,
        failedIndex: i,
        failedSequenceNo: current.sequenceNo,
        errorCode: 'CURRENT_HASH_MISMATCH',
        errorMessage: `Tampered envelope hash at index ${i}: expected ${expectedCurrentHash}, got ${current.currentHash}`,
      };
    }
  }

  // Seluruh blok (100%) lolos pengujian integritas kriptografis
  return {
    valid: true,
    totalEvents: events.length,
  };
}
