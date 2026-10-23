# 🗺️ KASBARENG - Roadmap Implementasi

> **Versi**: 1.0

PRINSIP
Implementasi bertahap. Jangan membangun semua modul sekaligus. Setelah setiap fase, jalankan test dan dokumentasikan status.

## FASE 0 - INSPEKSI DAN BOOTSTRAP
- Baca seluruh requirement.
- Periksa repository saat ini sebelum mengubah file.
- Buat rencana file dan task list.
- Siapkan frontend, backend, database, environment example, lint, dan test runner.
Gate: frontend dan backend dapat dijalankan; migration dan test runner tersedia.

## FASE 1 - AUTH DAN WALLET
- Implementasi auth.
- Users, wallets, wallet_members.
- Daftar dompet dan role per dompet.
- Backend guards.
Gate: cross-wallet access tests lulus.

## FASE 2 - UI FOUNDATION
- Design tokens dan komponen dasar.
- Responsive layout.
- Beranda, Kantong Kas, Aktivitas, Profil.
- Role-aware navigation.
Gate: navigasi inti bekerja pada mobile/desktop.

## FASE 3 - TRANSACTION CORE
- Transaction model.
- FSM algorithm.
- Create draft, submit, reject, clarification.
- Versioning dan idempotency.
Gate: transisi valid/invalid teruji.

## FASE 4 - APPROVAL DAN LEDGER
- Approval policy.
- Quorum evaluator algorithm.
- Ledger entries dan balance calculation.
- Approval API dan concurrency controls.
Gate: self-approval, duplicate approval, race condition, dan saldo tests lulus.

## FASE 5 - AUDIT
- Canonicalization algorithm.
- Hash chain algorithm.
- Audit events.
- Verifier.
Gate: tamper test lulus.

## FASE 6 - CSV RECONCILIATION
- Import batch.
- CSV validation/normalization.
- Reconciliation algorithm.
- UI untuk matched/ambiguous/unmatched.
Gate: test cases rekonsiliasi lulus.

## FASE 7 - CHAT PARSER
- Chat UI.
- Provider abstraction.
- Structured output schema.
- Draft review.
- Fallback manual.
Gate: AI tidak bisa mengeksekusi transaksi langsung.

## FASE 8 - HARDENING DAN DEMO
- Regression tests.
- Security checks.
- Accessibility check.
- Backup/restore drill dasar.
- Demo dataset.
- README dan laporan pengujian.
Gate: semua acceptance criteria inti lulus.

## FASE 9 - PAPAN REKAP IURAN, PEMBAYARAN MULTI-PERIODE, DAN UI REFACTOR (SELESAI)
- Papan Rekap Iuran Komunitas (Dues Board):
  * Matriks status interaktif: Lunas (Hijau), Pending (Kuning), Belum Bayar (Abu-abu).
  * 3 Skema Iuran: Bulanan (MONTHLY), Termin N-Kali (TARGET_INSTALLMENTS), Sukarela (FREEFORM).
  * Pembayaran multi-periode borongan (checklist banyak bulan sekaligus).
  * Generator pesan broadcast WhatsApp otomatis & kalkulator kepatuhan warga.
- Alur Lapor Pemasukan Mandiri Warga:
  * Unggah bukti transfer/foto kamera, saldo kas aman hingga diverifikasi pengurus.
  * Verifikasi Pengurus (Single-Approver: Approve/Reject).
  * Scoping Riwayat Transaksi: Warga hanya melihat mutasi pribadi; Admin & Pengelola melihat seluruh mutasi kas.
- Refactoring UI & Desain Modern Responsif:
  * Modal Fitur Algoritma: Memindahkan card Tata Kelola M-of-N dan SHA-256 Hash Chain ke modal yang dapat diakses via menu Profil (bebas dari stacking context backdrop-filter).
  * Header Mobile Bersih: Sembunyikan toggle dark/light & avatar profil di header mobile (<768px), dialihkan ke BottomNav.
  * Halaman Autentikasi Animasi: Background ilustrasi 3D fintech komunitas dengan animasi slow-zoom breathing, ambient glow orbs, dan card glassmorphism.
Gate: 103/103 integration & unit tests lulus (100%), 0 error build frontend.

CATATAN
Implementasi telah menyelesaikan seluruh modul inti FASE 0 hingga FASE 9 dengan 103/103 automated tests lulus. Semua status telah terdokumentasi akurat pada IMPLEMENTATION_STATUS.md dan README.md.
