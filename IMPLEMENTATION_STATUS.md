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
| **Fase 4** | Multi-Approval M-of-N & Ledger Balance | **COMPLETED** | 2026-10-21 | 11/11 tests baru (Total 76/76 tests lulus 100%), Kuorum M-of-N, anti-self approval, posting debit resmi, release reservasi |
| **Fase 5** | Tamper-Evident SHA-256 Audit Hash Chain | **COMPLETED** | 2026-10-21 | 6/6 tests baru (Total 82/82 tests lulus 100%), Canonical JSON, Hash Chain deterministic derivation, Endpoint verification & tamper simulation drill |
| **Fase 6** | Rekonsiliasi Bank CSV (Deterministik) | **COMPLETED** | 2026-10-21 | 8/8 tests baru (Total 90/90 tests lulus 100%), Parser multi-format BCA/Mandiri/BRI/BNI, 3-Pass matching deterministik, manual match audit trail, auto-create tx |
| **Fase 7** | Parser Chat AI (Draf Transaksi Pasif) | **HALF FEATURE (UI PREVIEW)** | 2026-10-21 | UI Chat Simulator, Ekstraksi deterministik nominal & kategori, Human-in-The-Loop gate, Skema output terstruktur, konversi ke draf resmi |
| **Fase 8** | Hardening, Security Drills, & Demo Dataset | **COMPLETED** | 2026-10-21 | 90/90 tests lulus 100%, Demo dataset seed `npm run db:seed` (RT 05 Asri, 6 user, kuorum M-of-N, saldo aktif, rekonsiliasi, audit SHA-256) |
| **Fitur Khusus**| Pelaporan Iuran Mandiri Warga, Verifikasi 1-Pengurus, & Scoping Riwayat Transaksi | **COMPLETED** | 2026-10-22 | 7 test baru (Total: 97 tests lulus 100%), Kamera/Foto bukti bayar, verifikasi saldo aktif, scoping riwayat transaksi per role (Warga hanya lihat transaksi miliknya sendiri) |

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

---

### Fase 4 - Multi-Approval M-of-N & Ledger Balance
- **Status**: **COMPLETED (LULUS GATE 4)**
- **Hasil Test**: 11 test integrasi baru lulus 100% (**Total: 76/76 tests passed**).
- **Fitur Utama**:
  - **Kebijakan Kuorum M-of-N**:
    - Model `ApprovalPolicy` terintegrasi dengan riwayat versioning (`policyVersion`).
    - API `GET /api/v1/wallets/:walletId/policy` dan `PUT /api/v1/wallets/:walletId/policy`.
    - Modal manajemen aturan kuorum (`ApprovalPolicyModal.tsx`) bagi Admin dengan validasi jumlah pengelola/admin yang ada.
  - **Quorum Evaluator & Anti-Self Approval**:
    - Integrasi algoritma murni `evaluateQuorum` ke dalam Prisma transaction atomik.
    - **Anti-Self Approval Guard**: Pembuat transaksi dilarang keras menyetujui pengeluarannya sendiri (`SELF_APPROVAL_NOT_ALLOWED`).
    - **Role Guard**: Hanya `ADMIN` dan `PENGELOLA` yang berhak memberikan approval (`NOT_AN_ELIGIBLE_APPROVER`).
    - **Deduplication Guard**: Menolak approval duplikat dari orang yang sama pada versi transaksi yang sama (`DUPLICATE_APPROVAL`).
    - **Version Locking**: Approval terikat erat dengan `transactionVersion` dan `policyVersion`.
    - **Transisi Otomatis**: Transaksi otomatis berpindah dari `PENDING_APPROVAL` ke `APPROVED` begitu kuorum M-of-N terpenuhi.
    - **Penolakan Transaksi**: Keputusan `REJECT` membatalkan pengeluaran dan melepaskan reservasi saldo seketika.
  - **Pelaksanaan Pembayaran & Pembukuan Kas**:
    - API `POST /api/v1/transactions/:transactionId/pay` dan `/payment-records`.
    - Transisi FSM resmi: `APPROVED` -> `PAYMENT_PENDING` -> `COMPLETED`.
    - Otomatis mencatat `PaymentRecord` (dengan nomor referensi pembayaran).
    - Memposting entri `DEBIT` resmi ke `LedgerEntry`.
    - Pelepasan reservasi aktif dan pembaruan saldo riil (`postedBalance` & `availableBalance`) secara sinkron dan konsisten.
  - **UI / Frontend**:
    - Halaman baru `ApprovalsPage.tsx` ("Persetujuan Kas Komunitas") dengan tab Menunggu, Siap Bayar, dan Riwayat.
    - Komponen `TransactionDetailModal.tsx` yang diperkaya dengan Quorum Progress Bar, lencana approver, indikator anti-self approval, modal konfirmasi setujui/tolak, serta form eksekusi pembayaran kas.
    - Integrasi tab navigasi baru di `Sidebar.tsx` (Desktop/Tablet) dan `BottomNav.tsx` (Mobile).

---

### Fase 5 - Tamper-Evident SHA-256 Audit Hash Chain
- **Status**: **COMPLETED (LULUS GATE 5)**
- **Hasil Test**: 6 tests baru di `apps/api/src/modules/audit.test.ts` (Total 82/82 tests lulus 100%).
- **Fitur & Mekanisme Kriptografi**:
  - **Model Database & Schema**:
    - Kolom `canonical_payload` (tipe `TEXT`) ditambahkan ke tabel `audit_logs` melalui Prisma migration / db push.
  - **Pencatatan Audit Otomatis (Lifecycle Audit Hooks)**:
    - Terintegrasi langsung pada `TransactionService` (`createDraft`, `updateDraft`, `submitTransaction`, `cancelTransaction`, `processApproval`, `executePayment`).
    - Terintegrasi pada `WalletService` (`createWallet` - Genesis Event Sequence #1, `updateWalletPolicy`).
  - **Algoritma SHA-256 Deterministic Hash Chain**:
    - Serialisasi payload JSON melalui algoritma murni `canonicalizeJson` (RFC 8785) untuk menjamin stabilitas deterministik terhadap whitespace/key ordering.
    - Setiap blok event $H_n$ dihitung dari: `SHA256(H_{n-1} + ":" + sequenceNo + ":" + canonicalPayloadHash)`.
    - Genesis event sequence `#1` berlabuh secara deterministik ke `GENESIS_PREVIOUS_HASH` (64 karakter nol).
  - **Audit Verification & Tamper Simulation API**:
    - `GET /api/v1/wallets/:walletId/audit/verify`: Memverifikasi kontinuitas rantai sequence, linkage hash, dan integritas hash payload. Mengembalikan status `isValid`, `totalEvents`, `brokenSequenceNo`, dan `tamperReason`.
    - `GET /api/v1/wallets/:walletId/audit/events`: Pagination riwayat event audit beserta hash SHA-256 dan payload kanonik.
    - `POST /api/v1/wallets/:walletId/audit/simulate-tamper`: Fitur drill simulasi manipulasi data database (mengubah payload atau hash secara sengaja untuk menguji deteksi tamper).
    - `POST /api/v1/wallets/:walletId/audit/repair`: Memulihkan data hasil simulasi drill kembali ke keadaan kanonik asli.
  - **UI / Frontend**:
    - `AuditChainModal.tsx`: Modal interaktif ramah warga untuk memantau status validitas rantai (status badge hijau/merah), blok genesis, feed kronologi mutasi dengan copy hash instan, payload viewer, serta drill simulasi tamper interaktif untuk demonstrasi audit di depan penguji / warga.
    - Akses audit 1-klik di header `DashboardPage.tsx`, kartu komunitas `Sidebar.tsx`, dan top navigation `Navbar.tsx`.

---

### Fase 6 - Rekonsiliasi Bank CSV (Deterministik)
- **Status**: **COMPLETED (LULUS GATE 6)**
- **Hasil Test**: 8 tests baru di `apps/api/src/modules/reconciliation.test.ts` (Total 90/90 tests lulus 100%).
- **Fitur & Mekanisme Deterministik**:
  - **CSV Parser Toleran & Otomatis**:
    - Parsing cerdas untuk format perbankan lokal Indonesia: **BCA** (cabang, CR/DB), **Mandiri** (kolom debet/kredit terpisah), **BRI** (uraian, no referensi), **BNI**, serta format standar **KasBareng CSV**.
    - Penanganan otomatis delimiter (koma, titik-koma, tab), format angka desimal Rupiah (`100.000,00` vs `1,000,000.00`), dan normalisasi tanggal ISO (`YYYY-MM-DD`, `DD/MM/YYYY`, `DD/MM`).
    - Penghitungan SHA-256 checksum berkas CSV saat upload.
  - **Algoritma Pencocokan 3-Pass Deterministik**:
    - *Pass 1 (Rule 1)*: Pencocokan *exact unique reference* jika tersedia dan tidak ada duplikasi.
    - *Pass 2 (Rule 2)*: Pencocokan nominal identik, arah mutasi sesuai (`CREDIT`/`DEBIT`), dan rentang tanggal $\pm 3$ hari.
    - *Pass 3 (Ambiguity & Duplicate Detection)*: Jika ditemukan $\ge 2$ kandidat transaksi yang identik, sistem **tidak melakukan auto-match** melainkan menandai status `AMBIGUOUS`. Jika ada referensi bank duplikat, ditandai `DUPLICATE_POTENTIAL`.
  - **Manual Match dengan Jejak Audit Kriptografis**:
    - Sesuai spesifikasi, pencocokan manual mewajibkan pencatatan *actor*, *timestamp*, alasan terperinci (*reason*), dan otomatis dicatat pada rantai audit hash SHA-256 (`RECONCILIATION_MANUAL_MATCHED`).
  - **Pencatatan Transaksi Kas dari Mutasi Bank**:
    - Fitur 1-klik untuk mutasi bank yang belum ada di KasBareng (`UNMATCHED`), otomatis membukukan kas dalam status `COMPLETED`, mencatat entri ledger resmi, serta menautkan bukti rekening bank.
  - **UI / Frontend**:
    - Halaman baru `ReconciliationPage.tsx` ("Rekonsiliasi Bank CSV") dengan bilah metrik tingkat kecocokan (*Precision Auto-Match*), tab filter interaktif, modal impor dengan template demo instan BCA & Mandiri, modal pencocokan manual, dan modal pembuatan transaksi.
    - Tab navigasi baru di `Sidebar.tsx` (Desktop/Tablet) dan `BottomNav.tsx` (Mobile).

---

### Fase 7 - Parser Chat AI (Draf Transaksi Pasif)
- **Status**: **HALF FEATURE / UI PREVIEW (LULUS GATE 7 SUBSET)**
- **Catatan Implementasi**:
  - Sesuai arahan, implementasi difokuskan pada lapisan **antarmuka UI & ekstraksi deterministik sisi klien**, sedangkan integrasi LLM pihak ketiga dan webhook bot dialokasikan untuk pasca-demo.
  - **Fitur Utama**:
    - **Chat Simulator & Input Card**: Area teks untuk menempelkan pesan obrolan warga (WhatsApp / Telegram) disertai tombol preset pesan simulasi instan (iuran bulanan, perbaikan pos satpam, donasi kebersihan, konsumsi rapat).
    - **Ekstraksi Teks Deterministik**: Menganalisis arah kas (`INCOME`/`EXPENSE`), estimasi nominal (Rp), rekomendasi kategori, tanggal, dan pengirim pesan.
    - **Skema Output Terstruktur (Structured Output)**: Menampilkan objek JSON standar AI beserta skor keyakinan (*Confidence Score*).
    - **Human-in-the-Loop Security Gate**: Penegasan bahwa AI **hanya menghasilkan draf (state: DRAFT)** dan dilarang keras mengubah saldo kas atau posting ke ledger tanpa review manusia.
    - **Konversi 1-Klik**: Tombol konversi langsung membuka formulir pencatatan kas resmi yang telah terisi otomatis untuk diverifikasi manusia.
  - **UI / Frontend**: Halaman baru `AiParserPage.tsx` dan integrasi tab navigasi di `Sidebar.tsx`.

---

### Fase 8 - Hardening, Security Drills, & Demo Dataset
- **Status**: **COMPLETED (LULUS GATE 8 - SIAP DEMO)**
- **Hasil Pengujian & Verifikasi**:
  - **Regression Tests**: **90 / 90 tests lulus 100%** di 11 berkas test Vitest (`npm run test:api`).
  - **Frontend Compilation**: `tsc -b && vite build` lulus dengan **0 error TypeScript**.
  - **Keamanan Kriptografi**: Rantai audit SHA-256 (`AuditService.verifyWalletChain`) terbukti mendeteksi modifikasi data ilegal secara presisi pada sequence number yang dirusak.
  - **PWA & Aksesibilitas**: Desain adaptif Laptop/Tablet/Mobile, kontras WCAG AA, dukungan Light/Dark/System Theme.
- **Generator Demo Dataset Realistis (`npm run db:seed`)**:
  - Perintah: `npm run db:seed`
  - **Data yang Dihasilkan**:
    - **Komunitas Kas**: "Kas Warga RT 05 / RW 08 Asri" (Kode Akses: `RT05-ASRI`).
    - **Kebijakan Kuorum**: $M=2$ dari 3 pengurus aktif.
    - **Akun Demo Siap Pakai** (Password default: `Password123!`):
      1. `admin@kasbareng.id` (Bpk. Hendra Gunawan - Ketua RT / Admin)
      2. `bendahara@kasbareng.id` (Ibu Ratna Dewi - Bendahara / Pengelola)
      3. `sekretaris@kasbareng.id` (Bpk. Tri Wibowo - Sekretaris / Pengelola)
      4. `warga1@kasbareng.id` (Bpk. Joko Santoso - Warga Aktif)
      5. `warga2@kasbareng.id` (Ibu Siti Rahayu - Warga Aktif)
      6. `warga3@kasbareng.id` (Bpk. Ahmad Yani - Warga Aktif)
    - **Kondisi Finansial Aktif**:
      - Saldo Tercatat: **Rp 2.150.000** (Posted Balance)
      - Reservasi Aktif: **Rp 600.000** (Pengadaan Tempat Sampah Terpilah - Menunggu 1 suara kuorum!)
      - Saldo Tersedia: **Rp 1.550.000** (Available Balance)
    - **Rekonsiliasi Bank**: Rekening koran bank BCA/Mandiri siap demonstrasi (*Matched*, *Ambiguous*, dan *Unmatched*).
    - **Rantai Audit SHA-256**: 5 blok kejadian berurutan berlabuh dari genesis hash `0000...0000`.

---

### Fitur Khusus: Pelaporan Pemasukan Mandiri Warga (Member Income Self-Report) & Verifikasi Pengurus (Single-Manager)
- **Status**: **COMPLETED**
- **Tanggal Selesai**: 2026-10-21
- **Hasil Pengujian**: 7 test integrasi di `apps/api/src/modules/income-reports.test.ts` (Total: **97/97 tests lulus 100%**).
- **Latar Belakang & Masalah Komunitas**:
  - Pada komunitas riil (RT/RW, paguyuban, panitia), warga mentransfer iuran kas melalui bank/QRIS lalu mengirim bukti bayar ke grup WhatsApp, mengakibatkan bukti tenggelam dan bendahara kewalahan merekap satu per satu.
  - Fitur ini memberikan portal mandiri bagi warga untuk melaporkan setoran iuran lengkap dengan foto struk/transfer langsung dari kamera HP atau galeri.
- **Mekanisme Keamanan Finansial (Financial Invariant)**:
  - **Izin Ketat Warga**: Akun berstatus `WARGA` diizinkan membuat transaksi bertipe `INCOME`, namun dilarang keras membuat `EXPENSE` (ditolak `403 FORBIDDEN`).
  - **Status Aman (`SUBMITTED`)**: Laporan yang disubmit warga berstatus `SUBMITTED` (*Menunggu Verifikasi Pengurus*). Sistem **dilarang membukukan kredit** ke buku kas sebelum ada verifikasi pengurus, sehingga saldo kas aktif tidak akan menggelembung sebelum ada validasi uang riil.
- **Pembatasan Visibilitas Riwayat Transaksi Kas (Transaction History Scoping)**:
  - **Admin & Pengelola (`ADMIN`, `PENGELOLA`)**: Berwenang melihat seluruh transaksi kas komunitas dalam dompet (`GET /api/v1/wallets/:walletId/transactions`).
  - **Warga / Anggota (`WARGA`)**: Hanya dapat melihat transaksi yang dibuat/dilaporkan oleh dirinya sendiri (`creatorId === currentUserId`) untuk keperluan pelacakan setoran pribadi. Endpoint detail transaksi (`GET /api/v1/transactions/:transactionId`) secara tegas menolak warga yang mencoba melihat transaksi milik orang lain dengan `403 FORBIDDEN`.
- **Penyimpanan Berkas Bukti Transfer (`attachments`)**:
  - Endpoint `POST /api/v1/wallets/:walletId/attachments`: Menerima base64 data URL gambar, menghitung checksum SHA-256, dan menyimpannya di direktori `uploads/`.
  - Endpoint `GET /api/v1/attachments/:attachmentId`: Menampilkan berkas bukti bayar dengan header MIME yang tepat.
- **Verifikasi Pengurus (Single-Manager Approval)**:
  - Cukup 1 pengurus (`ADMIN` atau `PENGELOLA`) untuk memverifikasi tanpa beban kuorum M-of-N:
    - `POST /api/v1/transactions/:transactionId/verify-income` dengan `{ decision: 'APPROVE' | 'REJECT', notes?: string }`.
    - **Keputusan APPROVE**: Status berpindah ke `COMPLETED`, otomatis membukukan entri `CREDIT` ke `LedgerEntry`, saldo kas aktif bertambah seketika, dan tercatat di rantai audit SHA-256 (`INCOME_VERIFIED`).
    - **Keputusan REJECT**: Status berpindah ke `REJECTED`, menyimpan catatan alasan penolakan (misal: dana belum masuk/bukti buram), saldo kas tidak berubah, dan tercatat di rantai audit SHA-256 (`INCOME_REJECTED`).
- **UI / Antarmuka Pengguna**:
  - `RecordTransactionModal.tsx`:
    - Tampilan khusus Warga: judul *"Lapor Pembayaran Kas / Setor Iuran"*, penguncian tipe otomatis ke `INCOME`, dan tombol tunggal *"Kirim Laporan Pembayaran"*.
    - Komponen upload foto & akses kamera dengan pratinjau thumbnail instan.
  - `ApprovalsPage.tsx`:
    - Tab baru: **"Iuran Warga (X)"** dengan lencana counter laporan masuk.
    - Kartu laporan menampilkan nama warga, email, nominal hijau, catatan, tombol *"📸 Lihat Foto Bukti Transfer"*, serta tombol aksi *"✅ Verifikasi & Masukkan Kas"* dan *"❌ Tolak"*.
    - Modal lightbox untuk zoom gambar bukti transfer.
  - `DashboardPage.tsx`:
    - Tombol aksi cepat *"Lapor Pembayaran"* aktif bagi akun `WARGA`.
    - Lencana status transaksi berlabel kuning *"Menunggu Verifikasi"*.
  - `TransactionDetailModal.tsx`:
    - Pratinjau foto bukti bayar dan tombol verifikasi pengurus terintegrasi.
- **Demo Dataset**:
  - 2 laporan iuran siap verifikasi dari `warga1` (Bpk. Joko Santoso) dan `warga2` (Ibu Siti Rahayu) dengan lampiran bukti transfer bawaan pada perintah `npm run db:seed`.

---

### Fase 7: Papan Rekap Iuran Komunitas (Community Billing Board) & Pembayaran Multi-Periode
- **Status**: **COMPLETED**
- **Tanggal Selesai**: 2026-10-23
- **Hasil Pengujian**: 6 test integrasi di `apps/api/src/modules/dues.test.ts` (Total: **103/103 tests lulus 100%**).
- **Latar Belakang & Masalah Komunitas**:
  - Menggantikan papan tulis kapur/whiteboard rekap manual di pos ronda atau balai warga yang sering hilang atau lambat diperbarui.
  - Seluruh anggota (`WARGA`, `PENGELOLA`, dan `ADMIN`) memiliki hak akses transparan untuk melihat visual matriks checklist pembayaran kas warga secara gotong royong.
- **3 Skema Tipe Iuran Kas (Configurable Billing Schemes)**:
  1. **`MONTHLY` (Bulanan / Rutin Kalender)**: Visualisasi 12 bulan (Januari - Desember) untuk tahun yang dipilih, dengan selector navigasi tahun.
  2. **`TARGET_INSTALLMENTS` (Target $N$-Kali / Termin)**: Visualisasi $N$-kali setoran (misal: 10 termin untuk Tabungan Qurban, Iuran Pembangunan Gapura, atau Kegiatan 17-an).
  3. **`FREEFORM` (Sukarela / Donasi)**: Untuk dompet kas insidental tanpa tagihan rutin.
- **Nominal Iuran Bersifat Opsional (Flexible / Optional Dues Amount)**:
  - Pada modal *"Buat Dompet Kas Baru"*, Admin dapat memilih tipe iuran dan opsional mengisi nominal acuan iuran per periode (misal: Rp 50.000). Jika dikosongkan, sistem tetap menyajikan matriks iuran dengan nominal bebas/sukarela.
- **Pembayaran Multi-Periode Borongan (Multi-Period Checklist)**:
  - Di modal *"Lapor Pembayaran"*, warga dapat mencentang beberapa bulan/termin sekaligus (misal: Januari, Februari, Maret).
  - Sistem otomatis mengalkulasi nominal total (`jumlah_periode * nominal_iuran`), namun tetap memberikan kebebasan kustomisasi nominal jika ada penyesuaian.
  - Setiap periode tersinkronisasi ke tabel `dues_records` dengan status `PENDING` saat diajukan, bertransisi otomatis ke `PAID` saat pengurus memverifikasi (`APPROVE`), atau dihapus/dibebaskan kembali jika ditolak (`REJECT`).
- **Pencatatan Setoran Tunai oleh Pengurus**:
  - Pengurus (`ADMIN` / `PENGELOLA`) dapat mencatat setoran uang tunai/cash yang diterima langsung dari warga via dropdown *"Setoran Atas Nama Anggota/Warga"*, sehingga pembayaran kas tunai langsung tercatat lunas atas nama warga tersebut.
- **Rekap Tunggakan & Pengingat WhatsApp Otomatis (Follow-up Automation)**:
  - **Tingkat Kepatuhan Komunitas (% Compliance Rate)**: Dihitung secara matematis dari `(total slot lunas / total slot iuran seluruh anggota) * 100`.
  - **Tombol Salin Rekap**: Menyalin ringkasan data warga yang menunggak ke clipboard.
  - **Tombol Kirim Pengingat WA**: Membuka draft broadcast WhatsApp siap kirim yang memuat persentase kepatuhan, total uang terkumpul, daftar nama warga penunggak berserta bulannya, dan tautan portal KasBareng.
- **UI / Antarmuka Pengguna**:
  - `DuesBoardPage.tsx`:
    - 4 Kartu KPI: Tingkat Kepatuhan Iuran (dengan progress bar gradien), Total Kas Terkumpul (vs Potensi Target), Menunggu Verifikasi, dan Status Anggota Lunas vs Menunggak.
    - Toolbar Pencarian & Filter Cepat: Filter *"Semua"*, *"Ada Tunggakan"*, dan *"Lunas 100%"*.
    - Tabel Matriks Interaktif: Kolom nama warga lengket (*sticky*), badge status sel berkode warna (🟢 Lunas, 🟡 Menunggu Verifikasi, ⚪ Belum Bayar), dan modal detail per sel dengan tombol pratinjau foto struk.
  - `CreateWalletModal.tsx`:
    - Pilihan skema tipe iuran interaktif (Bulanan, Target Termin, Sukarela) dan isian nominal iuran opsional.
  - `RecordTransactionModal.tsx`:
    - Checklist multi-periode iuran otomatis dan pemilih anggota setoran tunai bagi pengurus.
  - Navigasi:
    - Tab *"Papan Iuran"* di `Sidebar.tsx` dan `BottomNav.tsx`, serta tombol shortcut langsung di Beranda `DashboardPage.tsx`.
- **Demo Dataset**:
  - Data dompet RT 05 ASRI dikonfigurasi bertipe `MONTHLY` dengan nominal Rp 50.000/bulan, lengkap dengan 6 anggota yang memiliki status lunas, pending verifikasi, dan tunggakan untuk demo visual instan.


