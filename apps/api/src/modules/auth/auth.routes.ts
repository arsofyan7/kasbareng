/**
 * ============================================================================
 * MODUL AUTH: ROUTER OTENTIKASI & MANAJEMEN AKUN (auth.routes.ts)
 * ============================================================================
 * Modul ini mengekspos endpoint HTTP untuk alur pendaftaran pengguna baru (register),
 * masuk aplikasi (login JWT), keluar sistem (logout), dan pengambilan data profil
 * pengguna yang sedang login (/me).
 * 
 * Karakteristik:
 * - Menangani error validasi Zod secara terpusat dan mengembalikan HTTP 400 dengan detail field.
 * - Menghubungkan HTTP controller ke lapisan bisnis di `AuthService`.
 */

import { Router, Response } from 'express';
import { AuthService } from './auth.service';
import { requireAuth, AuthRequest } from './auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { ZodError } from 'zod';

export const authRouter = Router();

/**
 * ============================================================================
 * ENDPOINT: POST /api/v1/auth/register
 * ============================================================================
 * Fungsi Blok:
 * Mendaftarkan akun pengguna baru ke dalam platform KasBareng.
 * 
 * Alur Kerja:
 * 1. Menerima payload body (email, fullName, password, phone opsional).
 * 2. Memanggil `AuthService.register(req.body)` untuk validasi Zod, pengecekan email unik,
 *    hashing password dengan bcrypt, dan pembuatan rekaman di Prisma.
 * 3. Jika berhasil, mengembalikan status 201 Created beserta data pengguna dan token JWT.
 * 4. Jika validasi gagal (`ZodError`), tangkap dan kembalikan respon 400 VALIDATION_ERROR dengan rincian field error.
 * 5. Jika terjadi error bisnis (email terdaftar), kembalikan error code dan status yang sesuai.
 */
authRouter.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const result = await AuthService.register(req.body);
    return sendSuccess(res, result, 201);
  } catch (err: any) {
    if (err instanceof ZodError) {
      return sendError(res, 'VALIDATION_ERROR', 'Format data tidak valid.', 400, err.errors);
    }
    return sendError(
      res,
      err.code || 'REGISTER_FAILED',
      err.message || 'Gagal mendaftar akun.',
      err.status || 400
    );
  }
});

/**
 * ============================================================================
 * ENDPOINT: POST /api/v1/auth/login
 * ============================================================================
 * Fungsi Blok:
 * Mengautentikasi kredensial pengguna (email & password) dan menghasilkan JWT Access Token.
 * 
 * Alur Kerja:
 * 1. Menerima payload body (email, password).
 * 2. Memanggil `AuthService.login(req.body)` untuk validasi Zod dan verifikasi bcrypt hash.
 * 3. Jika kredensial cocok, mengembalikan 200 OK dengan JWT token dan ringkasan profil user.
 * 4. Jika input tidak valid (`ZodError`), mengembalikan 400 VALIDATION_ERROR.
 * 5. Jika password salah atau email tidak terdaftar, AuthService melempar INVALID_CREDENTIALS (401)
 *    untuk mencegah user enumeration attacks.
 */
authRouter.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const result = await AuthService.login(req.body);
    return sendSuccess(res, result, 200);
  } catch (err: any) {
    if (err instanceof ZodError) {
      return sendError(res, 'VALIDATION_ERROR', 'Format data tidak valid.', 400, err.errors);
    }
    return sendError(
      res,
      err.code || 'LOGIN_FAILED',
      err.message || 'Gagal masuk akun.',
      err.status || 400
    );
  }
});

/**
 * ============================================================================
 * ENDPOINT: POST /api/v1/auth/logout
 * ============================================================================
 * Fungsi Blok:
 * Mengakhiri sesi pengguna.
 * 
 * Konteks Otorisasi & Stateless JWT:
 * - Memerlukan middleware `requireAuth` untuk memastikan request berasal dari sesi aktif.
 * - Karena backend mengadopsi stateless JWT, operasi logout di sisi server mengembalikan konfirmasi 200 OK,
 *   dan klien (frontend PWA / Mobile) bertugas menghapus token dari storage lokal.
 */
authRouter.post('/logout', requireAuth, async (_req: AuthRequest, res: Response) => {
  // Stateless JWT logout: client discards token
  return sendSuccess(res, { message: 'Berhasil keluar.' }, 200);
});

/**
 * ============================================================================
 * ENDPOINT: GET /api/v1/auth/me
 * ============================================================================
 * Fungsi Blok:
 * Mengambil informasi profil lengkap pengguna yang saat ini sedang login beserta daftar
 * dompet yang diikutinya (beserta perannya di masing-masing dompet).
 * 
 * Konteks Otorisasi:
 * - Dilindungi oleh `requireAuth`. ID pengguna diambil dari `req.user.id` yang telah divalidasi.
 * 
 * Alur Kerja:
 * 1. Mengambil ID pengguna dari payload otentikasi `req.user!.id`.
 * 2. Memanggil `AuthService.getMe(userId)`.
 * 3. Mengembalikan 200 OK dengan detail profil dan relasi keanggotaan dompet kas komunitas.
 */
authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await AuthService.getMe(req.user!.id);
    return sendSuccess(res, user, 200);
  } catch (err: any) {
    return sendError(
      res,
      err.code || 'INTERNAL_ERROR',
      err.message || 'Gagal memuat profil.',
      err.status || 500
    );
  }
});
