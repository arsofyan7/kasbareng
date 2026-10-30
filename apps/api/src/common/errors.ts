/**
 * ============================================================================
 * MODUL COMMON: PENANGANAN ERROR TERSTANDARISASI (AppError)
 * ============================================================================
 * Modul ini menyediakan kelas custom error `AppError` yang diturunkan dari `Error` bawaan JavaScript.
 * Digunakan di seluruh lapisan aplikasi (controllers, services, middleware) untuk melempar
 * exception bisnis/operasional yang dapat diprediksi dengan kode error spesifik dan HTTP status code.
 */

/**
 * Kelas `AppError` merepresentasikan error operasional aplikasi yang diketahui dan terkontrol.
 * 
 * Fungsi Blok:
 * - Menyimpan kode error mesin (machine-readable error code, misal: 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND')
 * - Menyimpan HTTP status code yang sesuai (misal: 400, 401, 403, 404, 409)
 * - Menyediakan pesan deskriptif yang aman untuk dikembalikan ke klien
 * 
 * Alur Kerja:
 * 1. Menerima parameter `code`, `message`, dan opsional `status` (default: 400 Bad Request).
 * 2. Memanggil constructor `super(message)` dari base class `Error`.
 * 3. Menetapkan nama error menjadi 'AppError' untuk identifikasi tipe runtime.
 * 4. Menyimpan properti `code` dan `status`.
 * 5. Memulihkan prototype chain menggunakan `Object.setPrototypeOf` agar pengecekan `instanceof AppError`
 *    berfungsi akurat di lingkungan TypeScript/transpiled JS.
 * 
 * Konteks Error Handling & Arsitektur:
 * - Ditangkap oleh global error handling middleware di `app.ts`.
 * - Memisahkan operational error (kesalahan validasi, otorisasi, bisnis logic) dari programmer error (bug tak terduga, crash DB).
 */
export class AppError extends Error {
  public code: string;
  public status: number;

  constructor(code: string, message: string, status: number = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

