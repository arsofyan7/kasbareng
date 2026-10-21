ALGORITHM: FSM TRANSITION VALIDATOR

TUJUAN
Memastikan status transaksi hanya berubah melalui transisi yang diperbolehkan.

INPUT
- currentState
- event
- context: atribut non-secret seperti jenis transaksi, version, policy checks yang sudah disiapkan service.

OUTPUT
- allowed: boolean
- nextState jika valid
- errorCode jika tidak valid

PSEUDOCODE
1. Cari transisi untuk pasangan currentState + event.
2. Jika tidak ditemukan, kembalikan INVALID_STATE_TRANSITION.
3. Periksa guard khusus event.
4. Jika guard gagal, kembalikan error code yang spesifik.
5. Jika semua guard lolos, kembalikan nextState.
Catatan: autentikasi dan izin aktor harus diperiksa service/authorization layer. FSM dapat menerima hasil policy check, tetapi tidak menggantikan authorization backend.

INVARIANT
- Tidak ada transisi yang tidak terdefinisi.
- APPROVED tidak sama dengan COMPLETED.
- COMPLETED memerlukan payment verification dan ledger posting sesuai kebijakan.
- REJECTED/CANCELLED tidak boleh diam-diam diubah kembali tanpa event revisi yang sah.

EDGE CASE
- Event duplikat.
- State sudah berubah oleh request lain.
- Version tidak cocok.
- Data transaksi berubah setelah approval.
- Status final menerima event baru.

KOMPLEKSITAS
Dengan map transisi, lookup rata-rata O(1) untuk pasangan state/event.

TEST VECTORS
- DRAFT + SUBMIT => SUBMITTED.
- PENDING_APPROVAL + APPROVE_WITH_QUORUM => APPROVED.
- PENDING_APPROVAL + COMPLETE => INVALID_STATE_TRANSITION.
- APPROVED + PAYMENT_CONFIRMED => tidak langsung COMPLETED kecuali verification guard terpenuhi.
