/**
 * ============================================================================
 * MODUL CORE: KONFIGURASI APLIKASI EXPRESS (app.ts)
 * ============================================================================
 * File ini mengonfigurasi seluruh pipeline middleware HTTP, pendaftaran rute (route mounting),
 * pelacakan request id, audit logging durasi HTTP, endpoint health check database, serta
 * penanganan error terpusat (404 Not Found & 500 Internal Server Error).
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { prisma } from './common/prisma';
import { sendSuccess, sendError, generateRequestId } from './common/response';
import { authRouter } from './modules/auth/auth.routes';
import { walletRouter } from './modules/wallets/wallet.routes';
import { transactionRouter } from './modules/transactions/transaction.routes';
import { auditRouter } from './modules/audit/audit.routes';
import { reconciliationRouter } from './modules/reconciliation/reconciliation.routes';
import { attachmentRouter } from './modules/attachments/attachment.routes';
import { duesRouter } from './modules/dues/dues.routes';

/**
 * Inisialisasi Instance Aplikasi Express:
 * Instance ini diekspor untuk dapat dijalankan oleh server HTTP di `main.ts`
 * maupun digunakan langsung oleh library pengujian end-to-end / integration test (Vitest/Supertest).
 */
export const app = express();

/**
 * Middleware Cross-Origin Resource Sharing (CORS):
 * 
 * Fungsi Blok:
 * Mengizinkan resource API diakses oleh aplikasi frontend lintas domain (PWA / Web App / Mobile Web).
 * 
 * Alur Kerja:
 * 1. Mengambil konfigurasi origin dari environment variable `CORS_ORIGIN`, jika tidak ada gunakan wildcard '*'.
 * 2. Mengaktifkan `credentials: true` agar browser dapat menyertakan header otentikasi / cookie jika dibutuhkan.
 */
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

/**
 * Middleware Body Parser (JSON & URL-Encoded):
 * 
 * Fungsi Blok:
 * Mem-parsing payload request body yang masuk menjadi objek JavaScript pada `req.body`.
 * 
 * Alur Kerja:
 * 1. `express.json({ limit: '10mb' })`: Mendukung parsing JSON berukuran hingga 10MB
 *    (cukup besar untuk menampung data batch atau payload terkompresi).
 * 2. `express.urlencoded({ extended: true })`: Mem-parsing form payload dengan struktur nested object.
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * Middleware Request Tracking & Logging:
 * 
 * Fungsi Blok:
 * Menyediakan ID unik untuk setiap request yang masuk serta mencatat durasi eksekusi request ke console log.
 * 
 * Alur Kerja:
 * 1. Periksa header `x-request-id` dari klien atau buat baru dengan `generateRequestId()`.
 * 2. Simpan ID ke `res.locals.requestId` agar dapat diakses oleh helper response (`sendSuccess`, `sendError`).
 * 3. Kirim kembali header `X-Request-Id` ke respon klien untuk keperluan debugging dan tracing.
 * 4. Pasang event listener `res.on('finish')` untuk menghitung selisih waktu (latensi) dalam milidetik.
 * 5. Cetak log format `[HTTP] METHOD URL STATUS - DURATIONms (REQ_ID)` (dinonaktifkan pada lingkungan testing).
 * 6. Panggil `next()` untuk meneruskan eksekusi ke middleware/rute berikutnya.
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const reqId = (req.headers['x-request-id'] as string) || generateRequestId();
  res.locals.requestId = reqId;
  res.setHeader('X-Request-Id', reqId);

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms (${reqId})`);
    }
  });
  next();
});

/**
 * Endpoint Health Check (/api/v1/health):
 * 
 * Fungsi Blok:
 * Memeriksa status kesehatan aplikasi dan konektivitas live ke database Prisma ORM.
 * Digunakan oleh orchestrator container (Docker / Kubernetes / Load Balancer) untuk liveness/readiness probe.
 * 
 * Alur Kerja:
 * 1. Menjalankan query ringan `SELECT 1` langsung ke database melalui `prisma.$queryRaw`.
 * 2. Jika query berhasil: kembalikan respon 200 OK dengan detail uptime, timestamp ISO, dan status database 'CONNECTED'.
 * 3. Jika koneksi database gagal: tangkap exception dan kembalikan respon 503 Service Unavailable dengan pesan error.
 */
app.get('/api/v1/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return sendSuccess(res, {
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        status: 'CONNECTED',
        provider: 'postgresql',
      },
      service: 'kasbareng-api',
      version: '1.0.0',
    });
  } catch (err: unknown) {
    return sendError(
      res,
      'DB_UNAVAILABLE',
      'Database connection failed',
      503,
      { error: err instanceof Error ? err.message : String(err) }
    );
  }
});

/**
 * Pendaftaran Modul Rute (API Route Mounting):
 * 
 * Fungsi Blok:
 * Mengintegrasikan seluruh router fungsional ke path prefix versi API `/api/v1`.
 * 
 * Modul Terdaftar:
 * - `/api/v1/auth`: Registrasi, login JWT, refresh token, profil user.
 * - `/api/v1/wallets`: Manajemen dompet/kas, anggota, role (RBAC), dan saldo.
 * - `/api/v1`: Transaksi keuangan (pemasukan/pengeluaran), persetujuan M-of-N.
 * - `/api/v1`: Audit trail tamper-evident SHA-256 hash chain verification.
 * - `/api/v1`: Rekonsiliasi mutasi rekening bank berbasis CSV parser & deterministic matching.
 * - `/api/v1`: Pengelolaan lampiran bukti transaksi & kwitansi pembayaran.
 * - `/api/v1`: Manajemen iuran rutin warga, periode tagihan, dan rekonsiliasi pembayaran.
 */
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/wallets', walletRouter);
app.use('/api/v1', transactionRouter);
app.use('/api/v1', auditRouter);
app.use('/api/v1', reconciliationRouter);
app.use('/api/v1', attachmentRouter);
app.use('/api/v1', duesRouter);

/**
 * Penanganan Route Tidak Ditemukan (404 Fallback Handler):
 * 
 * Fungsi Blok:
 * Menangkap seluruh request yang tidak cocok dengan endpoint yang terdaftar.
 * 
 * Alur Kerja:
 * Mengembalikan respon 404 Not Found dengan format standar `sendError`,
 * memberitahukan method HTTP dan rute yang diminta.
 */
app.use((req: Request, res: Response) => {
  return sendError(res, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`, 404);
});

/**
 * Global Error Handling Middleware:
 * 
 * Fungsi Blok:
 * Menangkap semua unhandled error atau exception yang tidak tertangkap di controller/service.
 * Mencegah server Node.js crash akibat unhandled promise rejection atau runtime exception.
 * 
 * Alur Kerja:
 * 1. Log detail error ke server console untuk investigasi teknis.
 * 2. Ekstrak pesan kesalahan dari objek error.
 * 3. Kembalikan respon HTTP 500 Internal Server Error dengan envelope standar `sendError`.
 */
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  return sendError(res, 'INTERNAL_SERVER_ERROR', message, 500);
});
