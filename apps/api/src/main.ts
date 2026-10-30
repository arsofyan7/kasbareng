/**
 * ============================================================================
 * ENTRY POINT UTAMA APLIKASI BACKEND (main.ts)
 * ============================================================================
 * File ini merupakan file bootstrapping utama saat server API dijalankan.
 * Bertanggung jawab memuat konfigurasi environment (.env), mengikat listener HTTP server
 * ke port yang ditentukan, serta mengelola proses graceful shutdown untuk container orchestration.
 */

import 'dotenv/config';
import { app } from './app';

/**
 * Konfigurasi Port Server:
 * 
 * Fungsi Blok:
 * Mengambil nilai port dari environment variable `PORT` atau default ke 4000.
 * Melakukan parsing integer dengan radix 10 untuk memastikan tipe data numerik yang valid.
 */
const PORT = parseInt(process.env.PORT || '4000', 10);

/**
 * Memulai HTTP Server Listener:
 * 
 * Alur Kerja:
 * 1. Memanggil `app.listen(PORT)` untuk mengikat Express app ke TCP port.
 * 2. Mencetak informasi booting ke console log (port & url healthcheck)
 *    agar operator / developer dapat memverifikasi kesiapan server.
 */
const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 KASBARENG API running on port ${PORT}`);
  console.log(`🔗 Healthcheck: http://localhost:${PORT}/api/v1/health`);
  console.log(`=========================================`);
});

/**
 * Mekanisme Graceful Shutdown (SIGTERM Handler):
 * 
 * Fungsi Blok:
 * Menangani sinyal terminasi dari OS/Container Orchestrator (Docker / Kubernetes / PM2)
 * agar koneksi HTTP yang sedang aktif diselesaikan terlebih dahulu sebelum proses mati.
 * 
 * Alur Kerja:
 * 1. Menangkap sinyal sistem operasi `SIGTERM`.
 * 2. Memanggil `server.close()`, yang menghentikan server dari menerima koneksi baru
 *    dan menunggu semua request yang sedang berjalan selesai diproses.
 * 3. Keluar dari proses Node.js dengan exit code 0 (sukses/bersih).
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
