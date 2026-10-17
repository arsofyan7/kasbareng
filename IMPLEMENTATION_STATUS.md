# KASBARENG - Status Implementasi & Roadmap Pelacakan

Dokumen ini diperbarui secara bertahap pada setiap fase implementasi.
Sumber Kebenaran Kebutuhan: Dokumen di folder `requirements/*.txt`.

## Ringkasan Progres

| Fase | Deskripsi | Status | Tanggal Selesai | Catatan / Gate Status |
| :--- | :--- | :---: | :---: | :--- |
| **Fase 0** | Bootstrap, Monorepo, Database Schema, & 6 Core Algorithms | **COMPLETED** | 2026-10-17 | 36/36 tests lulus, DB PostgreSQL tersinkronisasi, Healthcheck OK |
| **Fase 1** | Auth, Wallets, & Membership (RBAC per-wallet) | **COMPLETED** | 2026-10-17 | 13/13 tests lulus, JWT auth, RBAC per-wallet, proteksi last ADMIN |
| **Fase 2** | UI Foundation & PWA (*Friendly Community Finance*) | **COMPLETED** | 2026-10-17 | Responsive Laptop/Tablet/Mobile, Light/Dark/System Theme, Auth & Wallet Switcher |
| **Fase 3** | Transaction Core & FSM Integration | **COMPLETED** | 2026-10-17 | 8/8 tests lulus (Total: 57 tests), Alur INCOME & EXPENSE, Reservasi saldo, FSM Transition Validator |
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
- **Hasil Test**:
  - Total test suite: **57 passed (100%)**
- **Hasil Build**:
  - Backend `apps/api`: Build sukses (`tsc`).
  - Frontend `apps/web`: Build sukses (`vite build`).
- **Blocker**: Tidak ada.

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