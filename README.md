# 💰 KASBARENG

> **Modern Community Treasury & Governance PWA**  
> *Aplikasi Tata Kelola Kas Komunitas Ramah Warga dengan Kuorum M-of-N, Audit Hash Chain SHA-256 Anti-Tamper, dan Rekonsiliasi Bank Otomatis.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Vitest-90%2F90_Tests_Passed-green?logo=vitest&logoColor=white)](https://vitest.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-orange?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

---

## 📖 Daftar Isi

- [Latar Belakang & Nilai Utama](#-latar-belakang--nilai-utama)
- [Fitur Utama](#-fitur-utama)
- [Arsitektur Sistem & Tech Stack](#-arsitektur-sistem--tech-stack)
- [Diagram Alur & Mekanisme Fitur (Flowcharts)](#-diagram-alur--mekanisme-fitur)
  - [1. Siklus Hidup Transaksi & FSM Pengeluaran](#1-siklus-hidup-transaksi--fsm-pengeluaran)
  - [2. Multi-Approval M-of-N Quorum & Anti-Self Approval](#2-multi-approval-m-of-n-quorum--anti-self-approval)
  - [3. Rantai Audit SHA-256 Tamper-Evident](#3-rantai-audit-sha-256-tamper-evident)
  - [4. Rekonsiliasi Bank CSV 3-Pass Deterministik](#4-rekonsiliasi-bank-csv-3-pass-deterministik)
  - [5. Arsitektur Komunitas Tertutup & Akses Instan (Gated Access)](#5-arsitektur-komunitas-tertutup--akses-instan-gated-access)
  - [6. Parser Chat AI (Human-in-the-Loop)](#6-parser-chat-ai-human-in-the-loop)
- [Matriks Hak Akses (RBAC)](#-matriks-hak-akses-rbac)
- [Panduan Instalasi & Menjalankan Lokal](#-panduan-instalasi--menjalankan-lokal)
- [Dataset Demo & Akun Siap Pakai](#-dataset-demo--akun-siap-pakai)
- [Pengujian & Verifikasi Kriptografi](#-pengujian--verifikasi-kriptografi)
- [Struktur Monorepo](#-struktur-monorepo)
- [Status Roadmap & Implementasi](#-status-roadmap--implementasi)

---

## 🌟 Latar Belakang & Nilai Utama

Pengelolaan kas pada komunitas non-profit (seperti **RT/RW**, **Paguyuban**, **Alumni**, **Panitia Kegiatan**, hingga **Kelompok Arisan**) sering menghadapi tantangan klasik:
1. **Beban Tunggal Bendahara**: Bendahara bekerja sendiri mencatat di buku/spreadsheet tanpa pengawasan sistematis.
2. **Ketiadaan Quorum Pengeluaran**: Pengeluaran dana kas dapat dilakukan tanpa persetujuan pengurus lain, memicu kecurigaan dan konflik internal.
3. **Risiko Manipulasi Data**: Catatan keuangan mudah diubah di kemudian hari tanpa jejak audit digital.
4. **Sulitnya Rekonsiliasi**: Mutasi rekening bank resmi tidak cocok dengan catatan kas manual di obrolan chat warga.

**KASBARENG** dirancang sebagai solusi berbasis web modern (PWA) yang menggabungkan kemudahan antarmuka komunitas ramah warga dengan fondasi keamanan finansial tingkat enterprise:
- 🛡️ **Zero Single Point of Approval**: Kuorum dinamis $M$-dari-$N$ pengurus dengan pencegahan self-approval.
- 🔐 **Cryptographic Proof**: Hash chain SHA-256 berbasis kanonisasi RFC 8785 membuktikan keaslian catatan kas.
- ⚡ **Auto-Reconciliation**: Pencocokan 3-pass deterministik rekening koran bank lokal (BCA, Mandiri, BRI, BNI).
- 🤝 **Closed Community Access**: Privasi terjaga dengan kode akses unik tanpa ribet verifikasi manual.

---

## ✨ Fitur Utama

| Modul | Deskripsi Singkat | Status |
| :--- | :--- | :---: |
| **Multi-Wallet & Role RBAC** | Satu akun dapat mengelola/bergabung di banyak dompet kas dengan peran per-wallet (`ADMIN`, `PENGELOLA`, `WARGA`). | ✅ Selesai |
| **Gated Community Access** | Bergabung instan ke komunitas via Kode Akses Unik (misal: `RT05-ASRI`) atau tautan WhatsApp 1-klik. | ✅ Selesai |
| **Double-Entry Ledger & FSM** | Pemisahan Saldo Tercatat (*Posted Balance*), Dana Terkunci (*Reserved Balance*), dan Saldo Tersedia (*Available Balance*). | ✅ Selesai |
| **M-of-N Approval Quorum** | Mekanisme persetujuan pengeluaran kas dengan aturan kuorum dinamis, anti-self approval, dan penolakan otomatis. | ✅ Selesai |
| **SHA-256 Audit Chain** | Rantai audit kriptografis tamper-evident dengan endpoint verifikasi integritas & simulator drill manipulasi data. | ✅ Selesai |
| **Bank CSV Reconciliation** | Rekonsiliasi multi-format bank (BCA, Mandiri, BRI, BNI) dengan 3-pass matcher deterministik & manual audit trail. | ✅ Selesai |
| **AI Chat Parser (UI Preview)** | Simulator pengubah chat WhatsApp/Telegram warga menjadi draf transaksi kas terstruktur berpagar *Human-in-the-Loop*. | 🟡 UI Preview |
| **Mobile-First PWA** | Responsif penuh (Laptop, Tablet, HP), dukungan tema Gelap/Terang/Sistem Otomatis, dan instalasi PWA di homescreen. | ✅ Selesai |

---

## 🏗️ Arsitektur Sistem & Tech Stack

Proyek ini dibangun menggunakan arsitektur **Monorepo modern** dengan pemisahan yang jelas antara logika inti algoritma, API backend, dan antarmuka web.

```mermaid
graph TD
    subgraph Frontend ["Web Client (apps/web)"]
        UI[React 18 + Vite + Tailwind CSS]
        PWA[PWA Service Worker & Manifest]
        Router[React Router DOM v6]
        Cache[TanStack React Query v5]
        Icons[Lucide React Icons]
    end

    subgraph Backend ["API Server (apps/api)"]
        Express[Express.js Framework]
        Auth[JWT & RBAC Middleware]
        Modules[Module Services: Wallets, Tx, Quorum, Audit, Recon]
        ORM[Prisma ORM v5]
    end

    subgraph Algorithms ["Pure Core Algorithms (apps/api/src/algorithms)"]
        AlgoFSM[FSM Transition Engine]
        AlgoQuorum[Quorum Evaluator & Anti-Self Guard]
        AlgoLedger[Ledger Balance Calculator]
        AlgoHash[SHA-256 Hash Chain Generator]
        AlgoCanon[RFC 8785 JSON Canonicalizer]
        AlgoRecon[3-Pass Bank Statement Matcher]
    end

    subgraph Database ["Persistence Layer"]
        DB[(PostgreSQL / SQLite Database)]
    end

    UI --> Router
    Router --> Cache
    Cache --> Express
    Express --> Auth
    Auth --> Modules
    Modules --> Algorithms
    Modules --> ORM
    ORM --> DB
```

### Rincian Teknologi
- **Frontend**: React 18, TypeScript 5.6, Vite 5.4, Tailwind CSS 3.4, TanStack Query 5, Lucide Icons.
- **Backend**: Node.js, Express 4.21, TypeScript 5.6, Prisma ORM 5.22, Zod 3.23 (Validasi Skema), Jose / JWT, Bcrypt.
- **Kriptografi & Integritas**: Node.js `crypto` (SHA-256), RFC 8785 Canonical JSON Serialization.
- **Testing**: Vitest 2.1 (90 tests unit & integrasi lulus 100%).

---

## 🔄 Diagram Alur & Mekanisme Fitur

### 1. Siklus Hidup Transaksi & FSM Pengeluaran

Setiap transaksi pengeluaran kas (`EXPENSE`) melalui Finite State Machine (FSM) yang ketat untuk mencegah defisit kas (*overdraft*) dan pengeluaran sepihak:

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Pengurus input draf pengeluaran
    DRAFT --> DRAFT : Edit rincian draf
    DRAFT --> SUBMITTED : Diajukan (Kunci Saldo Tersedia)
    
    state "Pemeriksaan Saldo & Kuorum" as Check
    SUBMITTED --> Check
    Check --> PENDING_APPROVAL : Kuorum > 0 (M-of-N Diperlukan)
    Check --> APPROVED : Kuorum = 0 (Tanpa Approval)
    
    PENDING_APPROVAL --> PENDING_APPROVAL : Approver memberikan suara (M < N)
    PENDING_APPROVAL --> APPROVED : Kuorum M-of-N Terpenuhi
    PENDING_APPROVAL --> REJECTED : Salah satu reviewer menolak (Release Reservasi)
    
    APPROVED --> PAYMENT_PENDING : Menunggu eksekusi transfer/tunai
    PAYMENT_PENDING --> COMPLETED : Bukti bayar diunggah (Posting DEBIT ke Ledger)
    
    DRAFT --> CANCELLED : Dibatalkan pembuat
    SUBMITTED --> CANCELLED : Dibatalkan (Release Reservasi)
    PENDING_APPROVAL --> CANCELLED : Dibatalkan pembuat (Release Reservasi)
    
    COMPLETED --> [*]
    CANCELLED --> [*]
    REJECTED --> [*]
```

---

### 2. Multi-Approval M-of-N Quorum & Anti-Self Approval

```mermaid
sequenceDiagram
    autonumber
    actor Bendahara as Ibu Ratna (Bendahara)
    actor KetuaRT as Bpk. Hendra (Ketua RT)
    actor Sekretaris as Bpk. Tri (Sekretaris)
    participant API as Backend Service
    participant Quorum as Quorum Engine
    participant Ledger as Ledger Engine
    
    Note over Bendahara,API: Kebijakan Dompet: M=2 dari 3 Pengurus
    Bendahara->>API: 1. Ajukan Pengeluaran Rp 600.000 (Pengadaan Tempat Sampah)
    API->>Ledger: Validasi Saldo & Kunci Rp 600.000 di Reserved Balance
    API-->>Bendahara: Transaksi masuk status PENDING_APPROVAL (0/2 Approval)
    
    Bendahara->>API: 2. Mencoba Setujui Transaksi Sendiri
    API->>Quorum: Evaluasi Anti-Self Approval Guard
    Quorum-->>API: Tolak (SELF_APPROVAL_NOT_ALLOWED)
    API-->>Bendahara: ❌ Error: Pembuat draf tidak boleh menyetujui pengeluarannya sendiri!
    
    KetuaRT->>API: 3. Ketua RT Menyetujui Transaksi
    API->>Quorum: Rekam Approval (1/2 Kuorum)
    API-->>KetuaRT: ✅ Suara tercatat (Status: PENDING_APPROVAL)
    
    Sekretaris->>API: 4. Sekretaris Menyetujui Transaksi
    API->>Quorum: Rekam Approval (2/2 Kuorum)
    Quorum-->>API: Target Kuorum Terpenuhi!
    API-->>Sekretaris: ✅ Status otomatis berganti menjadi APPROVED
    
    Bendahara->>API: 5. Eksekusi Pembayaran & Masukkan Nomor Referensi Bank
    API->>Ledger: Lepas Reservasi Rp 600.000 & Posting DEBIT Rp 600.000 ke Buku Kas
    API-->>Bendahara: ✅ Transaksi COMPLETED & Saldo Tercatat Terpotong
```

---

### 3. Rantai Audit SHA-256 Tamper-Evident

Setiap perubahan penting pada dompet dan transaksi menghasilkan entri audit log yang dirangkai secara kriptografis (*linked hash chain*). Modifikasi satu karakter saja di database akan merusak seluruh rantai berikutnya.

```mermaid
graph LR
    subgraph Genesis ["Blok #1 (Genesis Event)"]
        G_H["Hash: H1"]
        G_Prev["Prev: 000...000"]
        G_Pay["Payload: WALLET_CREATED"]
    end

    subgraph Event2 ["Blok #2 (Transaksi Diajukan)"]
        E2_H["Hash: H2"]
        E2_Prev["Prev: H1"]
        E2_Pay["Payload: TX_SUBMITTED"]
    end

    subgraph Event3 ["Blok #3 (Persetujuan Kuorum)"]
        E3_H["Hash: H3"]
        E3_Prev["Prev: H2"]
        E3_Pay["Payload: TX_APPROVED"]
    end

    subgraph EventN ["Blok #N (Pembayaran Kas)"]
        EN_H["Hash: Hn"]
        EN_Prev["Prev: H3"]
        EN_Pay["Payload: TX_PAYMENT_EXECUTED"]
    end

    Genesis -->|H1| Event2
    Event2 -->|H2| Event3
    Event3 -->|H3| EventN
```

$$\text{CanonicalPayloadHash}_n = \text{SHA256}(\text{canonicalizeJson}(\text{payload}_n))$$
$$H_n = \text{SHA256}(H_{n-1} + \text{":"} + \text{sequenceNo}_n + \text{":"} + \text{CanonicalPayloadHash}_n)$$

> 💡 **Fitur Tamper Simulation Drill**: Sistem menyediakan modal interaktif di UI dan API (`/audit/simulate-tamper`) untuk mensimulasikan percobaan modifikasi data ilegal di database dan membuktikan kemampuan deteksi sistem secara *real-time*.

---

### 4. Rekonsiliasi Bank CSV 3-Pass Deterministik

KasBareng menyediakan pencocokan otomatis rekening koran bank lokal terhadap catatan kas dengan 3 aturan terurut tanpa tebakan heuristik acak:

```mermaid
flowchart TD
    Start[Upload Berkas CSV Mutasi Bank BCA/Mandiri/BRI/BNI] --> Parse[Parser Cerdas: Normalisasi Tanggal, Delimiter & Nominal Rupiah]
    Parse --> Pass1{Pass 1: Apakah Nomor Referensi Bank Unik & Cocok Sempurna?}
    
    Pass1 -- Ya --> Matched1[Status: MATCHED - Aturan Exact Reference]
    Pass1 -- Tidak --> Pass2{Pass 2: Apakah Nominal & Arah Mutasi Sama persis pada Rentang Tanggal ±3 Hari?}
    
    Pass2 -- Ada 1 Kandidat Tepat --> Matched2[Status: MATCHED - Aturan Amount & Date Window]
    Pass2 -- Ada >= 2 Kandidat Mirip --> Ambiguous[Status: AMBIGUOUS - Cegah Auto-Match & Butuh Verifikasi Pengurus]
    Pass2 -- Tidak Ada Transaksi Cocok --> Unmatched[Status: UNMATCHED - Mutasi Belum Tercatat di Kas]
    
    Ambiguous --> ManualMatch[Pengurus Memilih Transaksi Manual + Alasan Audit Wajib]
    Unmatched --> AutoCreate[1-Klik: Buat Transaksi Kas Baru Resmi dari Mutasi Bank]
    ManualMatch --> Audit[Dicatat ke SHA-256 Audit Chain]
    AutoCreate --> Audit
```

---

### 5. Arsitektur Komunitas Tertutup & Akses Instan (Gated Access)

```mermaid
flowchart LR
    Admin[Admin Komunitas RT/RW] -->|Buat Dompet Kas| GenCode[Sistem Generate Kode Unik: RT05-ASRI]
    Admin -->|Bagikan ke Grup WhatsApp| Link["kasbareng.id/?join=RT05-ASRI"]
    
    Warga[Warga Komunitas] -->|Buka Tautan / Input Kode| Preview[Lihat Pratinjau Komunitas & Jumlah Warga]
    Preview -->|Klik 'Gabung Sekarang'| InstantJoin[Instant Join Otomatis!]
    InstantJoin --> Dashboard[Masuk Dashboard Komunitas sebagai WARGA: Transparan & Read-Only]
```

---

### 6. Parser Chat AI (Human-in-the-Loop)

```mermaid
sequenceDiagram
    actor Pengurus as Bendahara / Pengelola
    participant UI as AI Chat Parser Page
    participant Regex as Deterministic Entity Extractor
    participant Form as Form Pencatatan Kas Resmi
    participant Core as Core Ledger Engine
    
    Pengurus->>UI: Tempel pesan obrolan grup WA (Misal: "Bpk. Joko transfer 150rb iuran")
    UI->>Regex: Ekstraksi nominal, arah (Pemasukan), tanggal, pihak terkait
    Regex-->>UI: Output JSON Terstruktur + Confidence Score
    Note over UI: Human-in-The-Loop Safety Gate: AI DILARANG membukukan saldo secara sepihak!
    Pengurus->>UI: Review & Klik 'Gunakan Data Ini'
    UI->>Form: Buka Modal Pencatatan Kas resmi dengan form pra-terisi
    Pengurus->>Form: Verifikasi manual, lampirkan bukti transfer, & Simpan
    Form->>Core: Transaksi dicatat ke sistem resmi
```

---

## 👥 Matriks Hak Akses (RBAC)

Hak akses bersifat **spesifik per dompet kas** (*per-wallet scope*). Pengguna yang menjadi `WARGA` di kas RT dapat menjadi `ADMIN` di kas panitia 17-an.

| Hak Akses / Kemampuan | `ADMIN` (Ketua RT / Pemilik) | `PENGELOLA` (Bendahara / Sekretaris) | `WARGA` (Anggota Umum) |
| :--- | :---: | :---: | :---: |
| **Melihat Saldo & Riwayat Transaksi** | ✅ Ya | ✅ Ya | ✅ Ya |
| **Melihat Rantai Audit Kriptografis** | ✅ Ya | ✅ Ya | ✅ Ya |
| **Membuat Draf Pemasukan & Pengeluaran** | ✅ Ya | ✅ Ya | ❌ Tidak |
| **Memberikan Persetujuan Kuorum (Approval)** | ✅ Ya | ✅ Ya | ❌ Tidak |
| **Mengeksekusi Pembayaran Pengeluaran** | ✅ Ya | ✅ Ya | ❌ Tidak |
| **Upload Rekening Koran & Rekonsiliasi Bank** | ✅ Ya | ✅ Ya | ❌ Tidak |
| **Mengubah Aturan Kuorum M-of-N** | ✅ Ya | ❌ Tidak | ❌ Tidak |
| **Mengelola Kode Akses & Anggota Komunitas** | ✅ Ya | ❌ Tidak | ❌ Tidak |

---

## 🚀 Panduan Instalasi & Menjalankan Lokal

### Prasyarat
- **Node.js**: Versi `>= 18.0.0`
- **npm**: Versi `>= 9.0.0`
- **Database**: PostgreSQL (Disarankan) atau SQLite (kompatibel bawaan Prisma)

### 1. Kloning Repositori
```bash
git clone https://github.com/arsofyan7/kasbareng.git
cd kasbareng
```

### 2. Instal Dependensi Monorepo
```bash
npm install
```

### 3. Konfigurasi Variabel Lingkungan (.env)

Buat berkas `.env` pada folder `apps/api/.env`:
```env
# Server
PORT=3001
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kasbareng?schema=public"

# Keamanan & JWT
JWT_SECRET="kasbareng-super-secret-jwt-key-2026-production"
JWT_EXPIRES_IN="7d"

# CORS
CORS_ORIGIN="http://localhost:5173"
```

Buat berkas `.env` pada folder `apps/web/.env`:
```env
VITE_API_URL="http://localhost:3001/api/v1"
```

### 4. Sinkronisasi Skema Database
```bash
npm --workspace=apps/api run prisma:generate
npm --workspace=apps/api run prisma:push
```

### 5. Injeksi Dataset Demo Realistis
Jalankan seeder untuk mengisi komunitas "Kas Warga RT 05 / RW 08 Asri" lengkap dengan 6 pengguna, transaksi, persetujuan kuorum, rekonsiliasi bank, dan rantai audit hash:
```bash
npm run db:seed
```

### 6. Menjalankan Server Development

Jalankan API backend dan Web client secara terpisah di 2 terminal:

**Terminal 1 (Backend API):**
```bash
npm run dev:api
# API berjalan di http://localhost:3001 (Health check: http://localhost:3001/health)
```

**Terminal 2 (Frontend Web Client):**
```bash
npm run dev:web
# Web UI berjalan di http://localhost:5173
```

Buka peramban Anda di `http://localhost:5173`! 🎉

---

## 🎭 Dataset Demo & Akun Siap Pakai

Setelah menjalankan `npm run db:seed`, Anda dapat langsung masuk menggunakan akun demo berikut:

*Password default untuk semua akun demo:* **`Password123!`**

| Email | Nama Pengguna | Peran Sistem | Posisi di Komunitas |
| :--- | :--- | :---: | :--- |
| **`admin@kasbareng.id`** | Bpk. Hendra Gunawan | `ADMIN` | Ketua RT 05 (Akses Penuh & Aturan Kuorum) |
| **`bendahara@kasbareng.id`** | Ibu Ratna Dewi | `PENGELOLA` | Bendahara (Input Draf, Rekonsiliasi, Bayar) |
| **`sekretaris@kasbareng.id`** | Bpk. Tri Wibowo | `PENGELOLA` | Sekretaris (Reviewer & Approver Kuorum) |
| **`warga1@kasbareng.id`** | Bpk. Joko Santoso | `WARGA` | Anggota Warga (Akses Transparan Read-Only) |
| **`warga2@kasbareng.id`** | Ibu Siti Rahayu | `WARGA` | Anggota Warga (Akses Transparan Read-Only) |
| **`warga3@kasbareng.id`** | Bpk. Ahmad Yani | `WARGA` | Anggota Warga (Akses Transparan Read-Only) |

### Informasi Komunitas Bawaan:
- **Nama Komunitas**: *Kas Warga RT 05 / RW 08 Asri*
- **Kode Akses Komunitas**: `RT05-ASRI`
- **Aturan Kuorum**: $M=2$ persetujuan dari 3 pengurus aktif untuk setiap pengeluaran.
- **Kondisi Saldo**:
  - Saldo Tercatat: **Rp 2.150.000** (*Posted Balance*)
  - Dana Terkunci: **Rp 600.000** (*Reserved Balance* untuk Pengadaan Tempat Sampah — Menunggu 1 suara kuorum!)
  - Saldo Tersedia: **Rp 1.550.000** (*Available Balance*)

---

## 🧪 Pengujian & Verifikasi Kriptografi

KasBareng memiliki cakupan test suite yang komprehensif menguji algoritma murni dan endpoint integrasi.

```bash
# Menjalankan seluruh test suite integrasi backend (90 tests)
npm run test:api

# Menjalankan khusus test algoritma murni (FSM, Quorum, Hash Chain, Reconciliation)
npm run test:algorithms
```

### Hasil Uji:
```text
 ✓ src/modules/wallets.test.ts (13 tests)
 ✓ src/modules/auth.test.ts (13 tests)
 ✓ src/modules/approvals.test.ts (11 tests)
 ✓ src/modules/audit.test.ts (6 tests)
 ✓ src/modules/reconciliation.test.ts (8 tests)
 ✓ src/modules/transactions.test.ts (8 tests)
 ✓ src/modules/wallets-gated.test.ts (8 tests)
 ✓ src/algorithms/hash-chain/hash-chain.test.ts (6 tests)
 ✓ src/algorithms/quorum/quorum.test.ts (6 tests)
 ✓ src/algorithms/fsm/fsm.test.ts (6 tests)
 ✓ src/algorithms/ledger/ledger.test.ts (6 tests)

 Test Files  11 passed (11)
      Tests  90 passed (90) - 100%
```

---

## 📁 Struktur Monorepo

```text
kasbareng/
├── apps/
│   ├── api/                           # Backend API Service (Express + Prisma)
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # Skema database relasional
│   │   │   └── seed.ts                # Dataset demo realistis RT 05 Asri
│   │   └── src/
│   │       ├── algorithms/            # 6 Algoritma murni terisolasi & deterministik
│   │       │   ├── canonicalization/  # RFC 8785 JSON canonicalizer
│   │       │   ├── fsm/               # Finite State Machine validator
│   │       │   ├── hash-chain/        # SHA-256 linked hash chain
│   │       │   ├── ledger/            # Kalkulator saldo double-entry
│   │       │   ├── quorum/            # M-of-N Quorum & Anti-self evaluator
│   │       │   └── reconciliation/    # 3-Pass bank statement matcher
│   │       ├── common/                # Utility, error handling, prisma client
│   │       └── modules/               # API routes & business logic
│   │           ├── audit/             # Layanan audit kriptografis & verifikasi
│   │           ├── auth/              # Registrasi, login, & JWT
│   │           ├── reconciliation/    # Parser CSV bank & matcher service
│   │           ├── transactions/      # FSM transaksi & siklus pembayaran
│   │           └── wallets/           # Manajemen dompet, kode akses, kuorum
│   │
│   └── web/                           # Frontend Web Client (React 18 + Vite PWA)
│       ├── public/                    # PWA icons & manifest
│       └── src/
│           ├── components/            # Komponen antarmuka & modal interaktif
│           │   ├── common/            # Navbar, Sidebar, BottomNav, Modals
│           │   └── layout/            # Layout dashboard responsif
│           ├── contexts/              # ThemeContext (Dark/Light/System) & AuthContext
│           ├── pages/                 # Halaman utama aplikasi
│           │   ├── DashboardPage.tsx  # Beranda saldo & feed mutasi
│           │   ├── ApprovalsPage.tsx  # Manajemen persetujuan kuorum kas
│           │   ├── ReconciliationPage.tsx # Rekonsiliasi rekening koran bank
│           │   ├── AiParserPage.tsx   # Simulator parser obrolan grup warga
│           │   ├── WalletsPage.tsx    # Daftar dompet & gabung kode
│           │   └── MembersPage.tsx    # Manajemen warga & peran komunitas
│           └── types/                 # Definisi tipe TypeScript terpadu
│
├── IMPLEMENTATION_STATUS.md           # Catatan pelacakan implementasi per fase
├── package.json                       # Konfigurasi npm workspaces monorepo
└── README.md                          # Dokumentasi utama proyek
```

---

## 🗺️ Status Roadmap & Implementasi

- [x] **Fase 0**: Monorepo bootstrap, database schema, & 6 pure algorithm suites.
- [x] **Fase 1**: Auth, multi-wallet management, & per-wallet RBAC.
- [x] **Fase 2**: UI/UX PWA foundation (*Friendly Community Finance*), responsive layout & theme switcher.
- [x] **Fase 3**: Transaction Core & FSM Integration (Draf, reservasi saldo, & pembatalan).
- [x] **Spesial**: Arsitektur Komunitas Tertutup & Kode Akses Unik (Gated Access & Instant Join).
- [x] **Fase 4**: Multi-Approval M-of-N, anti-self approval guard, & eksekusi pembayaran kas ke ledger.
- [x] **Fase 5**: Tamper-Evident SHA-256 Audit Hash Chain, endpoint verifikasi, & simulasi tamper drill.
- [x] **Fase 6**: Rekonsiliasi Bank CSV 3-Pass Deterministik (BCA, Mandiri, BRI, BNI).
- [x] **Fase 7**: Parser Chat AI (Draf Pasif berpagar *Human-in-the-Loop* - *UI Preview*).
- [x] **Fase 8**: Hardening, 90/90 regression tests passed (100%), & demo dataset seeder.

---

## 📄 Lisensi & Kontribusi

Dibuat dengan ❤️ untuk transparansi dan tata kelola kas komunitas Indonesia yang lebih sehat.  
Pengembang: **[arsofyan7](https://github.com/arsofyan7)**
