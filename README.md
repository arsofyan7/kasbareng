# 💰 KASBARENG

> **Modern Multi-Treasury & Financial Governance PWA**  
> *Platform Tata Kelola Kas Bersama, Keluarga, & Komunitas dengan Kuorum M-of-N, Audit Hash Chain SHA-256 Anti-Tamper, dan Rekonsiliasi Bank Otomatis.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Vitest-103%2F103_Tests_Passed-green?logo=vitest&logoColor=white)](https://vitest.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-orange?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

<p align="center">
  <img src="docs/screenshots/kasbareng-hero-showcase.png" alt="KASBARENG Modern Responsive UI Showcase (Desktop Web App & Mobile PWA)" width="100%" />
</p>

<p align="center">
  <em>✨ Tampilan Antarmuka Responsif KASBARENG — Mode Desktop Web & Mobile PWA dengan Navigasi Cepat Ala E-Wallet</em>
</p>

<details>
<summary><b>📸 Buka Galeri Tangkapan Layar Fitur Lengkap (Desktop & Mobile)</b></summary>
<br />

### 🖥️ Tampilan Desktop (Web Application)

| Papan Rekap Iuran & Setoran Bersama | Transaksi Kas Ledger & FSM |
| :---: | :---: |
| <img src="docs/screenshots/desktop-dues.png" alt="Papan Iuran Desktop" width="100%" /> | <img src="docs/screenshots/desktop-transactions.png" alt="Transaksi Kas Desktop" width="100%" /> |

| Halaman Autentikasi / Masuk Akun |
| :---: |
| <img src="docs/screenshots/desktop-landing.png" alt="Landing Page Desktop" width="100%" /> |

### 📱 Tampilan Mobile (Progressive Web App - PWA)

| Dashboard Kas Mobile | Quick Action Sheet (Modal Cepat Ala E-Wallet) |
| :---: | :---: |
| <img src="docs/screenshots/mobile-dashboard.png" alt="Dashboard Mobile" width="380" /> | <img src="docs/screenshots/mobile-quick-action.png" alt="Quick Action Sheet Mobile" width="380" /> |

</details>

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
  - [7. Pelaporan Iuran Mandiri Warga & Verifikasi Pengurus (Single-Manager Approval)](#7-pelaporan-iuran-mandiri-warga--verifikasi-pengurus-single-manager-approval)
  - [8. Papan Rekap Iuran Komunitas (Community Billing Board) & Pembayaran Multi-Periode](#8-papan-rekap-iuran-komunitas-community-billing-board--pembayaran-multi-periode)
  - [9. Modal Fitur Algoritma, Tata Kelola Komunitas, & Desain Responsif Modern](#9-modal-fitur-algoritma-tata-kelola-komunitas--desain-responsif-modern)
  - [10. Tombol Aksi Sentral (Center Action Button Ala E-Wallet) & Quick Action Sheet](#10-tombol-aksi-sentral-center-action-button-ala-e-wallet--quick-action-sheet)
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
| **Papan Rekap Iuran Komunitas** | Visualisasi matriks pembayaran iuran warga (Bulanan, Target Termin, atau Sukarela) dengan checklist borongan multi-periode, pengingat WhatsApp broadcast otomatis, dan transparansi terbuka seluruh anggota. | ✅ Selesai |
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
- **Testing**: Vitest 2.1 (103 tests unit & integrasi lulus 100%).

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

### 7. Pelaporan Iuran Mandiri Warga & Verifikasi Pengurus (Single-Manager Approval)

Warga dapat melaporkan pembayaran kas/iuran secara mandiri dengan melampirkan foto struk transfer langsung dari kamera HP atau galeri. Berbeda dengan pengeluaran uang yang memerlukan kuorum $M$-dari-$N$, verifikasi pemasukan kas dirancang cepat dan cukup disetujui oleh **1 pengurus saja** (`ADMIN` atau `PENGELOLA`):

```mermaid
sequenceDiagram
    autonumber
    actor Warga as Bpk. Joko (Warga RT)
    actor Pengurus as Ibu Ratna (Bendahara / Pengelola)
    participant API as Backend Service
    participant Store as Attachment Storage (SHA-256)
    participant Ledger as Ledger Engine
    participant Audit as SHA-256 Hash Chain

    Warga->>API: 1. Lapor Pembayaran Iuran Rp 50.000 + Foto Struk Transfer
    API->>Store: Simpan berkas gambar & hitung Checksum SHA-256
    API->>Ledger: Set status SUBMITTED (Menunggu Verifikasi)
    Note over API,Ledger: Keamanan Finansial: Saldo kas TIDAK bertambah sebelum verifikasi!
    API-->>Warga: ✅ Laporan tersimpan (Lencana: 'Menunggu Verifikasi')

    Pengurus->>API: 2. Buka Tab 'Iuran Warga' di Menu Persetujuan (/approvals)
    API-->>Pengurus: Daftar transaksi pending + foto bukti transfer
    Pengurus->>API: 3. Klik 'Verifikasi Masuk' (Single-Manager Verification)
    API->>Ledger: Posting CREDIT Rp 50.000 ke Saldo Aktif (Posted Balance)
    API->>Audit: Rekam hash chain blok baru (INCOME_VERIFIED)
    API-->>Pengurus: ✅ Status berubah COMPLETED & Saldo kas resmi bertambah!
```

> 🛡️ **Invarian Keamanan Finansial**: Warga dilarang keras membuat transaksi pengeluaran (`EXPENSE` -> ditolak `403 Forbidden`). Pemasukan yang disubmit warga tidak akan pernah mempengaruhi saldo kas aktif sebelum diverifikasi oleh pengurus sah.

---

### 8. Papan Rekap Iuran Komunitas (Community Billing Board) & Pembayaran Multi-Periode

Fitur ini menggantikan papan tulis kapur/whiteboard manual di pos ronda atau balai pertemuan dengan matriks visual digital yang terbuka bagi seluruh warga:

```mermaid
flowchart TD
    subgraph Config ["1. Pengaturan Skema Dompet Kas"]
        C1["Admin Buat Dompet: Pilih Tipe Iuran (Bulanan, Target Termin, atau Sukarela)"]
        C2["Nominal Iuran Opsional (misal: Rp 50.000 / periode)"]
    end

    subgraph Payment ["2. Pembayaran Multi-Periode (Borongan)"]
        P1["Warga Buka Modal Bayar / Lapor Kas"]
        P2["Centang Periode Sekaligus (misal: Jan, Feb, Mar)"]
        P3["Otomatis Terkalkulasi: 3 x Rp 50.000 = Rp 150.000"]
        P4["Simpan Status PENDING di Papan Iuran"]
    end

    subgraph Verify ["3. Verifikasi Pengurus (Single-Manager)"]
        V1{"Pengurus Cek Transfer Bank"}
        V1 -- APPROVE --> V2["Otomatis Berubah: 🟢 LUNAS (PAID) untuk Seluruh Bulan Terpilih"]
        V1 -- REJECT --> V3["Slot Periode Dihapus & Dibebaskan Kembali untuk Dilaporkan Ulang"]
    end

    subgraph FollowUp ["4. Monitoring & Tindak Lanjut"]
        F1["Tingkat Kepatuhan (% Compliance Rate) & Total Kas Terkumpul"]
        F2["📋 Salin Rekap Tunggakan ke Clipboard"]
        F3["💬 Kirim Pengingat WhatsApp Siap Broadcast ke Grup Warga"]
    end

    Config --> Payment --> Verify --> FollowUp
```

---

### 9. Modal Fitur Algoritma, Tata Kelola Komunitas, & Desain Responsif Modern

Untuk menjaga tampilan antarmuka tetap bersih, profesional, dan nyaman digunakan bagi warga awam tanpa menghilangkan kedalaman teknis dan pembuktian matematis bagi pengawas/auditor:

```mermaid
graph LR
    subgraph UI_Header ["Navbar & Profil Pengguna"]
        P[Klik Avatar Profil] --> M[Pilih 'Fitur Algoritma']
    end

    subgraph Modal ["Modal Fitur Algoritma & Tata Kelola"]
        M --> C1["Card 1: Aturan Komunitas & Kuorum M-of-N<br/>(Syarat Kuorum, Peran User, Anti-Self Approval)"]
        M --> C2["Card 2: Audit Rantai SHA-256<br/>(Status Valid, Tombol Simulator & Inspeksi Drill)"]
        M --> C3["Algoritma Inti: Double-Entry Ledger & 3-Pass Bank Matcher"]
    end

    subgraph Responsive ["Optimasi Multi-Perangkat (Mobile vs Web)"]
        D[Layar Web/Tablet ≥ 768px] --> D1[Tampilkan Toggle Dark/Light & Avatar Profil di Header Atas]
        HP[Layar HP < 768px] --> HP1[Sembunyikan Toggle & Avatar di Atas demi Ruang Bersih]
        HP --> HP2[Diakses Penuh via Tab 'Profil' di Bottom Navigation Bar]
    end
```

- **Latar Belakang Animasi Kas Komunitas Gotong Royong (`community-fintech-bg.jpg`)**:
  Halaman login dan pendaftaran akun dilengkapi dengan latar belakang ilustrasi 3D beranimasi halus (*breathing slow-zoom* 24s infinite) bernuansa rumah-rumah komunitas warga RT/RW terhubung dengan jalur sirkuit neon hijau toska & emerald, balok ledger (*DANA MASUK, DANA KELUAR, TRANSPARENCY*), dan perisai pengaman kriptografis. Kartu login di tengah menggunakan desain kaca tebal (*backdrop-blur-2xl bg-white/95 dark:bg-slate-900/90*) dengan bayangan mendalam yang menghasilkan kontras visual tinggi di mode terang maupun mode gelap.

---

### 10. Tombol Aksi Sentral (Center Action Button Ala E-Wallet) & Quick Action Sheet

Untuk menyederhanakan antarmuka (*UI Minimization*) dan memberikan pengalaman jempol yang ergonomis (*thumb-zone friendly*), aksi pencatatan transaksi kas dan parser chat dipusatkan pada tombol sentral menonjol ala aplikasi fintech modern (Dana / Gojek):

```mermaid
graph TD
    subgraph Mobile_Nav ["Navigasi Bawah Mobile (BottomNav 5 Kolom)"]
        T1["[1] Beranda"]
        T2["[2] Papan Iuran"]
        C["( + ) Tombol Sentral Menonjol"]
        T3["[3] Persetujuan"]
        T4["[4] Profil"]
    end

    subgraph Quick_Sheet ["Quick Action Bottom Sheet (Aksi Cepat Kas)"]
        C -->|Ketuk Tombol Sentral| QS[Panel Meluncur dari Bawah]
        QS --> A1["🟢 Catat Pemasukan / Lapor Iuran<br/>(Warga: Setor mandiri + bukti transfer | Pengurus: Kas langsung)"]
        QS --> A2["🔴 Ajukan Pengeluaran Kas<br/>(Khusus Pengurus via Kuorum M-of-N | Terkunci bagi Warga)"]
        QS --> A3["🟣 Catat via Chat AI<br/>(Tempel obrolan WhatsApp untuk draf instan)"]
        QS --> A4["Pintasan Cepat: Kantong Kas, Rekonsiliasi, & Anggota"]
    end

    subgraph Desktop_Nav ["Navigasi Desktop / Tablet (Sidebar)"]
        CTA["Tombol Utama '+ Transaksi Baru' di Atas Sidebar"] -->|Klik| Dialog[Modal Aksi Cepat Terpusat]
    end
```

- **Pengalaman Tanpa Hambatan**: Aksi kas dapat dipicu dari halaman mana pun secara instan tanpa perlu kembali ke Beranda terlebih dahulu.
- **Transparansi Peran (RBAC Guard)**: Pengeluaran kas otomatis dinonaktifkan secara aman bagi akun berstatus `WARGA` dengan informasi ramah pengguna.

---

## 👥 Matriks Hak Akses (RBAC)

Hak akses bersifat **spesifik per dompet kas** (*per-wallet scope*). Pengguna yang menjadi `WARGA` di kas RT dapat menjadi `ADMIN` di kas panitia 17-an.

| Hak Akses / Kemampuan | `ADMIN` (Ketua RT / Pemilik) | `PENGELOLA` (Bendahara / Sekretaris) | `WARGA` (Anggota Umum) |
| :--- | :---: | :---: | :---: |
| **Melihat Saldo Kas Komunitas** | ✅ Ya | ✅ Ya | ✅ Ya |
| **Melihat Riwayat Transaksi Kas** | ✅ Semua Transaksi | ✅ Semua Transaksi | 🔒 Khusus Transaksi Sendiri (Tracking Pribadi) |
| **Papan Rekap Iuran Komunitas (Visual Grid)** | ✅ Ya (Transparan Penuh) | ✅ Ya (Transparan Penuh) | ✅ Ya (Transparan Penuh Gotong Royong) |
| **Salin Rekap & Broadcast Pengingat WhatsApp** | ✅ Ya | ✅ Ya | ✅ Ya |
| **Mencatat Setoran Tunai atas Nama Warga** | ✅ Ya | ✅ Ya | ❌ Tidak |
| **Melihat Rantai Audit Kriptografis** | ✅ Ya | ✅ Ya | ✅ Ya |
| **Lapor Iuran Mandiri (+ Foto Struk / Kamera)** | ✅ Ya | ✅ Ya | ✅ Ya (Khusus Pemasukan Kas) |
| **Membuat Pengeluaran Kas (Expense)** | ✅ Ya | ✅ Ya | ❌ Tidak (403 Forbidden) |
| **Verifikasi Iuran Masuk (Single-Manager)** | ✅ Ya | ✅ Ya (Cukup 1 Pengurus) | ❌ Tidak |
| **Memberikan Persetujuan Kuorum (Approval M-of-N)** | ✅ Ya | ✅ Ya | ❌ Tidak |
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
- **Laporan Iuran Warga Siap Verifikasi**:
  - `warga1@kasbareng.id` (Bpk. Joko Santoso): Iuran Kas Warga Rp 50.000 + Foto Struk Transfer BCA.
  - `warga2@kasbareng.id` (Ibu Siti Rahayu): Iuran Kas Warga Rp 50.000 + Foto Struk QRIS.
  - Siap diverifikasi oleh Bendahara atau Admin pada tab **"Iuran Warga"** di menu **Persetujuan** (`/approvals`).

---

## 🧪 Pengujian & Verifikasi Kriptografi

KasBareng memiliki cakupan test suite yang komprehensif menguji algoritma murni dan endpoint integrasi.

```bash
# Menjalankan seluruh test suite integrasi backend (103 tests)
npm run test:api

# Menjalankan khusus test algoritma murni (FSM, Quorum, Hash Chain, Reconciliation)
npm run test:algorithms
```

### Hasil Uji:
```text
 ✓ src/modules/auth-wallets.test.ts (21 tests)
 ✓ src/modules/approvals.test.ts (11 tests)
 ✓ src/modules/reconciliation.test.ts (8 tests)
 ✓ src/modules/transactions.test.ts (8 tests)
 ✓ src/modules/income-reports.test.ts (7 tests)
 ✓ src/modules/dues.test.ts (6 tests)
 ✓ src/modules/audit.test.ts (6 tests)
 ✓ src/algorithms/reconciliation/matcher.test.ts (8 tests)
 ✓ src/algorithms/quorum/quorum-evaluator.test.ts (7 tests)
 ✓ src/algorithms/fsm/transition-validator.test.ts (7 tests)
 ✓ src/algorithms/ledger/balance-calculator.test.ts (5 tests)
 ✓ src/algorithms/hash-chain/hash-chain.test.ts (5 tests)
 ✓ src/algorithms/canonicalization/canonical-json.test.ts (4 tests)

 Test Files  13 passed (13)
      Tests  103 passed (103) - 100%
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
│   │           ├── attachments/       # Upload bukti transfer & SHA-256 checksum
│   │           ├── audit/             # Layanan audit kriptografis & verifikasi
│   │           ├── auth/              # Registrasi, login, & JWT
│   │           ├── reconciliation/    # Parser CSV bank & matcher service
│   │           ├── transactions/      # FSM transaksi & verifikasi iuran warga
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
│           │   ├── DuesBoardPage.tsx  # Papan rekap iuran & matriks multi-periode
│           │   ├── ApprovalsPage.tsx  # Manajemen persetujuan kuorum & iuran warga
│           │   ├── ReconciliationPage.tsx # Rekonsiliasi rekening koran bank
│           │   ├── AiParserPage.tsx   # Simulator parser obrolan grup warga
│           │   ├── WalletsPage.tsx    # Daftar dompet & gabung kode
│           │   ├── MembersPage.tsx    # Manajemen warga & peran komunitas
│           │   ├── ProfilePage.tsx    # Profil, kustomisasi tema, & fitur algoritma
│           │   └── AuthPage.tsx       # Login/Daftar dengan latar animasi 3D kas
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
- [x] **Fase 8**: Hardening, regression tests passed 100%, & demo dataset seeder.
- [x] **Ekstensi Warga**: Pelaporan Iuran Mandiri Warga via Kamera/Galeri, Verifikasi 1-Pengurus (*Single-Manager Approval*), & Scoping Visibilitas Riwayat Transaksi per Role.
- [x] **Papan Iuran**: Papan Rekap Iuran Komunitas (Community Billing Board), Skema Bulanan/Termin/Bebas, & Pembayaran Borongan Multi-Periode (103/103 tests passed).
- [x] **Penyempurnaan UI/UX**: Modal Fitur Algoritma & Tata Kelola, Pembersihan Sidebar & Header, Optimasi Header Mobile, & Animasi Kas Komunitas Gotong Royong pada Halaman Login.

---

## 📄 Lisensi & Kontribusi

Dibuat dengan ❤️ untuk transparansi dan tata kelola kas komunitas Indonesia yang lebih sehat.  
Pengembang: **[arsofyan7](https://github.com/arsofyan7)**
