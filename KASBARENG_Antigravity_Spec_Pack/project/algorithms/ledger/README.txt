ALGORITHM: LEDGER BALANCE CALCULATOR

TUJUAN
Menghitung saldo berdasarkan entri ledger yang telah diposting dan reservasi yang masih aktif.

INPUT
- daftar ledger entries untuk satu wallet dan currency
- status posting/validitas setiap entry
- daftar reservasi aktif jika disimpan terpisah

OUTPUT
- postedBalance
- activeReservations
- availableBalance
- validationErrors bila ada data tidak konsisten

ATURAN
Definisikan tanda debit/kredit secara eksplisit. Contoh:
CREDIT menambah saldo.
DEBIT mengurangi saldo.
RESERVATION mengurangi saldo tersedia tetapi tidak mengubah saldo tercatat.
RELEASE_RESERVATION menghapus reservasi.
REVERSAL adalah entri baru yang mengoreksi entri sebelumnya.

PSEUDOCODE
1. Validasi currency dan amount setiap entry.
2. Jumlahkan CREDIT dan kurangi DEBIT untuk postedBalance.
3. Jumlahkan reservasi aktif untuk activeReservations.
4. availableBalance = postedBalance - activeReservations.
5. Jika kebijakan melarang saldo negatif dan availableBalance < 0, laporkan pelanggaran.

INVARIANT
- Jangan menggunakan floating point untuk uang.
- Tidak ada penghapusan histori untuk koreksi.
- Ringkasan balance harus dapat dibandingkan dengan hasil perhitungan ledger.
- Reservasi tidak boleh dihitung dua kali.

KOMPLEKSITAS
O(E), E adalah jumlah ledger entries yang diperiksa.
