ALGORITHM: CANONICAL PAYLOAD REPRESENTATION

TUJUAN
Membuat representasi byte yang stabil sebelum payload di-hash atau ditandatangani.

INPUT
Objek event/transaksi dengan schema yang telah ditetapkan.

OUTPUT
Representasi kanonis string/byte yang stabil.

ATURAN
- Urutan key harus stabil.
- Nominal harus memakai format yang ditentukan dan tidak bergantung locale.
- Tanggal harus ISO-8601 dengan timezone yang jelas.
- Null, string kosong, boolean, dan angka harus punya representasi yang konsisten.
- Unicode harus diperlakukan secara konsisten.
- Field yang tidak termasuk schema tidak boleh diam-diam masuk payload.
- Jangan memasukkan secret atau PII yang tidak diperlukan.

PSEUDOCODE
1. Validasi object terhadap schema.
2. Ambil hanya field yang diizinkan.
3. Normalisasi tanggal, nominal, dan string.
4. Urutkan key secara deterministik.
5. Serialize dengan aturan yang ditetapkan.
6. Encode menjadi UTF-8 bytes.

EDGE CASE
- Key tambahan.
- Nominal 1000 vs 1000.00.
- Timestamp dengan timezone berbeda.
- Unicode normalization.
- Null vs field tidak ada.

Dokumentasikan format secara rinci karena perubahan canonicalization dapat membuat hash lama tidak cocok.
