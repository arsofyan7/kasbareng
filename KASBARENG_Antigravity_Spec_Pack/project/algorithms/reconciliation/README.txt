ALGORITHM: DETERMINISTIC RECONCILIATION MATCHER

TUJUAN
Mencocokkan mutasi eksternal dengan transaksi internal berdasarkan aturan yang dapat dijelaskan dan diulang.

INPUT
- normalized bank statement
- normalized internal transactions
- configured date window
- ruleset version

OUTPUT STATUS
MATCHED
AMBIGUOUS
UNMATCHED
DUPLICATE_POTENTIAL

PSEUDOCODE
1. Validasi dan normalisasi kedua dataset.
2. Jika external reference valid dan unik, cari exact reference.
3. Jika tidak ada referensi unik, cari kandidat dengan amount, direction, dan date window yang sesuai.
4. Jika tepat satu kandidat valid, tandai MATCHED.
5. Jika lebih dari satu kandidat valid, tandai AMBIGUOUS.
6. Jika tidak ada kandidat, tandai UNMATCHED.
7. Deteksi indikasi duplicate dan tandai DUPLICATE_POTENTIAL.
8. Simpan ruleset version dan rule code.

INVARIANT
- Amount dan direction harus cocok kecuali ada rule eksplisit lain.
- Jendela tanggal hanya menghasilkan kandidat, bukan bukti mutlak.
- Kasus ambigu tidak boleh dipasangkan otomatis.
- Manual match wajib mencatat aktor, waktu, alasan, dan audit event.
- Hasil harus dapat direproduksi dengan input dan ruleset yang sama.

KOMPLEKSITAS
Implementasi naif dapat O(B*T), dengan B mutasi bank dan T transaksi.
Dengan index/map berdasarkan amount+direction+date bucket atau reference, performa dapat ditingkatkan. Ukur dengan dataset eksperimen dan jangan mengklaim kompleksitas lebih baik tanpa melihat implementasi.

TESTS
- Exact reference.
- Nominal sama, direction sama, tanggal dalam window.
- Direction berbeda.
- Tanggal di luar window.
- Multiple candidates.
- Duplicate reference.
- Missing internal transaction.
- Missing bank statement.
