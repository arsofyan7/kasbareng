# KASBARENG - Status Implementasi & Roadmap Pelacakan

Dokumen ini diperbarui secara bertahap pada setiap fase implementasi.
Sumber Kebenaran Kebutuhan: Dokumen di folder `requirements/*.txt`.

## Ringkasan Progres

| Fase | Deskripsi | Status | Tanggal Selesai | Catatan / Gate Status |
| :--- | :--- | :---: | :---: | :--- |
| **Fase 0** | Bootstrap, Monorepo, Database Schema, & 6 Core Algorithms | **COMPLETED** | 2026-10-17 | 36/36 tests lulus, DB PostgreSQL tersinkronisasi, Healthcheck OK |
| **Fase 1** | Auth, Wallets, & Membership (RBAC per-wallet) | **COMPLETED** | 2026-10-17 | 13/13 tests lulus, JWT auth, RBAC per-wallet, proteksi last ADMIN |
| **Fase 2** | UI Foundation & PWA (*Friendly Community Finance*) | **COMPLETED** | 2026-10-17 | Responsive Laptop/Tablet/Mobile (BottomNav & Sidebar), Light/Dark/System Theme switcher, Auth & Wallet Switcher terintegrasi |
| **Fase 3** | Transaction Core & FSM Integration | **READY TO START** | - | Pencatatan transaksi (INCOME / EXPENSE), FSM guard state machine |
| **Fase 4** | Multi-Approval M-of-N & Ledger Balance | NOT STARTED | - | Menunggu Fase 3 |
| **Fase 5** | Tamper-Evident SHA-256 Audit Hash Chain | NOT STARTED | - | Menunggu Fase 4 |
| **Fase 6** | Rekonsiliasi Bank CSV (Deterministik) | NOT STARTED | - | Menunggu Fase 5 |
| **Fase 7** | Parser Chat AI (Draf Transaksi Pasif) | NOT STARTED | - | Menunggu Fase 6 |
| **Fase 8** | Hardening, Security Drills, & Demo Dataset | NOT STARTED | - | Menunggu Fase 7 |

---

## Rincian Per Fase

### Fase 0 - Bootstrap & Core Algorithms
- **Status**: **COMPLETED (LULUS GATE 0)**
- **File Dibuat / Diubah**:
  - `package.json` (Root monorepo workspace `apps/*`)
  - `apps/api/` (Express + TypeScript + Prisma ORM)
  - `apps/web/` (React + TypeScript + Vite + Tailwind CSS)
  - `apps/api/prisma/schema.prisma` (14 Model Data: User, Wallet, WalletMember, ApprovalPolicy, Transaction, Approval, PaymentProof, LedgerEntry, Reservation, AuditEvent, BankStatement, BankStatementLine, ReconciliationMatch, InviteCode)
  - `apps/api/src/algorithms/`:
    1. `canonicalization/canonical-json.ts` + `.test.ts` (RFC 8785 Canonical JSON)
    2. `hash-chain/hash-chain.ts` + `.test.ts` (SHA-256 Tamper-Evident Hash Chain)
    3. `fsm/transition-validator.ts` + `.test.ts` (State Machine Validator)
    4. `quorum/quorum-evaluator.ts` + `.test.ts` (M-of-N Quorum with Anti-Self Approval)
    5. `ledger/balance-calculator.ts` + `.test.ts` (Posted/Available Balance with exact integer minor units)
    6. `reconciliation/matcher.ts` + `.test.ts` (Deterministic Bank CSV Matcher)
  - `.env` & `apps/api/.env`: Konfigurasi PostgreSQL lokal host (tanpa Docker).
- **Database**: PostgreSQL 18.3 (`kasbareng_db` pada `127.0.0.1:5432`). Sinkronisasi via `npx prisma db push` berhasil (semua 14 tabel terbentuk).
- **Hasil Test**: 36 passed (100%).

---

### Fase 1 - Auth, Wallets, & Membership (RBAC per-wallet)
- **Status**: **COMPLETED (LULUS GATE 1)**
- **File Dibuat / Diubah**:
  - `apps/api/src/modules/auth/auth.middleware.ts`: `requireAuth` (JWT) & `requireWalletRole([roles])` (RBAC per-wallet).
  - `apps/api/src/modules/auth/auth.service.ts`: Registrasi bcrypt, login timing-safe tanpa kebocoran email, profil pengguna `getMe`.
  - `apps/api/src/modules/auth/auth.routes.ts`: `/api/v1/auth/register`, `/login`, `/logout`, `/me`.
  - `apps/api/src/modules/wallets/wallet.service.ts`: Pembuatan wallet dengan creator sebagai `ADMIN`, auto-create default `ApprovalPolicy` (M-of-N), member management, proteksi penghapusan/demosi admin terakhir (`LAST_ADMIN_PROTECTED`).
  - `apps/api/src/modules/wallets/wallet.routes.ts`: `/api/v1/wallets`, `/members`.
  - `apps/api/src/modules/auth-wallets.test.ts`: 13 test case integrasi.
- **Hasil Test**: Total test suite: **49 passed (100%)**.

---

### Fase 2 - UI Foundation & PWA (*Friendly Community Finance*)
- **Status**: **COMPLETED (LULUS GATE 2)**
- **Fitur Utama**:
  - **Aesthetic**: Friendly Community Finance dengan palet Emerald, Slate modern, typography Inter, dan micro-animations.
  - **Dark & Light Mode Switcher**: Mendukung 3 mode (Mode Terang, Mode Gelap, dan Ikuti Sistem Perangkat), tersimpan persisten di `localStorage`.
  - **Multi-Device Responsive**:
    - Mobile (HP): Bottom Navigation Bar tetap di bawah, target sentuh >= 44px.
    - Tablet & Laptop: Left Sidebar navigation yang elegan dengan ringkasan status kuorum dompet aktif.
  - **Manajemen Sesi & Context**:
    - `ThemeContext`: Pengaturan tema realtime.
    - `AuthContext`: Registrasi, Login, Logout, dan restorasi token JWT.
    - `WalletContext`: Pengambilan daftar dompet, pemilihan dompet aktif, dan pembuatan dompet baru.
  - **Komponen & Halaman**:
    - `AuthPage`: Form login/register tabbed dengan tombol isi akun demo 1-klik (`budi.admin` & `siti.warga`).
    - `Navbar`: Header responsif dengan switcher dompet aktif, badge role, tombol ganti tema, dan dropdown profil.
    - `DashboardPage`: Kartu Saldo Tercatat (Posted), Saldo Tersedia (Available), Reservasi Pengeluaran Aktif, dan Quorum Indicator M-of-N.
    - `WalletsPage`: Kartu seluruh dompet kas komunitas yang diikuti dengan aksi ganti dompet aktif.
    - `MembersPage`: Daftar warga & pengelola dengan role badge, modal tambah anggota, dan dropdown perubahan role.
    - `ProfilePage`: Pengaturan akun, rincian 6 algoritma terverifikasi, dan selektor tema 3-opsi.
    - `WalletSwitcherModal` & `CreateWalletModal`: Dialog interaktif pemilihan dan pembuatan dompet baru.
- **Hasil Build**: `vite build` sukses tanpa error (`index-BoHgt2S4.css` 32.40 kB, `index-D1563tud.js` 206.90 kB).

---

### Rencana Fase 3: Transaction Core & FSM Integration
- Model transaksi INCOME & EXPENSE dengan field: nominal (minor units/decimal), kategori, deskripsi/keperluan, lampiran bukti (attachment ID).
- Integrasi algoritma FSM Transition Validator ke dalam flow transaksi di backend.
- Endpoint pembuatan draf (`POST /api/v1/wallets/:id/transactions`).
- Endpoint pengajuan draf (`POST /api/v1/transactions/:id/submit`).
- Tampilan form pencatatan transaksi di frontend web.