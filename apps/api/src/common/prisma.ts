/**
 * ============================================================================
 * MODUL COMMON: KONEKSI DATABASE PRISMA ORM (Singleton Pattern)
 * ============================================================================
 * Modul ini bertanggung jawab menginisialisasi dan menyediakan instance tunggal (singleton)
 * dari `PrismaClient` untuk seluruh layanan backend API.
 * 
 * Mengapa Singleton Pattern Diperlukan:
 * Di lingkungan pengembangan (development) dan test runner (seperti Vitest/Nodemon), file dapat
 * di-reload berulang kali. Jika setiap kali reload membuat instance baru `PrismaClient`, koneksi
 * database pool akan cepat habis (connection limit exhaustion). Dengan menyimpan instance pada
 * objek `global`, kita memastikan hanya satu connection pool yang aktif.
 */

import { PrismaClient } from '@prisma/client';

/**
 * Deklarasi Global:
 * Memperluas tipe global Node.js untuk menampung properti `__prisma`.
 * Penggunaan `var` diizinkan dalam blok `declare global` agar variabel terikat ke scope global.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Inisialisasi Instance PrismaClient:
 * 
 * Fungsi Blok:
 * Mengambil instance PrismaClient yang sudah ada dari global scope atau membuat instance baru
 * jika belum tersedia.
 * 
 * Alur Kerja:
 * 1. Periksa apakah `global.__prisma` sudah berisi instance.
 * 2. Jika ada, gunakan kembali instance tersebut.
 * 3. Jika belum ada, panggil `new PrismaClient()` dengan opsi logging:
 *    - Mode 'development': logging level ['query', 'error', 'warn'] untuk memudahkan debugging SQL query.
 *    - Mode non-development (production/test): hanya level ['error'] untuk performa dan keamanan.
 */
export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

/**
 * Caching ke Global Object (Hanya di Luar Production):
 * 
 * Alur Kerja:
 * Pada environment development atau testing, simpan instance yang baru dibuat ke `global.__prisma`.
 * Pada environment production, modul bundler tidak melakukan hot module replacement sehingga
 * caching global tidak diwajibkan, namun tetap aman.
 */
if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export default prisma;
