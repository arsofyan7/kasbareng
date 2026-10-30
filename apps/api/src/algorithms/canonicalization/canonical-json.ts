/**
 * ============================================================================
 * MODUL ALGORITMA: KANONIKALISASI JSON (RFC 8785 JSON CANONICALIZATION SCHEME)
 * ============================================================================
 *
 * FUNGSI MODUL:
 * Menghasilkan representasi string JSON yang deterministik, stabil, dan konsisten
 * dari struktur data JavaScript apa pun.
 *
 * KONTEKS BISNIS & KEAMANAN FINANSIAL:
 * Dalam sistem keuangan Kasbareng, integritas data audit dan mutasi kas dilindungi
 * oleh rantai hash kriptografis (SHA-256 Hash Chain).
 * Masalah fundamental pada JSON standar (`JSON.stringify` bawaan runtime):
 * 1. Urutan key dalam JavaScript Object bersifat tidak terjamin (non-deterministic).
 *    Contoh: `{ "amount": 10000, "note": "Beli semen" }` vs `{ "note": "Beli semen", "amount": 10000 }`
 *    memiliki makna bisnis identik, namun menghasilkan JSON string berbeda.
 * 2. Perbedaan karakter whitespace (spasi, newline) atau representasi tanggal
 *    dapat menghasilkan digest SHA-256 yang berbeda total (avalanche effect).
 *
 * Jika payload keuangan menghasilkan hash berbeda hanya karena urutan key,
 * maka mekanisme verifikasi integritas audit trail akan gagal (false positive tampering alarm).
 * Oleh karena itu, kanonikalisasi deterministik sesuai standar RFC 8785 adalah prasyarat
 * mutlak sebelum payload ditandatangani atau di-hash.
 */

/**
 * Mengubah nilai data sembarang (object, array, primitif) menjadi string JSON kanonikal deterministik.
 *
 * Aturan Kanonikalisasi:
 * - Kunci objek (object keys) diurutkan secara leksikografis berdasarkan kode unit UTF-16.
 * - Whitespace dihilangkan sepenuhnya (tidak ada spasi setelah koma atau titik dua).
 * - Objek Date dinormalisasi ke format ISO-8601 UTC string deterministik.
 * - Tipe BigInt (representasi minor unit mata uang) dikonversi ke string numerik aman tanpa crash.
 * - Nilai `undefined` dan `function` dalam objek diabaikan sesuai spesifikasi JSON.
 *
 * @param value - Nilai input sembarang yang akan dikanonikalkan.
 * @returns String JSON representasi kanonikal yang deterministik dan siap di-hash.
 */
export function canonicalizeJson(value: unknown): string {
  /**
   * Fungsi pembantu internal rekursif untuk menelusuri hierarki struktur data.
   *
   * @param obj - Simpul (node) data yang sedang diproses.
   * @returns Bagian string JSON kanonikal untuk simpul tersebut.
   */
  function serialize(obj: unknown): string {
    // ------------------------------------------------------------------------
    // Guard 1: Penanganan Nilai Null
    // Mengembalikan literal 'null' sesuai spesifikasi JSON primitif.
    // ------------------------------------------------------------------------
    if (obj === null) {
      return 'null';
    }

    // ------------------------------------------------------------------------
    // Guard 2: Penanganan Objek Date
    // Diperlukan karena timezone lokal server dapat bervariasi.
    // Dengan `.toISOString()`, seluruh timestamp dinormalisasi ke standar UTC (Zulu time)
    // sehingga menghasilkan string representasi waktu yang identik di server mana pun.
    // ------------------------------------------------------------------------
    if (obj instanceof Date) {
      return JSON.stringify(obj.toISOString());
    }

    // ------------------------------------------------------------------------
    // Guard 3: Penanganan Primitif Boolean dan Number
    // Menggunakan JSON.stringify standar untuk encoding IEEE-754 / boolean tanpa spasi.
    // ------------------------------------------------------------------------
    if (typeof obj === 'boolean' || typeof obj === 'number') {
      return JSON.stringify(obj);
    }

    // ------------------------------------------------------------------------
    // Guard 4: Penanganan String
    // Memastikan karakter khusus (kutip ganda, escape sequence, control characters)
    // di-escape secara deterministik sesuai standar spesifikasi RFC 8259 / RFC 8785.
    // ------------------------------------------------------------------------
    if (typeof obj === 'string') {
      return JSON.stringify(obj);
    }

    // ------------------------------------------------------------------------
    // Guard 5: Penanganan BigInt (Representasi Finansial Minor Unit)
    // Dalam JavaScript bawaan, `JSON.stringify(100n)` melempar TypeError: Do not know how to serialize a BigInt.
    // Pada sistem perbankan / Kasbareng, nilai moneter disimpan dalam BigInt minor units
    // (misal: rupiah penuh tanpa sen atau sen integer) guna menghindari bug pembulatan floating point.
    // Konversi langsung ke string digit numerik menjaga keutuhan nilai nominal tanpa error.
    // ------------------------------------------------------------------------
    if (typeof obj === 'bigint') {
      return obj.toString();
    }

    // ------------------------------------------------------------------------
    // Guard 6: Penanganan Array
    // Array mempertahankan urutan aslinya karena urutan elemen dalam array
    // membawa signifikansi semantik bisnis (contoh: urutan riwayat mutasi atau approval).
    // Setiap elemen di-serialize secara rekursif dan digabungkan dengan pemisah koma tanpa spasi.
    // ------------------------------------------------------------------------
    if (Array.isArray(obj)) {
      const items = obj.map((item) => serialize(item));
      return '[' + items.join(',') + ']';
    }

    // ------------------------------------------------------------------------
    // Guard 7: Penanganan Objek (Dictionary / Hash Map)
    // Inti dari kanonikalisasi:
    // 1. Kunci objek diambil dan diurutkan secara leksikografis (alphabetical UTF-16).
    // 2. Properti dengan nilai `undefined` atau `function` dilewati (omitted).
    // 3. Pasangan key dan value dibentuk dengan format `"key":value` tanpa spasi.
    // 4. Hasil dibungkus dalam kurung kurawal `{...}`.
    // ------------------------------------------------------------------------
    if (typeof obj === 'object') {
      // Urutkan kunci secara leksikografis menggunakan perbandingan kode unit UTF-16
      const keys = Object.keys(obj as Record<string, unknown>).sort();
      const pairs: string[] = [];

      for (const key of keys) {
        const val = (obj as Record<string, unknown>)[key];
        // Standar JSON: properti bernilai undefined atau function diabaikan dari serialisasi
        if (val !== undefined && typeof val !== 'function') {
          pairs.push(JSON.stringify(key) + ':' + serialize(val));
        }
      }

      return '{' + pairs.join(',') + '}';
    }

    // ------------------------------------------------------------------------
    // Fallback: Tipe data lain yang tidak dikenal / tidak didukung (misal: Symbol)
    // dinormalisasi menjadi 'null' untuk menjaga kestabilan aliran kanonikalisasi.
    // ------------------------------------------------------------------------
    return 'null';
  }

  return serialize(value);
}

/**
 * Alias ekspor untuk memudahkan kompatibilitas pemanggilan fungsi
 * di berbagai komponen sistem (mendukung gaya penamaan canonicalJson maupun canonicalizeJson).
 */
export const canonicalJson = canonicalizeJson;
