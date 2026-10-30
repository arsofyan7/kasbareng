/**
 * ============================================================================
 * MODUL ATTACHMENTS: ROUTER MANAJEMEN BERKAS BUKTI (attachment.routes.ts)
 * ============================================================================
 * Modul ini menangani pengunggahan (upload) dan pengunduhan/pratinjau (view/download)
 * berkas lampiran pendukung transaksi (seperti struk belanja, nota, bukti transfer bank,
 * kwitansi pembayaran iuran).
 * 
 * Fitur Utama:
 * 1. Menghitung checksum kriptografi SHA-256 pada setiap berkas untuk menjamin keaslian bukti (tamper-evident).
 * 2. Sanitasi nama file untuk mencegah directory traversal attacks.
 * 3. Penyimpanan fisik di folder uploads server dan penyimpanan metadata di database Prisma.
 * 4. Streaming berkas secara aman ke klien menggunakan HTTP read stream.
 */

import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../../common/prisma';
import { requireAuth, requireWalletRole, AuthRequest } from '../auth/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';

export const attachmentRouter = Router();

/**
 * Inisialisasi Direktori Penyimpanan Berkas:
 * 
 * Fungsi Blok:
 * Memastikan direktori target penyimpanan (`uploads`) di root aplikasi sudah tersedia.
 * Jika belum ada, dibuat secara otomatis dengan opsi `{ recursive: true }`.
 */
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * ============================================================================
 * ENDPOINT: POST /api/v1/wallets/:walletId/attachments
 * ============================================================================
 * Fungsi Blok:
 * Menerima unggahan berkas dalam format Base64 (atau Data URL), menghitung checksum SHA-256,
 * menyimpan berkas ke disk lokal, dan mencatat relasi metadata ke database.
 * 
 * Konteks Otorisasi & RBAC:
 * - `requireAuth`: Memeriksa keabsahan JWT Bearer token user.
 * - `requireWalletRole()`: Memastikan pemohon adalah anggota terdaftar di wallet (Admin, Pengelola, atau Warga).
 * 
 * Alur Kerja:
 * 1. Validasi input: memastikan `base64Data` dan `filename` ada dalam request body.
 * 2. Normalisasi Data URL: jika berformat `data:mime;base64,...`, regex digunakan untuk memisahkan MIME type murni dan string base64.
 * 3. Konversi string Base64 menjadi binary `Buffer`.
 * 4. Hash Kriptografi: Hitung SHA-256 digest dari buffer untuk menjamin integritas bukti fisik.
 * 5. Sanitasi Nama File: Hapus karakter berbahaya dari `filename` untuk mitigasi security exploits (Path Traversal).
 * 6. Generate `storageKey`: Kombinasi timestamp, random byte hex, dan sanitized filename untuk mencegah bentrokan nama berkas di disk.
 * 7. Simpan file binary ke path lokal di server via `fs.writeFileSync`.
 * 8. Simpan catatan ke tabel `Attachment` melalui Prisma Client dengan `uploadedBy = actorId`.
 * 9. Kembalikan respon 201 Created dengan URL unduhan dan konversi `sizeBytes` (BigInt) ke Number.
 */
attachmentRouter.post(
  '/wallets/:walletId/attachments',
  requireAuth,
  requireWalletRole(),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const actorId = req.user!.id;
      const { filename, mimeType, base64Data } = req.body;

      // Validasi kelengkapan payload
      if (!base64Data || !filename) {
        return sendError(res, 'INVALID_PAYLOAD', 'File base64 dan nama file wajib disertakan.', 400);
      }

      // Ekstraksi Base64 murni jika klien mengirimkan format Data URL (RFC 2397)
      let pureBase64 = base64Data;
      let detectedMime = mimeType || 'image/jpeg';
      if (base64Data.startsWith('data:')) {
        const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          detectedMime = matches[1];
          pureBase64 = matches[2];
        }
      }

      // Parsing buffer biner dan perhitungan fingerprint SHA-256
      const buffer = Buffer.from(pureBase64, 'base64');
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
      const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageKey = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${safeFilename}`;
      const filePath = path.join(UPLOADS_DIR, storageKey);

      // Tulis file ke storage disk server
      fs.writeFileSync(filePath, buffer);

      // Simpan catatan metadata ke database melalui Prisma ORM
      const attachment = await prisma.attachment.create({
        data: {
          walletId,
          uploadedBy: actorId,
          storageKey,
          originalFilename: safeFilename,
          mimeType: detectedMime,
          sizeBytes: BigInt(buffer.length),
          checksum,
        },
      });

      return sendSuccess(
        res,
        {
          id: attachment.id,
          originalFilename: attachment.originalFilename,
          mimeType: attachment.mimeType,
          sizeBytes: Number(attachment.sizeBytes),
          checksum: attachment.checksum,
          url: `/api/v1/attachments/${attachment.id}`,
          createdAt: attachment.createdAt,
        },
        201
      );
    } catch (err: any) {
      return sendError(res, err.code || 'INTERNAL_ERROR', err.message || 'Gagal mengunggah berkas.', err.status || 500);
    }
  }
);

/**
 * ============================================================================
 * ENDPOINT: GET /api/v1/attachments/:attachmentId
 * ============================================================================
 * Fungsi Blok:
 * Menyajikan berkas biner (gambar struk, pdf, atau dokumen) secara streaming langsung ke browser/klien.
 * 
 * Alur Kerja:
 * 1. Ambil `attachmentId` dari URL parameter.
 * 2. Cari metadata berkas di database via `prisma.attachment.findUnique`.
 * 3. Jika rekaman tidak ada di database, kembalikan 404 NOT_FOUND.
 * 4. Periksa keberadaan file fisik di disk server melalui `fs.existsSync`.
 * 5. Jika berkas fisik hilang, kembalikan 404 FILE_NOT_FOUND.
 * 6. Set response header `Content-Type` sesuai MIME type berkas dan `Content-Disposition: inline`
 *    agar gambar dapat langsung ditampilkan di UI tanpa auto-download yang mengganggu.
 * 7. Buka stream pembacaan berkas (`fs.createReadStream`) dan pipe ke response stream Express.
 */
attachmentRouter.get('/attachments/:attachmentId', async (req, res) => {
  try {
    const attachmentId = String(req.params.attachmentId);
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return sendError(res, 'NOT_FOUND', 'Berkas lampiran tidak ditemukan.', 404);
    }

    const filePath = path.join(UPLOADS_DIR, attachment.storageKey);
    if (!fs.existsSync(filePath)) {
      return sendError(res, 'FILE_NOT_FOUND', 'Berkas fisik tidak ditemukan di server.', 404);
    }

    // Konfigurasi response header untuk streaming berkas
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.originalFilename}"`);
    const stream = fs.createReadStream(filePath);
    return stream.pipe(res);
  } catch (err: any) {
    return sendError(res, 'INTERNAL_ERROR', err.message || 'Gagal memuat berkas.', 500);
  }
});

