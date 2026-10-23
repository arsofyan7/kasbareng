# 🎨 KASBARENG - UI/UX Requirements

> **Versi**: 1.0

## 1. ARAH VISUAL
Gunakan gaya Friendly Community Finance:
- Bersih, hangat, sederhana, dan profesional.
- Mobile-first dan responsif.
- Minim istilah teknis.
- Hindari dashboard yang terlalu padat atau grafik dekoratif yang tidak membantu tugas.
- Gunakan ikon sederhana, ruang putih cukup, dan hierarki informasi yang jelas.

## 2. DESIGN TOKENS AWAL
- Primary: hijau tua.
- Secondary: biru.
- Background: putih/abu-abu sangat muda.
- Success: hijau.
- Warning: kuning tua.
- Danger: merah.
- Text: abu-abu gelap.
Warna status harus selalu disertai teks atau ikon. Jangan menggunakan warna saja untuk menyampaikan arti.
Gunakan font sans-serif seperti Inter atau font sistem setara.
Ukuran teks isi awal sekitar 16 CSS px pada mobile.
Target sentuh diupayakan minimal 44 x 44 CSS px.
Target aksesibilitas: WCAG 2.2 AA untuk komponen utama.

## 3. NAVIGASI UTAMA
Menu:
- Beranda (Dashboard Saldo & Feed Aktivitas)
- Papan Iuran (Matriks Visual Iuran Bulanan/Termin/Bebas Seluruh Warga)
- Kantong Kas (Sub-alokasi kas komunitas)
- Persetujuan Kas (Kuorum M-of-N pengeluaran & tab verifikasi iuran warga)
- Rekonsiliasi Bank (Pencocokan rekening koran CSV 3-pass deterministik)
- Parser Chat AI (Draf transaksi pasif semi-otomatis)
- Kelola Anggota (Daftar warga, peran, dan kode akses komunitas)
- Profil & Tema (Kustomisasi tema, detail akun, & fitur algoritma)
Mobile: bottom navigation (7 tab responsif). Tombol toggle tema & avatar profil disembunyikan di header atas pada layar < 768px demi menjaga kerapian dan fokus informasi dompet kas.
Desktop/Tablet: sidebar kiri permanen dan header atas lengkap dengan pemilih dompet, toggle tema, serta menu dropdown profil.
Jangan menampilkan menu kosong atau tindakan yang tidak relevan bagi role pengguna.

## 4. LAYAR BERANDA
- Sapaan pengguna.
- Pemilih dompet aktif.
- Saldo tercatat dan, jika didukung model, saldo tersedia.
- Ringkasan pemasukan/pengeluaran periode.
- Tindakan yang membutuhkan perhatian.
- Lima aktivitas terbaru.
- Tombol aksi cepat sesuai permission.
Jangan menyamakan saldo aplikasi dengan saldo rekening bank aktual jika belum ada data rekening terbaru.
Tampilkan waktu pembaruan data bila relevan.

## 5. LAYAR KANTONG KAS
Setiap kartu menampilkan nama dompet, role pengguna di dompet tersebut, saldo, dan indikator perhatian.
Role harus berubah ketika pengguna berpindah dompet. Admin pada Dompet A tidak boleh mendapat hak Admin pada Dompet B secara otomatis.

## 6. LAYAR TRANSAKSI
Gunakan formulir satu kolom di mobile.
Field dasar: jenis transaksi, nominal, kategori, catatan/keperluan, tanggal bila diperlukan, dan lampiran.
Tampilkan ringkasan sebelum pengajuan.
Validasi dekat dengan field yang bermasalah.
Jangan menghapus input pengguna ketika terjadi error.

## 7. CHAT-TO-TRANSACTION
Contoh input: "beli cat pagar pos ronda 120 ribu".
Tampilkan kartu draf dengan jenis, nominal, kategori, catatan, dan lampiran.
Sediakan tindakan "Ubah Detail" dan "Kirim untuk Persetujuan".
Jika nominal atau informasi penting tidak jelas, tanyakan klarifikasi. Jangan menebak.
Chat AI hanya membuat draf. Tidak boleh mengubah saldo, memberi approval, mengubah role, atau menandai pembayaran selesai.

## 8. LAYAR PERSETUJUAN
Tampilkan pengaju, nominal, tujuan, tanggal, bukti, dan kemajuan kuorum.
Tindakan: Lihat Detail, Tolak, Minta Klarifikasi, Setujui.
Sebelum persetujuan, tampilkan ringkasan final yang akan disetujui.
Tolak self-approval jika policy melarangnya.
Persetujuan harus terikat pada versi transaksi yang tepat.
Jika data transaksi berubah, persetujuan versi lama tidak boleh dihitung.

## 9. LAYAR AKTIVITAS
Sediakan filter tanggal, jenis transaksi, kategori, dan status.
Detail menampilkan kronologi, bukti, approval, status pembayaran, dan informasi audit yang boleh dilihat pengguna.
Pengguna hanya melihat data sesuai kebijakan privasi dan permission.

## 10. LAYAR REKONSILIASI
Tampilkan ringkasan jumlah mutasi, matched, ambiguous, unmatched, dan duplicate potential.
Jelaskan alasan ketidakcocokan dengan bahasa sederhana.
Jangan otomatis memasangkan jika lebih dari satu kandidat valid.
Keputusan manual wajib memiliki alasan, aktor, waktu, dan audit trail.

## 11. LAYAR ADMIN
Kelola anggota, role, kebijakan persetujuan, ambang nominal, dan pengaturan dompet.
Sebelum menyimpan perubahan policy, tampilkan dampaknya.
Perubahan policy harus tercatat dan tidak boleh mengubah transaksi lama secara diam-diam.

## 12. PESAN ERROR
Pesan harus menjelaskan apa yang terjadi dan tindakan berikutnya.
Jangan tampilkan stack trace, SQL, token, secret, atau detail internal.
Jika koneksi terputus saat aksi sensitif, tampilkan "Status belum terkonfirmasi" sampai server mengonfirmasi.

## 13. OFFLINE
Boleh menyimpan draf lokal jika dirancang aman.
Aksi sensitif seperti approval, perubahan role, perubahan policy, dan perubahan saldo harus online dan dikonfirmasi server.
Jangan tampilkan tindakan offline sebagai berhasil sebelum server mengonfirmasi.

## 14. LAYAR PAPAN IURAN KOMUNITAS (COMMUNITY BILLING BOARD)
- Matriks visual pembayaran seluruh warga dengan kolom nama warga lengket (sticky).
- Indikator status berkode warna: Hijau (Lunas), Kuning (Menunggu Verifikasi), Abu-abu (Belum Bayar).
- 4 Kartu KPI: Tingkat Kepatuhan (Compliance Rate) dengan progress bar gradien, Total Kas Terkumpul vs Potensi Target, Jumlah Menunggu Verifikasi, dan Rasio Lunas vs Menunggak.
- Fitur Salin Rekap Tunggakan ke clipboard & Buat Pesan Pengingat Siap Kirim ke WhatsApp.
- Transparansi terbuka bagi seluruh anggota (Warga, Pengelola, Admin).

## 15. MODAL FITUR ALGORITMA & TATA KELOLA
- Mengonsolidasikan informasi teknis (Kuorum M-of-N, status Peran Pengguna, dan Audit Rantai SHA-256) ke dalam modal terdedikasi yang diakses via menu profil.
- Tombol aksi langsung "Buka Simulator & Inspeksi Audit SHA-256" yang memicu AuditChainModal untuk pengujian integritas kriptografis.
- Ringkasan algoritma inti: Double-Entry Ledger dan 3-Pass Bank Reconciliation.
- Modal di-mount pada root layout aplikasi untuk mencegah bug stacking context CSS backdrop-filter, dan diposisikan presisi di tengah layar (centered) dengan scrolling vertikal mulus.

## 16. HALAMAN AUTENTIKASI (LOGIN & DAFTAR)
- Menggunakan latar belakang gambar tematik kas komunitas gotong royong 3D resolusi tinggi dengan animasi slow-zoom breathing 24s berdaya akselerasi hardware.
- Lapisan ambient glow neon orbs dan radial vignette lembut berkanvas slate 950 dengan kontras 60%-70% seimbang.
- Kartu formulir di tengah menggunakan gaya glassmorphism tebal (backdrop-blur-2xl) dengan bayangan mendalam, menghasilkan kontras tinggi yang jelas terbaca di mode terang maupun mode gelap.

