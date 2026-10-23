# ⚙️ KASBARENG - Business Rules & Finite State Machine (FSM)

> **Versi**: 1.0

## 1. STATUS INTERNAL YANG DIREKOMENDASIKAN
DRAFT
SUBMITTED
PENDING_APPROVAL
NEEDS_CLARIFICATION
REJECTED
APPROVED
PAYMENT_PENDING
PAYMENT_VERIFICATION
COMPLETED
DISPUTED
CANCELLED

Label yang terlihat kepada pengguna harus bahasa Indonesia sederhana:
DRAFT = Draf
SUBMITTED = Diajukan
PENDING_APPROVAL = Menunggu Persetujuan
NEEDS_CLARIFICATION = Perlu Klarifikasi
REJECTED = Ditolak
APPROVED = Disetujui
PAYMENT_PENDING = Menunggu Pembayaran
PAYMENT_VERIFICATION = Verifikasi Pembayaran
COMPLETED = Selesai
DISPUTED = Dalam Klarifikasi
CANCELLED = Dibatalkan

## 2. TRANSISI UTAMA
DRAFT -> SUBMITTED
SUBMITTED -> PENDING_APPROVAL
PENDING_APPROVAL -> APPROVED jika kuorum valid terpenuhi
PENDING_APPROVAL -> REJECTED oleh approver berwenang
PENDING_APPROVAL -> NEEDS_CLARIFICATION jika informasi perlu dilengkapi
NEEDS_CLARIFICATION -> DRAFT atau SUBMITTED sesuai aturan revisi dan audit
APPROVED -> PAYMENT_PENDING
PAYMENT_PENDING -> PAYMENT_VERIFICATION ketika bukti/rekam pembayaran masuk
PAYMENT_VERIFICATION -> COMPLETED hanya setelah verifikasi dan pembukuan terpenuhi
Status lain seperti DISPUTED/CANCELLED hanya melalui event dan aturan eksplisit.

## 3. GUARD WAJIB
- Aktor terautentikasi.
- Aktor punya permission pada wallet.
- Status saat ini mengizinkan transisi.
- Data transaksi valid.
- Version sesuai.
- Kuorum dan policy valid bila diperlukan.
- Saldo tersedia cukup untuk pengeluaran jika policy mensyaratkan.
- Semua perubahan yang penting memiliki audit event.
- Aksi sensitif idempotent terhadap retry.

## 4. BEDAKAN PERSETUJUAN DAN PEMBAYARAN
APPROVED bukan COMPLETED.
Persetujuan menyatakan pengeluaran diizinkan.
Pelaksanaan pembayaran adalah peristiwa berbeda.
Verifikasi pembayaran adalah proses berbeda.
Sistem tidak boleh menyatakan transaksi selesai hanya karena approver menekan Setujui.

## 5. PEMBUKUAN DAN SALDO
- Gunakan ledger sebagai sumber kebenaran atau dasar rekonsiliasi saldo.
- Pengeluaran yang dicadangkan harus dibedakan dari pengeluaran yang telah dibukukan.
- Hindari saldo negatif jika kebijakan dompet melarangnya.
- Koreksi transaksi dibukukan melalui entri koreksi, bukan menghapus histori.
- Perubahan transaksi dan ledger harus atomik atau memakai pola konsistensi yang didefinisikan eksplisit.

## 6. CONCURRENCY
- Gunakan version/optimistic locking atau mekanisme locking database yang sesuai.
- Approval dan update saldo harus dilakukan dalam transaksi database.
- Gunakan idempotency key untuk mencegah duplikasi akibat retry.
- Bila version konflik, minta klien memuat ulang detail.

## 7. STATE MACHINE ADALAH ALGORITMA
Jangan menaruh semua aturan transisi di komponen UI atau controller.
Buat modul algoritma FSM murni yang memvalidasi:
- state saat ini
- event yang diminta
- role/permission hasil validasi service
- kondisi bisnis yang diperlukan
Kembalikan state berikutnya atau error code yang eksplisit.

## 8. ALUR PEMASUKAN MANDIRI WARGA (MEMBER INCOME SELF-REPORT)
- Pemasukan oleh Pengurus (Admin / Pengelola): Langsung COMPLETED dan membukukan CREDIT ke ledger saat diajukan.
- Pemasukan oleh Warga (Setoran Iuran Mandiri):
  * Warga menginput nominal, kategori, catatan, dan foto bukti transfer / kamera.
  * Transaksi masuk status SUBMITTED (Label: 'Menunggu Verifikasi Pengurus').
  * Saldo Kas Aman (Security Invariant): Sistem TIDAK membukukan CREDIT ke buku kas sebelum diverifikasi pengurus; saldo kas aktif tidak berubah.
  * Verifikasi Pengurus (Single-Approver):
    - APPROVE: Berpindah ke COMPLETED, membukukan entri CREDIT resmi ke LedgerEntry, saldo aktif bertambah, dan tercatat di rantai audit SHA-256.
    - REJECT: Berpindah ke REJECTED dengan mencatat alasan penolakan, saldo kas tidak berubah.

## 9. PAPAN REKAP IURAN KOMUNITAS & PEMBAYARAN MULTI-PERIODE (DUES & BILLING BOARD)
- Skema Tipe Iuran Kas per Dompet:
  * MONTHLY: Rutin bulanan kalender (Januari - Desember).
  * TARGET_INSTALLMENTS: Target N-kali setoran / termin berjangka (misal: 10 termin Qurban / 17-an).
  * FREEFORM: Donasi sukarela tanpa tagihan rutin.
- Nominal Iuran Bersifat Opsional:
  * Boleh diisi atau dikosongkan saat dompet dibuat oleh Admin.
  * Bila diisi, nominal ini menjadi pengali kalkulasi otomatis saat warga memilih periode iuran.
- Multi-Period Payment (Checklist Borongan):
  * Warga/Pengurus dapat mencentang beberapa periode sekaligus dalam satu transaksi (periodKeys).
  * Setiap periode dicatat di tabel dues_records dengan status PENDING saat transaksi dibuat.
  * Saat transaksi diverifikasi (APPROVE) atau disubmit langsung oleh Admin, seluruh periode bertransisi ke status PAID.
  * Jika transaksi ditolak (REJECT) atau dibatalkan (CANCEL), dues_records dihapus sehingga slot periode dibebaskan kembali.
- Transparansi Terbuka (Public Community Transparency):
  * Berbeda dari riwayat transaksi kas yang dibatasi privat untuk warga, Papan Iuran dapat diakses dan dilihat oleh seluruh anggota (Admin, Pengelola, Warga) untuk akuntabilitas dan gotong royong.
- Automasi Tindak Lanjut:
  * Rumus Kepatuhan: (total slot lunas / total slot iuran) * 100%.
  * Pembuatan otomatis pesan pengingat broadcast WhatsApp dan rekap tunggakan warga.

