ALGORITHM: SHA-256 TAMPER-EVIDENT HASH CHAIN

TUJUAN
Membuat audit event yang saling terhubung sehingga perubahan record dalam rantai dapat dideteksi saat verifikasi.

INPUT EVENT
- walletId
- sequenceNo
- canonicalPayload
- previousHash
- serverTimestamp

OUTPUT
- payloadHash
- currentHash

RUMUS KONSEPTUAL
payloadHash = SHA256(canonicalPayload)
currentHash = SHA256(canonical representation of {
  walletId, sequenceNo, previousHash, payloadHash, serverTimestamp
})

Gunakan canonicalization module. Jangan melakukan concatenation ambigu tanpa separator/length-prefix atau canonical encoding yang jelas.

VERIFIKASI
- Periksa urutan sequenceNo.
- Periksa previousHash.
- Hitung ulang payloadHash.
- Hitung ulang currentHash.
- Laporkan event pertama yang tidak valid.

BATASAN
Hash chain tidak otomatis memberikan forward security. Penyerang yang mampu menulis ulang seluruh database dan semua hash dapat membangun ulang rantai kecuali ada anchoring/checkpoint terpisah.
Untuk MVP gunakan istilah tamper-evident.
Jangan membuat algoritma SHA-256 sendiri. Gunakan implementasi crypto library bawaan platform yang mapan.
