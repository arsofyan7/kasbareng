/**
 * ============================================================================
 * MODUL AUDIT: SERVICE AUDIT TRAIL KRIPTOGRAFIS (audit.service.ts)
 * ============================================================================
 * Service ini mengelola pembuatan dan verifikasi rantai hash SHA-256 (Tamper-Evident Hash Chain)
 * untuk setiap peristiwa penting di dalam dompet (perubahan status transaksi, persetujuan,
 * pencairan saldo, penolakan, penyesuaian).
 * 
 * Konsep Kriptografi:
 * 1. Kanonisasi JSON (`canonicalizeJson`): Menjamin urutan key JSON identik dan deterministik
 *    sehingga tidak rentan terhadap perbedaan representasi serialization.
 * 2. Payload Hash: Hash SHA-256 dari string payload kanonikal.
 * 3. Previous Hash: Pointer kriptografis ke `currentHash` baris sebelum sequence ini.
 *    Untuk blok pertama (Genesis), digunakan konstanta `GENESIS_PREVIOUS_HASH` (64 karakter '0').
 * 4. Current Hash: `SHA-256(walletId + sequenceNo + payloadHash + previousHash + timestamp)`.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../common/prisma';
import { canonicalizeJson } from '../../algorithms/canonicalization/canonical-json';
import {
  computeHashChainEvent,
  verifyHashChain,
  GENESIS_PREVIOUS_HASH,
  HashChainEvent,
  VerificationResult,
} from '../../algorithms/hash-chain/hash-chain';

/**
 * Interface `RecordAuditInput`:
 * DTO (Data Transfer Object) untuk mencatat suatu event ke audit log.
 */
export interface RecordAuditInput {
  walletId: string;
  actorId?: string;
  eventType: string;
  transactionId?: string;
  transactionVersion?: number;
  fromState?: string | null;
  toState?: string | null;
  metadata?: Record<string, unknown>;
  serverTimestamp?: Date;
}

export class AuditService {
  /**
   * ============================================================================
   * METHOD: recordAuditEvent
   * ============================================================================
   * Fungsi Blok:
   * Menambahkan entri baru ke rantai hash audit dompet secara atomic.
   * Dapat dieksekusi di dalam transaksi Prisma (`txClient`) bersama operasi transaksi keuangan,
   * sehingga jika pencatatan audit gagal, seluruh perubahan saldo atau transaksi ikut di-rollback.
   * 
   * Alur Kerja:
   * 1. Menentukan timestamp server (menggunakan `serverTimestamp` atau waktu saat ini).
   * 2. Query log audit terakhir milik dompet (`sequenceNo: 'desc'`) untuk mendapatkan `sequenceNo` dan `currentHash` terakhir.
   * 3. Jika belum ada log (blok pertama), `sequenceNo = 1` dan `previousHash = GENESIS_PREVIOUS_HASH`.
   *    Jika sudah ada, `sequenceNo = lastLog.sequenceNo + 1` dan `previousHash = lastLog.currentHash`.
   * 4. Membuat identifier unik event (`eventId`).
   * 5. Membentuk objek payload data event dan mengonversinya menjadi string JSON kanonikal dengan `canonicalizeJson`.
   * 6. Menghitung `payloadHash` dan `currentHash` baru via algoritma `computeHashChainEvent`.
   * 7. Menyimpan entri baru secara permanen ke tabel `AuditLog` di database via Prisma.
   */
  static async recordAuditEvent(
    txClient: Prisma.TransactionClient | typeof prisma,
    input: RecordAuditInput
  ) {
    const timestamp = input.serverTimestamp || new Date();

    // 1. Ambil entri audit terakhir untuk dompet ini guna mendapatkan sequence_no dan previous_hash
    const lastLog = await txClient.auditLog.findFirst({
      where: { walletId: input.walletId },
      orderBy: { sequenceNo: 'desc' },
      select: { sequenceNo: true, currentHash: true },
    });

    const sequenceNo = (lastLog?.sequenceNo || 0) + 1;
    const previousHash = lastLog?.currentHash || GENESIS_PREVIOUS_HASH;
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 2. Susun objek payload audit kanonikal (terstruktur, higienis, dan terurut deterministik)
    const payloadObject = {
      actorId: input.actorId || 'SYSTEM',
      eventId,
      eventType: input.eventType,
      fromState: input.fromState || null,
      metadata: input.metadata || {},
      sequenceNo,
      serverTimestamp: timestamp.toISOString(),
      toState: input.toState || null,
      transactionId: input.transactionId || null,
      transactionVersion: input.transactionVersion ?? 1,
      walletId: input.walletId,
    };

    const canonicalPayload = canonicalizeJson(payloadObject);

    // 3. Hitung hash kriptografis murni (payloadHash & currentHash rantai)
    const chainEvent = computeHashChainEvent({
      walletId: input.walletId,
      sequenceNo,
      canonicalPayload,
      previousHash,
      serverTimestamp: payloadObject.serverTimestamp,
    });

    // 4. Simpan entri audit log ke database
    const savedLog = await txClient.auditLog.create({
      data: {
        walletId: input.walletId,
        sequenceNo,
        eventId,
        canonicalPayload,
        payloadHash: chainEvent.payloadHash,
        previousHash: chainEvent.previousHash,
        currentHash: chainEvent.currentHash,
        createdAt: timestamp,
      },
    });

    return savedLog;
  }

  /**
   * ============================================================================
   * METHOD: verifyWalletChain
   * ============================================================================
   * Fungsi Blok:
   * Memvalidasi keutuhan matematis seluruh rantai audit dompet dari sequence #1 (Genesis)
   * sampai entri termutakhir tanpa celah.
   * 
   * Alur Kerja:
   * 1. Query seluruh entri `auditLog` dompet terurut naik berdasarkan sequence (`sequenceNo: 'asc'`).
   * 2. Format baris database menjadi struktur `HashChainEvent[]`.
   * 3. Jalankan algoritma verifikasi murni `verifyHashChain(chainEvents)`.
   * 4. Periksa kecocokan rekalkulasi SHA-256 payload dan keterhubungan `previousHash` setiap blok.
   * 5. Kembalikan objek status verifikasi lengkap beserta timestamp verifikasi.
   */
  static async verifyWalletChain(walletId: string): Promise<
    VerificationResult & {
      walletId: string;
      latestSequenceNo: number;
      latestCurrentHash: string;
      verifiedAt: string;
    }
  > {
    const logs = await prisma.auditLog.findMany({
      where: { walletId },
      orderBy: { sequenceNo: 'asc' },
    });

    const chainEvents: HashChainEvent[] = logs.map((log) => ({
      walletId: log.walletId,
      sequenceNo: log.sequenceNo,
      payloadHash: log.payloadHash,
      previousHash: log.previousHash,
      currentHash: log.currentHash,
      serverTimestamp: log.createdAt.toISOString(),
      canonicalPayload: log.canonicalPayload || '',
    }));

    const result = verifyHashChain(chainEvents);

    const latest = logs.length > 0 ? logs[logs.length - 1] : null;

    return {
      ...result,
      walletId,
      latestSequenceNo: latest?.sequenceNo || 0,
      latestCurrentHash: latest?.currentHash || GENESIS_PREVIOUS_HASH,
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * ============================================================================
   * METHOD: getWalletAuditLogs
   * ============================================================================
   * Fungsi Blok:
   * Mengambil daftar log audit dengan dukungan pagination untuk antarmuka pengguna (UI).
   * 
   * Alur Kerja:
   * 1. Sanitasi parameter `page` (min: 1) dan `limit` (rentang 1..100).
   * 2. Hitung offset database: `skip = (page - 1) * limit`.
   * 3. Jalankan query data dan penghitungan total secara paralel dengan `Promise.all`.
   * 4. Parse field `canonicalPayload` (JSON string) kembali ke objek JavaScript agar mudah dibaca frontend.
   * 5. Kembalikan data list beserta pagination metadata.
   */
  static async getWalletAuditLogs(
    walletId: string,
    filter?: { page?: number; limit?: number }
  ) {
    const page = Math.max(1, filter?.page || 1);
    const limit = Math.min(100, Math.max(1, filter?.limit || 20));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { walletId },
        skip,
        take: limit,
        orderBy: { sequenceNo: 'desc' },
      }),
      prisma.auditLog.count({ where: { walletId } }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        walletId: log.walletId,
        sequenceNo: log.sequenceNo,
        eventId: log.eventId,
        payloadHash: log.payloadHash,
        previousHash: log.previousHash,
        currentHash: log.currentHash,
        createdAt: log.createdAt,
        payload: log.canonicalPayload ? JSON.parse(log.canonicalPayload) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * ============================================================================
   * METHOD: simulateTamper
   * ============================================================================
   * Fungsi Blok:
   * Menyuntikkan manipulasi ke dalam kolom `canonicalPayload` suatu sequence audit log
   * secara langsung di database, tanpa memperbarui nilai `payloadHash` maupun `currentHash`.
   * 
   * Tujuan:
   * Membuktikan secara nyata bahwa setiap pengubahan data unauthorized di database
   * (oleh DBA atau pihak ketiga) langsung mematahkan validitas rantai hash saat `verifyWalletChain` dipanggil.
   * 
   * Alur Kerja:
   * 1. Cari rekaman audit berdasarkan kombinasi unique `walletId` dan `sequenceNo`.
   * 2. Jika tidak ditemukan, lemparkan error 404 LOG_NOT_FOUND.
   * 3. Lakukan update langsung ke tabel `auditLog` mengubah `canonicalPayload` menjadi `maliciousPayload`.
   * 4. Kembalikan ringkasan operasi manipulasi untuk keperluan audit drill.
   */
  static async simulateTamper(walletId: string, sequenceNo: number, maliciousPayload: string) {
    const target = await prisma.auditLog.findUnique({
      where: {
        walletId_sequenceNo: { walletId, sequenceNo },
      },
    });

    if (!target) {
      throw {
        status: 404,
        code: 'LOG_NOT_FOUND',
        message: `Audit log pada sequence #${sequenceNo} tidak ditemukan.`,
      };
    }

    // Ubah kolom canonicalPayload secara sepihak tanpa mengkalkulasi ulang hash
    const tampered = await prisma.auditLog.update({
      where: { id: target.id },
      data: {
        canonicalPayload: maliciousPayload,
      },
    });

    return {
      tampered: true,
      sequenceNo,
      originalPayloadHash: target.payloadHash,
      newContent: maliciousPayload,
    };
  }

  /**
   * ============================================================================
   * METHOD: repairLog
   * ============================================================================
   * Fungsi Blok:
   * Memulihkan kembali `canonicalPayload` pada sequence yang diuji coba simulasi tamper
   * ke konten aslinya agar rantai audit kembali valid 100%.
   * 
   * Alur Kerja:
   * 1. Temukan baris audit berdasarkan `walletId` dan `sequenceNo`.
   * 2. Perbarui kolom `canonicalPayload` dengan `restoredPayload`.
   * 3. Kembalikan status pemulihan berhasil.
   */
  static async repairLog(walletId: string, sequenceNo: number, restoredPayload: string) {
    const target = await prisma.auditLog.findUnique({
      where: {
        walletId_sequenceNo: { walletId, sequenceNo },
      },
    });

    if (!target) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Log tidak ditemukan.' };
    }

    await prisma.auditLog.update({
      where: { id: target.id },
      data: { canonicalPayload: restoredPayload },
    });

    return { repaired: true, sequenceNo };
  }
}

