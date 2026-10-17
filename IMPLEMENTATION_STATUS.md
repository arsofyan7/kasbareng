# KASBARENG - Status Implementasi & Roadmap Pelacakan

Dokumen ini diperbarui secara bertahap pada setiap fase implementasi.
Sumber Kebenaran Kebutuhan: Dokumen di folder `requirements/*.txt`.

## Ringkasan Progres

| Fase | Deskripsi | Status | Tanggal Selesai | Catatan / Gate Status |
| :--- | :--- | :---: | :---: | :--- |
| **Fase 0** | Bootstrap, Monorepo, Database Schema, & 6 Core Algorithms | **COMPLETED** | 2026-10-17 | 36/36 tests lulus, DB PostgreSQL tersinkronisasi, Healthcheck OK |
| **Fase 1** | Auth, Wallets, & Membership (RBAC per-wallet) | **READY TO START** | - | Registrasi, Login JWT, Multi-Wallet, WalletMember roles |
| **Fase 2** | UI Foundation & PWA (*Friendly Community Finance*) | NOT STARTED | - | Menunggu Fase 1 |
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
- **Hasil Test**:
  - `npm --prefix apps/api run test:algorithms`: **36 passed (100%)**
  - Healthcheck API (`GET /api/v1/health`): Status `UP`, Database `CONNECTED`
- **Blocker**: Tidak ada.

---

### Rencana Fase 1: Auth, Wallets, & Membership
- Endpoint Registrasi (`/api/v1/auth/register`) & Login (`/api/v1/auth/login`) dengan password hashing bcrypt dan JWT token.
- Middleware otentikasi JWT (`requireAuth`) dan otorisasi RBAC per-wallet (`requireWalletRole`).
- Wallet CRUD (`/api/v1/wallets`) dan Wallet Membership invitation (`/api/v1/wallets/:id/members`).
- Konfigurasi Approval Policy default per-wallet (M-of-N threshold).