/**
 * ============================================================================
 * MODUL AUTH: SERVICE LOGIKA BISNIS OTENTIKASI (auth.service.ts)
 * ============================================================================
 * Service ini menangani alur bisnis otentikasi inti:
 * 1. Pendaftaran akun baru (Register) dengan hashing password aman (bcrypt).
 * 2. Masuk akun (Login) dengan proteksi timing attack dan token JWT berjangka waktu.
 * 3. Pengambilan profil user (/me) beserta relasi keanggotaan dompet kas aktif.
 * 
 * Fitur Keamanan:
 * - Sanitasi dan validasi format email otomatis (lowercase) melalui skema Zod.
 * - Password hashing menggunakan bcrypt dengan salt rounds = 10.
 * - Anti-User Enumeration & Timing Attack Mitigation: Membandingkan password dummy saat email tidak ada.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../common/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'kasbareng-super-secret-key-for-dev-2026';
const JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60; // Masa aktif 7 hari (dalam detik)

/**
 * Skema Validasi Zod: Pendaftaran Akun (RegisterSchema)
 * - `fullName`: Nama lengkap pengguna (minimal 2 karakter, maksimal 100 karakter).
 * - `email`: Alamat email valid, otomatis dikonversi ke huruf kecil (lowercase).
 * - `password`: Kata sandi dengan panjang minimal 8 karakter.
 */
export const RegisterSchema = z.object({
  fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter').max(100),
  email: z.string().email('Format email tidak valid').toLowerCase(),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
});

/**
 * Skema Validasi Zod: Masuk Akun (LoginSchema)
 * - `email`: Alamat email pengguna (lowercase).
 * - `password`: Kata sandi (wajib diisi).
 */
export const LoginSchema = z.object({
  email: z.string().email('Format email tidak valid').toLowerCase(),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

export class AuthService {
  /**
   * ============================================================================
   * METHOD: register
   * ============================================================================
   * Fungsi Blok:
   * Melakukan validasi input, memastikan keunikan email, mengenkripsi password,
   * dan membuat data pengguna baru di database Prisma.
   * 
   * Alur Kerja:
   * 1. Validasi input menggunakan `RegisterSchema.parse(input)`.
   * 2. Periksa apakah email sudah digunakan melalui `prisma.user.findUnique`.
   * 3. Jika sudah ada, lemparkan error 409 EMAIL_ALREADY_EXISTS.
   * 4. Lakukan hashing password menggunakan `bcrypt.hash(password, 10)`.
   * 5. Buat rekaman pengguna baru di tabel `User` dengan status default 'ACTIVE'.
   * 6. Generate JWT token dengan payload `{ userId, email }` bertanda tangan `JWT_SECRET`.
   * 7. Kembalikan entitas user (tanpa passwordHash) dan token ke controller.
   */
  static async register(input: RegisterInput) {
    const validated = RegisterSchema.parse(input);

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      throw {
        status: 409,
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Alamat email ini sudah terdaftar.',
      };
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: validated.fullName,
        email: validated.email,
        passwordHash,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN_SECONDS }
    );

    return { user, token };
  }

  /**
   * ============================================================================
   * METHOD: login
   * ============================================================================
   * Fungsi Blok:
   * Mengotentikasi pengguna berdasarkan email dan password dengan perlindungan
   * terhadap eksploitasi timing attack (anti-enumeration).
   * 
   * Alur Kerja:
   * 1. Validasi struktur payload melalui `LoginSchema.parse(input)`.
   * 2. Cari pengguna di database berdasarkan email.
   * 3. Mitigasi Serangan Timing Attack:
   *    Jika user tidak ditemukan, sistem tetap memanggil `bcrypt.compare` dengan hash dummy
   *    sehingga durasi komputasi sama persis dengan saat user ditemukan.
   *    Kemudian lemparkan error generik 401 INVALID_CREDENTIALS.
   * 4. Jika user ada, verifikasi kecocokan password dengan hash tersimpan via `bcrypt.compare`.
   * 5. Jika password tidak cocok, lemparkan error 401 INVALID_CREDENTIALS.
   * 6. Periksa status akun (`user.status`). Jika bukan 'ACTIVE', tolak dengan 403 ACCOUNT_INACTIVE.
   * 7. Terbitkan token JWT access token yang berlaku selama 7 hari.
   * 8. Kembalikan data profil ringkas dan token.
   */
  static async login(input: LoginInput) {
    const validated = LoginSchema.parse(input);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    // Timing-safe-like generic check: tidak membocorkan apakah email terdaftar atau tidak
    if (!user) {
      await bcrypt.compare(validated.password, '$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNO');
      throw {
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Email atau kata sandi tidak valid.',
      };
    }

    const isMatch = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isMatch) {
      throw {
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Email atau kata sandi tidak valid.',
      };
    }

    if (user.status !== 'ACTIVE') {
      throw {
        status: 403,
        code: 'ACCOUNT_INACTIVE',
        message: 'Akun Anda dinonaktifkan. Hubungi administrator.',
      };
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN_SECONDS }
    );

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        status: user.status,
      },
      token,
    };
  }

  /**
   * ============================================================================
   * METHOD: getMe
   * ============================================================================
   * Fungsi Blok:
   * Mengambil data profil lengkap pengguna beserta daftar dompet kas komunitas
   * yang diikutinya dengan status keanggotaan aktif.
   * 
   * Alur Kerja:
   * 1. Query tabel `User` berdasarkan `userId`.
   * 2. Lakukan relasi eager loading `memberships` yang statusnya 'ACTIVE',
   *    sekaligus mengikutsertakan detail dompet (`wallet`).
   * 3. Jika pengguna tidak ditemukan, lemparkan 404 USER_NOT_FOUND.
   * 4. Kembalikan objek data profil beserta daftar dompet kas terkait.
   */
  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        createdAt: true,
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            wallet: {
              select: {
                id: true,
                name: true,
                description: true,
                currency: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw {
        status: 404,
        code: 'USER_NOT_FOUND',
        message: 'Data pengguna tidak ditemukan.',
      };
    }

    return user;
  }
}
