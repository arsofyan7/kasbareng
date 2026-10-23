# 📖 KASBARENG - Petunjuk Awal (Baca Dulu)

> **Versi**: 1.0
Tanggal: 17 Oktober 2026
Tujuan: Menjadi sumber kebutuhan utama untuk Google Antigravity AI ketika membangun KASBARENG.

## 📌 Cara Pakai
1. Ekstrak paket ini ke folder kerja.
2. Buka folder KASBARENG_Antigravity_Spec_Pack sebagai workspace di Antigravity.
3. Baca requirements/13_MASTER_PROMPT_ANTIGRAVITY.md terlebih dahulu.
4. Pastikan Antigravity membaca semua file di folder requirements/ sebelum membuat atau mengubah kode.
5. Implementasikan bertahap sesuai requirements/12_ROADMAP_IMPLEMENTASI.md.
6. Simpan kode algoritma inti pada project/algorithms/ atau padanan folder source code yang ditentukan pada requirements/03_ARSITEKTUR_DAN_TECH_STACK.md. Jangan mencampur algoritma inti ke komponen UI.
7. Setelah setiap fase, jalankan test yang diminta dan perbarui requirements/IMPLEMENTATION_STATUS.md.

## ⚠️ Aturan Penting
- Jangan membuat semua fitur sekaligus tanpa pengujian bertahap.
- Jangan mengarang fitur yang bertentangan dengan requirement.
- Jika ada konflik, prioritaskan urutan: aturan keamanan dan integritas, aturan bisnis/FSM, model data/API, UI/UX, lalu detail implementasi.
- Jangan mengklaim escrow dana aktual jika aplikasi hanya mengelola workflow persetujuan dan pencatatan.
- Jangan mengklaim forward security hanya karena memakai SHA-256 hash chain. Istilah yang digunakan untuk MVP adalah tamper-evident audit hash chain.
- AI hanya membuat draf. AI tidak boleh mengubah saldo, menyetujui transaksi, mengubah role, atau menyelesaikan transaksi.
- Semua pemeriksaan permission wajib dilakukan backend, bukan hanya dengan menyembunyikan tombol di frontend.
- Semua nominal uang harus memakai tipe decimal/integer satuan terkecil yang konsisten, bukan floating point.
- Status COMPLETED hanya boleh diberikan setelah syarat pembayaran dan pembukuan yang ditetapkan terpenuhi.
- Jangan menandai pekerjaan selesai jika test gagal atau fitur belum benar-benar diterapkan.
