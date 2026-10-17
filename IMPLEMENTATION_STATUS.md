# KASBARENG - Status Implementasi & Roadmap Pelacakan

Dokumen ini diperbarui secara bertahap pada setiap fase implementasi.
Sumber Kebenaran Kebutuhan: Dokumen di folder `requirements/*.txt`.

## Ringkasan Progres

| Fase | Deskripsi | Status | Tanggal Selesai | Catatan / Gate Status |
| :--- | :--- | :---: | :---: | :--- |
| **Fase 0** | Bootstrap, Monorepo, Database Schema, & 6 Core Algorithms | **COMPLETED** | 2026-10-17 | 36/36 tests lulus, DB PostgreSQL tersinkronisasi, Healthcheck OK |
| **Fase 1** | Auth, Wallets, & Membership (RBAC per-wallet) | **COMPLETED** | 2026-10-17 | 13/13 tests lulus, JWT auth, RBAC per-wallet, proteksi last ADMIN |
| **Fase 2** | UI Foundation & PWA (*Friendly Community Finance*) | **COMPLETED** | 2026-10-17 | Responsive Laptop/Tablet/Mobile, Light/Dark/System Theme, Auth & Wallet Switcher |
| **Fase 3** | Transaction Core & FSM Integration | **COMPLETED** | 2026-10-17 | 8/8 tests lulus, Alur INCOME & EXPENSE, Reservasi saldo, FSM Transition Validator |
| **Spesial**| Arsitektur Komunitas Tertutup & Kode Akses Unik (Gated Access) | **COMPLETED** | 2026-10-17 | 8 test baru (Total: 65 tests lulus), Instant Join sebagai WARGA, Dual Mode Random/Custom Code, Share WA |
| **Fase 4** | Multi-Approval M-of-N & Ledger Balance | **READY TO START** | - | Evaluasi Kuorum M-of-N, anti-self approval, posting pembayaran, release reservasi |
| **Fase 5** | Tamper-Evident SHA-256 Audit Hash Chain | NOT STARTED | - | Menunggu Fase 4 |
| **Fase 6** | Rekonsiliasi Bank CSV (Deterministik) | NOT STARTED | - | Menunggu Fase 5 |
| **Fase 7** | Parser Chat AI (Draf Transaksi Pasif) | NOT STARTED | - | Menunggu Fase 6 |
| **Fase 8** | Hardening, Security Drills, & Demo Dataset | NOT STARTED | - | Menunggu Fase 7 |

---

## Rincian Per Fase

### Fase 0 - Bootstrap & Core Algorithms
- **Status**: **COMPLETED (LULUS GATE 0)**
- **Hasil Test**: 36 passed (100%).

### Fase 1 - Auth, Wallets, & Membership (RBAC per-wallet)
- **Status**: **COMPLETED (LULUS GATE 1)**
- **Hasil Test**: 13 passed (100%).

### Fase 2 - UI Foundation & PWA (*Friendly Community Finance*)
- **Status**: **COMPLETED (LULUS GATE 2)**
- **Fitur Utama**: Layout responsif (Sidebar desktop/tablet, BottomNav HP), 3-mode theme switcher (Light, Dark, System Auto), Auth & Wallet Switcher.

---

### Fase 3 - Transaction Core & FSM Integration
- **Status**: **COMPLETED (LULUS GATE 3)**
- **File Dibuat / Diubah**:
  - `apps/api/src/modules/transactions/transaction.service.ts`:
    - CRUD Draf Transaksi (`INCOME` / `EXPENSE`).
    - Integrasi FSM Transition Validator (`validateTransition`).
    - Integrasi Ledger Balance Calculator (`calculateBalance`).
    - Alur `INCOME`: Otomatis membukukan entri `CREDIT` ke ledger saat diajukan.
    - Alur `EXPENSE`: Berpindah ke `PENDING_APPROVAL`, mengecek kecukupan saldo tersedia (`availableBalance`), dan mengunci dana melalui mekanisme reservasi.
    - Proteksi konkurensi (Optimistic Locking via `expectedVersion`).
    - Pembatalan transaksi (`cancelTransaction`) dengan pelepasan reservasi otomatis.
  - `apps/api/src/modules/transactions/transaction.routes.ts`:
    - `GET /api/v1/wallets/:walletId/summary` (Ringkasan saldo riil/tersedia/reservasi).
    - `GET /api/v1/wallets/:walletId/transactions` (Daftar transaksi berpaginasi).
    - `POST /api/v1/wallets/:walletId/transactions` (Pembuatan draf oleh Admin/Pengelola).
    - `GET /api/v1/transactions/:transactionId` (Detail transaksi & kronologi).
    - `PATCH /api/v1/transactions/:transactionId` (Edit draf dengan cek versi).
    - `POST /api/v1/transactions/:transactionId/submit` (Pengajuan ke FSM).
    - `POST /api/v1/transactions/:transactionId/cancel` (Pembatalan).
  - `apps/api/src/modules/transactions.test.ts`: 8 test case integrasi menguji alur DRAFT -> SUBMITTED -> PENDING_APPROVAL -> COMPLETED / CANCELLED.
  - `apps/web/src/components/common/RecordTransactionModal.tsx`: Modal pencatatan Pemasukan & Pengeluaran kas dengan kalkulasi saldo dan kategori siap pakai.
  - `apps/web/src/components/common/TransactionDetailModal.tsx`: Modal rincian transaksi dengan status badge bahasa Indonesia dan tombol aksi (Ajukan / Batalkan).
  - `apps/web/src/pages/DashboardPage.tsx`: Integrasi live saldo tercatat, saldo tersedia, reservasi aktif, dan feed riwayat transaksi dengan filter (Semua / Pemasukan / Pengeluaran).

---

### Fitur Spesial: Arsitektur Komunitas Tertutup & Kode Akses Unik (Gated Access)
- **Status**: **COMPLETED**
- **Latar Belakang**: Setiap dompet kas bersifat privat/tertutup (hanya dapat dilihat oleh anggota yang bergabung dengan kode/tautan unik komunitas).
- **Mekanisme Join**:
  - **Instant Join**: Begitu warga memasukkan kode yang valid (atau membuka tautan WhatsApp), mereka langsung otomatis terdaftar sebagai anggota dengan peran `WARGA` (akses transparan read-only) tanpa memerlukan persetujuan manual satu per satu dari Admin.
- **Mekanisme Kode Akses (Dual Mode)**:
  - **Acak Otomatis (Default)**: Sistem menghasilkan kode acak unik (misal: `KAS-8X92KP`) yang tidak ambigu.
  - **Kode Kustom**: Admin dapat menentukan kode kustom sendiri (misal: `RT05-SEJAHTERA`) dengan pengecekan ketersediaan secara real-time via API `GET /api/v1/wallets/check-code/:code`.
  - **Regenerasi Kode**: Admin dapat mengacak ulang atau mengganti kode kustom kapan saja melalui modal manajemen kode.
- **Komponen & Endpoint Baru**:
  - Database: Field `inviteCode String? @unique @map("invite_code")` pada model `Wallet`.
  - Backend:
    - `POST /api/v1/wallets/join`: Bergabung instan ke dompet dengan kode.
    - `GET /api/v1/wallets/preview-invite/:code`: Pratinjau informasi komunitas sebelum bergabung.
    - `GET /api/v1/wallets/check-code/:code`: Cek ketersediaan kode kustom.
    - `PATCH /api/v1/wallets/:walletId/invite-code`: Update / regenerasi kode oleh Admin.
  - Frontend:
    - `JoinWalletModal.tsx`: Modal input kode/URL dengan pratinjau live nama komunitas dan jumlah warga.
    - `ManageInviteCodeModal.tsx`: Modal manajemen kode bagi Admin (Salin kode, salin tautan, bagikan WhatsApp, buat kode kustom, acak ulang).
    - `CreateWalletModal.tsx`: Opsi kode acak vs kode kustom saat membuat dompet baru.
    - `DashboardPage.tsx` & `MembersPage.tsx`: Banner/widget kode akses warga dengan tombol 1-klik Salin & Bagikan ke WhatsApp.
    - `WalletsPage.tsx` & `WalletSwitcherModal.tsx`: Tombol "+ Gabung Kode" dan tampilan kode di kartu dompet.
    - `App.tsx`: Auto-detect URL query `?join=CODE` untuk otomatis membuka modal konfirmasi bergabung.
- **Hasil Test**:
  - Total test suite bertambah menjadi **65 passed (100%)**.
  - Vitest `src/modules/auth-wallets.test.ts`: 21 tests passed.
  - Vitest `src/modules/transactions.test.ts`: 8 tests passed.
  - Algorithm tests: 36 tests passed.

---

### Rencana Fase 4: Multi-Approval M-of-N & Ledger Balance
- Implementasi API persetujuan: `POST /api/v1/transactions/:id/approvals` (decision: `APPROVE` atau `REJECT`).
- Integrasi algoritma Quorum Evaluator (`evaluateQuorum`):
  - Penegakan anti-self approval (pembuat transaksi dilarang menyetujui transaksinya sendiri).
  - Deduplikasi identitas approver (1 suara per approver).
  - Validasi versi transaksi saat approval diberikan.
- Transisi status saat kuorum tercapai: `PENDING_APPROVAL` -> `APPROVED`.
- Pelaksanaan pembayaran: `APPROVED` -> `PAYMENT_PENDING` -> `COMPLETED` (memposting entri `DEBIT` resmi ke ledger dan merilis reservasi aktif).
- UI Layar Persetujuan (Approval Card, Progress Kuorum M-of-N, Tombol Setujui / Tolak).
