KASBARENG - ALGORITHM LAB
Folder ini didedikasikan untuk algoritma inti agar mudah dipresentasikan dan diuji secara akademik.

ATURAN
- Letakkan algoritma domain yang dapat diuji secara terpisah di sini.
- Jangan letakkan komponen React, HTTP controller, atau query database langsung di sini.
- Algoritma harus menerima input eksplisit dan menghasilkan output eksplisit.
- Gunakan type/interface yang jelas.
- Setiap modul harus punya unit test, test vectors, pseudocode, invariant, dan catatan kompleksitas bila relevan.
- Service layer memanggil algoritma, memvalidasi permission, dan mengelola transaksi database.
- Jangan menyimpan secret/private key di folder ini.
- Algoritma tidak boleh mengandalkan state global tersembunyi.

MODUL:
1. fsm/ : validator transisi status transaksi.
2. quorum/ : evaluasi M-of-N approvals.
3. ledger/ : perhitungan saldo dan reservasi.
4. canonicalization/ : representasi stabil untuk payload hashing.
5. hash-chain/ : pembuatan dan verifikasi rantai hash.
6. reconciliation/ : normalisasi dan pencocokan mutasi.
Setiap README modul menjelaskan masalah, input/output, pseudocode, aturan, edge case, kompleksitas, dan hubungan dengan service.
