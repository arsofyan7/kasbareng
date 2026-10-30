/**
 * ============================================================================
 * MODUL COMMON: FORMAT RESPON STANDAR API (Response Envelope Pattern)
 * ============================================================================
 * Modul ini menyediakan standardisasi kontrak respon JSON untuk seluruh endpoint REST API.
 * Mengadopsi pola Envelope Pattern (terdiri atas: data, meta, error) sehingga klien (frontend/mobile)
 * selalu menerima struktur payload yang seragam, baik saat permintaan berhasil maupun gagal.
 */

import { Response } from 'express';

/**
 * Interface `ApiResponse<T>`:
 * Struktur envelope standar untuk semua respon API.
 * 
 * Atribut:
 * - `data`: Payload hasil operasi jika sukses (generic T), atau null jika terjadi error.
 * - `meta`: Metadata terkait request (request_id untuk distributed tracing, timestamp ISO, pagination, dll).
 * - `error`: Objek detail error jika gagal, atau null jika operasi sukses.
 */
export interface ApiResponse<T = unknown> {
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

/**
 * Fungsi `generateRequestId`:
 * 
 * Fungsi Blok:
 * Menghasilkan unique identifier bertipe string acak berbasis timestamp untuk pelacakan (tracing) log request.
 * 
 * Alur Kerja:
 * 1. Mengambil timestamp milidetik saat ini (`Date.now()`).
 * 2. Menghasilkan substring acak 6 karakter base-36 (`Math.random()`).
 * 3. Menggabungkan dengan prefix 'req_' (contoh: 'req_1712345678901_a9b8c7').
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Helper `sendSuccess`:
 * 
 * Fungsi Blok:
 * Mengirimkan respon HTTP sukses (2xx) dengan format envelope standar.
 * 
 * Alur Kerja:
 * 1. Mengambil `requestId` yang disimpan di `res.locals.requestId` (dibuat oleh middleware logging/request id).
 *    Jika belum tersedia di locals, dibuatkan id baru via `generateRequestId()`.
 * 2. Mengatur HTTP status code (default: 200 OK, atau 201 Created).
 * 3. Menyusun payload JSON:
 *    - `data`: data hasil operasi bisnis.
 *    - `meta`: request_id, timestamp ISO 8601 saat ini, dan merge properti metadata tambahan (seperti pagination info).
 *    - `error`: null (menandakan tidak ada kegagalan).
 * 4. Mengembalikan respon JSON ke klien.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>
) {
  const requestId = (res.locals?.requestId as string) || generateRequestId();
  return res.status(statusCode).json({
    data,
    meta: {
      request_id: requestId,
      timestamp: new Date().toISOString(),
      ...meta,
    },
    error: null,
  });
}

/**
 * Helper `sendError`:
 * 
 * Fungsi Blok:
 * Mengirimkan respon HTTP error (4xx / 5xx) dengan format envelope standar.
 * 
 * Alur Kerja:
 * 1. Mengambil `requestId` dari `res.locals.requestId` atau men-generate id baru.
 * 2. Mengatur HTTP status code sesuai kategori error (default: 400 Bad Request).
 * 3. Menyusun payload JSON:
 *    - `data`: null (karena terjadi kegagalan).
 *    - `meta`: request_id dan timestamp ISO 8601.
 *    - `error`: objek yang memuat machine error `code`, human-readable `message`, serta `details` tambahan
 *      (misalnya daftar pelanggaran field dari validasi Zod).
 * 4. Mengembalikan respon JSON ke klien.
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details: unknown = {}
) {
  const requestId = (res.locals?.requestId as string) || generateRequestId();
  return res.status(statusCode).json({
    data: null,
    meta: {
      request_id: requestId,
      timestamp: new Date().toISOString(),
    },
    error: {
      code,
      message,
      details: details ?? {},
    },
  });
}
