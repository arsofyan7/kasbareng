# KASBARENG - Status Implementasi & Roadmap Pelacakan

Dokumen ini diperbarui secara bertahap pada setiap fase implementasi.
Sumber Kebenaran Kebutuhan: Dokumen di folder `requirements/*.txt`.

## Ringkasan Progres

| Fase | Deskripsi | Status | Tanggal Selesai | Catatan / Gate Status |
| :--- | :--- | :---: | :---: | :--- |
| **Fase 0** | Bootstrap, Monorepo, Database Schema, & 6 Core Algorithms | **COMPLETED** | 2026-10-17 | 36/36 tests lulus, DB PostgreSQL tersinkronisasi, Healthcheck OK |
| **Fase 1** | Auth, Wallets, & Membership (RBAC per-wallet) | **COMPLETED** | 2026-10-17 | 13/13 tests lulus, JWT auth, RBAC per-wallet, proteksi last ADMIN |
| **Fase 2** | UI Foundation & PWA (*Friendly Community Finance*) | **READY TO START** | - | Layout responsif, Tailwind CSS, Auth & Wallet Switcher di Web |
| **Fase 3** | Transaction Core & FSM Integration | NOT STARTED | - | Menunggu Fase 2 |
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
  - `apps/api/src/modules/auth-wallets.test.ts`: 13 test case integrasi mencakup registrasi, login, pencegahan kebocoran email, CRUD wallet, membership, promosi role, dan invariant proteksi admin.
- **Hasil Test**:
  - Total test suite: **49 passed (100%)**
- **Blocker**: Tidak ada.

---

### Rencana Fase 2: UI Foundation & PWA (*Friendly Community Finance*)
- Desain antarmuka modern yang hangat dan ramah warga (*friendly community finance*, hijau emerald / slate, tipografi Inter).
- Form registrasi & login di web (`apps/web`).
- Wallet switcher (dropdown/list dompet yang diikuti user beserta indikator role: Warga / Pengelola / Admin).
- Integrasi state auth (Zustand atau React Context) yang menyimpan JWT token di localStorage.