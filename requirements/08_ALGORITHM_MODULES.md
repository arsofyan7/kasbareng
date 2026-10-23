# 🧮 KASBARENG - Algorithm Modules (Akademik Terpisah)

> **Versi**: 1.0

## 🎓 Tujuan Akademik
Agar algoritma inti dapat dipelajari, diuji, dan dijelaskan kepada dosen tanpa harus menelusuri UI atau controller, seluruh algoritma inti ditempatkan pada:
apps/api/src/algorithms/

## 📂 Struktur Wajib
algorithms/
  README.md
  fsm/
    README.md
    transition-validator.ts
    transition-validator.test.ts
  quorum/
    README.md
    quorum-evaluator.ts
    quorum-evaluator.test.ts
  ledger/
    README.md
    balance-calculator.ts
    balance-calculator.test.ts
  hash-chain/
    README.md
    hash-chain.ts
    hash-chain.test.ts
  reconciliation/
    README.md
    normalizer.ts
    matcher.ts
    matcher.test.ts
  canonicalization/
    README.md
    canonical-json.ts
    canonical-json.test.ts

Aturan:
1. Algoritma harus murni sebisa mungkin: menerima input eksplisit dan mengembalikan output eksplisit.
2. Jangan menaruh React component, HTTP controller, atau query ORM di folder algorithms.
3. Integrasi database dilakukan service layer. Algoritma menerima data yang sudah divalidasi.
4. Setiap algoritma memiliki pseudocode, kompleksitas jika relevan, invariant, contoh, dan unit test.
5. Semua algoritma harus memiliki error/result type yang eksplisit. Hindari boolean tanpa alasan kegagalan.
6. Jangan menaruh secret atau private key dalam source code.
7. Jangan mengklaim performa atau keamanan tanpa hasil pengujian.

## 📦 Rincian Modul Algoritma
A. FSM Transition Validator
Memvalidasi transisi status berdasarkan state sekarang, event, dan kondisi bisnis. Menghasilkan nextState atau error code.

B. Quorum Evaluator
Menghitung persetujuan valid dari identitas approver unik yang memenuhi syarat, policy version, transaction version, dan larangan self-approval.

C. Ledger Balance Calculator
Menghitung saldo tercatat dan saldo tersedia dari entri ledger dan reservasi yang valid. Definisikan tanda debit/kredit secara konsisten.

D. Hash Chain
Membuat payload hash, previous hash, current hash, dan memverifikasi urutan rantai. Gunakan canonical payload. Istilah yang benar untuk MVP adalah tamper-evident, bukan otomatis forward-secure.

E. Reconciliation Matcher
Menormalisasi data bank dan transaksi internal, melakukan matching berdasarkan aturan deterministik, dan mengeluarkan MATCHED, AMBIGUOUS, UNMATCHED, atau DUPLICATE_POTENTIAL.

F. Canonicalization
Menghasilkan representasi data stabil sebelum hashing/penandatanganan. Definisikan urutan key, representasi nominal, tanggal, null, dan string.

G. Test Vectors
Setiap modul menyediakan input dan output contoh yang bisa direproduksi. Test vector harus digunakan oleh unit tests dan dicantumkan di dokumentasi akademik.
