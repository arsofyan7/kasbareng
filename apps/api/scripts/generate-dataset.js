/**
 * ============================================================================
 * generate-dataset.js - Script Pembangkit 10.000 Dataset Percakapan Kas Warga
 * ============================================================================
 * Menghasilkan:
 * 1. apps/api/data/slang_normalization_dictionary.json
 * 2. apps/api/data/kas_chat_dataset_10k.json
 * 3. apps/web/src/data/slang_normalization_dictionary.json
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// 1. KAMUS NORMALISASI SLANG & SINGKATAN INFORMAL WARGA
// ---------------------------------------------------------------------------
const SLANG_DICTIONARY = {
  // Singkatan Aksi & Status Transfer
  "udh": "sudah",
  "sdh": "sudah",
  "uda": "sudah",
  "ud": "sudah",
  "sdah": "sudah",
  "suwun": "terima kasih",
  "matur suwun": "terima kasih",
  "tq": "terima kasih",
  "tengkyu": "terima kasih",
  "makasi": "terima kasih",
  "makasih": "terima kasih",
  "mksh": "terima kasih",
  "mks": "terima kasih",
  "thx": "terima kasih",
  "trf": "transfer",
  "tf": "transfer",
  "tsf": "transfer",
  "xfer": "transfer",
  "transferan": "transfer",
  "kirim": "transfer",
  "ngirim": "transfer",
  "setor": "transfer",
  "nyetor": "transfer",
  "setoran": "transfer",
  "titip": "menitipkan",
  "nitip": "menitipkan",
  "titipan": "titipan",

  // Kata Penghubung & Preposisi
  "bwt": "untuk",
  "utk": "untuk",
  "untk": "untuk",
  "bt": "untuk",
  "buat": "untuk",
  "dr": "dari",
  "darii": "dari",
  "dri": "dari",
  "an": "atas nama",
  "a.n": "atas nama",
  "a/n": "atas nama",
  "atasnama": "atas nama",
  "sm": "sama",
  "dgn": "dengan",
  "dg": "dengan",
  "sy": "saya",
  "aq": "saya",
  "kmrn": "kemarin",
  "tdi": "tadi",
  "td": "tadi",
  "bsn": "barusan",
  "brsn": "barusan",
  "semalem": "semalam",
  "smalam": "semalam",

  // Sapaan & Jabatan Komunitas
  "min": "admin",
  "mimin": "admin",
  "ndahara": "bendahara",
  "bdhara": "bendahara",
  "bendum": "bendahara umum",
  "pakrt": "bapak ketua rt",
  "bu rt": "ibu rt",
  "burt": "ibu rt",
  "pak rw": "bapak ketua rw",
  "ketu": "ketua",

  // Istilah Finansial & Kas
  "duit": "uang",
  "artos": "uang",
  "yuran": "iuran",
  "iur": "iuran",
  "yuranan": "iuran",
  "infaq": "infak",
  "shodaqoh": "sedekah",
  "sodakoh": "sedekah",
  "bln": "bulan",
  "blnan": "bulanan",
  "jt": "juta",
  "rb": "ribu",
  "k": "ribu",
  "kocokan": "arisan",

  // Aksi Belanja & Pengeluaran
  "hbs": "habis",
  "abiss": "habis",
  "abis": "habis",
  "blanja": "belanja",
  "mbayar": "membayar",
  "bayarin": "membayar",
  "ongkos": "biaya",
  "struk": "bukti kuitansi",
  "kuitansi": "bukti kuitansi",
  "kwitansi": "bukti kuitansi",
  "nota": "nota pembelian",

  // Bulan Kalender
  "jan": "januari",
  "feb": "februari",
  "mar": "maret",
  "apr": "april",
  "mei": "mei",
  "jun": "juni",
  "jul": "juli",
  "ags": "agustus",
  "agst": "agustus",
  "agt": "agustus",
  "sep": "september",
  "sept": "september",
  "okt": "oktober",
  "nov": "november",
  "des": "desember",
};

// ---------------------------------------------------------------------------
// 2. BANK KOSAKATA DAN ELEMEN TEMPLATE
// ---------------------------------------------------------------------------
const GREETINGS = [
  "Halo min", "Halo bendahara", "Selamat pagi pak bendahara", "Selamat siang pak",
  "Selamat sore pak RT", "Malam admin", "Assalamu alaikum", "Permisi pak",
  "Mau lapor min", "Izin konfirmasi bendahara", "Lapor pak RT", "Punten pak",
  "Pak bendahara", "Bu bendahara", "Halo pak", "Siang bu", "Pagi pak", ""
];

const SIGN_OFFS = [
  "makasih ya", "terima kasih banyak", "mohon dicek ya min", "sudah dikirim ya",
  "struk ada di chat", "nota pembelian terlampir", "matur nuwun sanget",
  "semoga berkah", "sukses selalu buat warga", "titip salam buat pak RT",
  "tolong diupdate ya", "sudah masuk belum ya?", "makasi min", ""
];

const CITIZEN_NAMES = [
  "Bpk. Joko Widodo", "Bambang Sudarsono", "Ibu Siti Aminah", "Bu Ratna Sari",
  "Bpk. Hendra Gunawan", "Bpk. Tri Wahyudi", "Dewi Sartika", "Agus Salim",
  "Budi Santoso", "Sri Wahyuni", "Haji Ridwan", "Ahmad Fauzi",
  "Ibu Marlina", "Rudi Hermawan", "Eko Prasetyo", "Wawan Setiawan",
  "Pak Slamet", "Bu Endang", "Ibu Sri Mulyani", "Pak Dedi",
  "Keluarga Bpk. Hartono", "Mas Wahyu", "Mbak Maya", "Bu Dian",
  "Bpk. Supriadi", "Ibu Nurul", "Pak RT Hendra", "Ibu Hajah Maryam",
  "Bpk. Gunadi", "Keluarga Ibu Fatimah", "Mas Danang", "Bpk. Yanto",
  "Bu Yuli", "Ibu Indah", "Pak Teguh", "Mas Bayu", "Bu Ani", "Pak Tono"
];

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// ---------------------------------------------------------------------------
// 3. GENERATOR PEMASUKAN (INCOME) — 5.000 SAMPEL
// ---------------------------------------------------------------------------
const INCOME_SUBTYPES = [
  {
    category: "Iuran / Setoran Bulanan",
    amounts: [30000, 50000, 75000, 100000, 150000, 200000, 250000, 300000, 500000],
    phrases: [
      "sudah transfer iuran kas bersama",
      "nitip bayar iuran bulanan kas rt",
      "tf uang kas warga dan sampah",
      "konfirmasi setoran iuran kas paguyuban",
      "bayar iuran keamanan portal dan kebersihan",
      "setor kas rutin bulanan warga",
      "kirim dana iuran kas bulanan",
      "transferan iuran kas arisan warga",
      "sudah trf iuran paguyuban",
      "lunas iuran kas bulanan",
      "setoran kas wajib anggota keluarga"
    ]
  },
  {
    category: "Donasi & Dana Sosial",
    amounts: [50000, 100000, 150000, 200000, 250000, 300000, 500000, 1000000, 1500000],
    phrases: [
      "titip donasi dana sosial warga",
      "transfer sedekah kas duka cita keluarga",
      "infaq santunan warga sakit",
      "sumbangan sukarela kas sosial paguyuban",
      "kirim titipan donasi anak yatim",
      "sedekah kas warga buat perbaikan musala",
      "bantuan sosial sukarela dari keluarga",
      "titip infak kas sosial kegiatan warga"
    ]
  },
  {
    category: "Setoran Acara & Kegiatan Khusus",
    amounts: [50000, 75000, 100000, 150000, 200000, 250000, 350000, 500000],
    phrases: [
      "iuran khusus acara perlombaan 17 agustus",
      "setoran dana pendaftaran family gathering",
      "transfer patungan touring klub sepeda",
      "iuran halal bihalal warga rt",
      "uang pendaftaran senam bersama warga",
      "setoran kas panitia bazar kemerdekaan",
      "iuran konsumsi kerja bakti massal"
    ]
  },
  {
    category: "Pengembalian Sisa Anggaran Panitia",
    amounts: [25000, 45000, 65000, 120000, 185000, 250000, 420000],
    phrases: [
      "pengembalian sisa uang belanja operasional",
      "kembalian dana sisa anggaran konsumsi rapat",
      "transfer sisa saldo kas panitia perlombaan",
      "refund kelebihan dana belanja material pos",
      "setor sisa dana kas kegiatan warga"
    ]
  }
];

// ---------------------------------------------------------------------------
// 4. GENERATOR PENGELUARAN (EXPENSE) — 5.000 SAMPEL
// ---------------------------------------------------------------------------
const EXPENSE_SUBTYPES = [
  {
    category: "Operasional & Perlengkapan",
    amounts: [35000, 65000, 85000, 120000, 150000, 225000, 350000, 450000, 750000],
    phrases: [
      "tadi beli lampu penerangan jalan dan pos ronda",
      "habis beli semen pasir buat tambal trotoar jalan",
      "pengeluaran beli gembok baru dan rantai portal",
      "biaya service cctv pos satpam dan kabel lan",
      "beli sapu lidi tempat sampah dan serokan warga",
      "pembelian kabel listrik pipa dan saklar lampu pos",
      "beli cat minyak dan kuas buat pos ronda",
      "pengeluaran belanja perlengkapan gotong royong"
    ]
  },
  {
    category: "Konsumsi & Agenda Rapat",
    amounts: [25000, 45000, 75000, 95000, 135000, 180000, 250000, 320000],
    phrases: [
      "beli konsumsi dan snack gorengan rapat pengurus",
      "habis beli kopi gula dan teh buat pos ronda malam",
      "pengeluaran makan malam warga pas ronda semalam",
      "pesan air minum galon aqua 3 buah untuk pos",
      "biaya konsumsi kerja bakti saluran air pagi tadi",
      "beli snack tumpeng mini pertemuan arisan warga"
    ]
  },
  {
    category: "Honor & Insentif Petugas",
    amounts: [300000, 500000, 750000, 1000000, 1200000, 1500000, 2000000],
    phrases: [
      "pembayaran honor bulanan petugas satpam portal",
      "uang lelah dan rokok petugas kebersihan sampah",
      "honor tukang potong rumput lapangan warga",
      "insentif jaga pos hansip dan keamanan malam",
      "bayar gaji pengangkut sampah lingkungan rt"
    ]
  },
  {
    category: "Bantuan & Santunan Sosial",
    amounts: [150000, 250000, 300000, 500000, 750000, 1000000],
    phrases: [
      "penyerahan santunan duka cita keluarga warga",
      "pengeluaran dana kas untuk jenguk warga sakit di rs",
      "bantuan sosial tanggap bencana buat keluarga warga",
      "beli bingkisan jenguk warga yang baru melahirkan",
      "tali asih kas bersama untuk pensiunan pengurus"
    ]
  },
  {
    category: "Biaya Acara & Perlombaan",
    amounts: [150000, 250000, 450000, 650000, 900000, 1500000, 2500000],
    phrases: [
      "sewa sound system dan panggung acara kemerdekaan",
      "beli hadiah piala perlombaan anak-anak 17 agustus",
      "cetak banner spanduk agenda jalan sehat paguyuban",
      "sewa tenda dan kursi acara halal bihalal warga"
    ]
  }
];

// ---------------------------------------------------------------------------
// HELPER FORMATTING & NORMALISASI
// ---------------------------------------------------------------------------
function formatAmount(amount, styleIdx) {
  const thousand = amount / 1000;
  switch (styleIdx % 6) {
    case 0: return `${thousand}rb`;
    case 1: return `${thousand} rb`;
    case 2: return `${thousand}k`;
    case 3: return `Rp ${amount.toLocaleString('id-ID')}`;
    case 4: return `Rp${amount}`;
    case 5: return `${amount.toLocaleString('id-ID')} rupiah`;
    default: return `${thousand}rb`;
  }
}

function normalizeText(rawText) {
  let cleaned = rawText.toLowerCase();

  // Bersihkan tanda baca tepi
  cleaned = cleaned.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");

  // Normalisasi token kata menggunakan kamus slang
  const words = cleaned.split(/\s+/).filter(Boolean);
  const normalizedWords = words.map(w => SLANG_DICTIONARY[w] || w);

  return normalizedWords.join(" ");
}

// ---------------------------------------------------------------------------
// EKSEKUSI PEMBANGKIT DATASET
// ---------------------------------------------------------------------------
console.log("Memulai pembuatan dataset percakapan kas warga (10.000 sampel)...");

const dataset = [];
let idCounter = 1;

// 1. Generate 5.000 data Pemasukan (INCOME)
const TARGET_INCOME = 5000;
for (let i = 0; i < TARGET_INCOME; i++) {
  const sub = INCOME_SUBTYPES[i % INCOME_SUBTYPES.length];
  const phrase = sub.phrases[i % sub.phrases.length];
  const amount = sub.amounts[(i * 7) % sub.amounts.length];
  const formattedAmt = formatAmount(amount, i);
  const sender = CITIZEN_NAMES[(i * 3) % CITIZEN_NAMES.length];
  const month = MONTHS[(i * 5) % MONTHS.length];
  const greeting = GREETINGS[(i * 11) % GREETINGS.length];
  const signoff = SIGNOFFS = SIGN_OFFS[(i * 13) % SIGN_OFFS.length];

  // Susun variasi kalimat chat
  const preposition = (i % 3 === 0) ? "dari" : (i % 3 === 1) ? "an" : "atas nama";
  const monthClause = (i % 2 === 0) ? `untuk bulan ${month}` : `periode ${month}`;

  let raw_text = "";
  if (i % 4 === 0) {
    raw_text = `${greeting}, ${phrase} ${monthClause} sebesar ${formattedAmt} ${preposition} ${sender}. ${signoff}`.trim();
  } else if (i % 4 === 1) {
    raw_text = `${phrase} ${formattedAmt} ${monthClause} ${preposition} ${sender}. ${signoff}`.trim();
  } else if (i % 4 === 2) {
    raw_text = `Konfirmasi transfer kas: ${sender} sudah bayar ${formattedAmt} ${phrase} ${monthClause}`.trim();
  } else {
    raw_text = `${greeting} ${preposition} ${sender} kirim ${formattedAmt} bwt ${phrase}. Makasih`.trim();
  }

  // Bersihkan spasi ganda
  raw_text = raw_text.replace(/\s+/g, ' ').replace(/\s+([.,])/g, '$1');
  const normalized_text = normalizeText(raw_text);

  dataset.push({
    id: idCounter++,
    raw_text,
    normalized_text,
    intent: "INCOME",
    category: sub.category,
    amount,
    sender,
    month,
    tokens_count: normalized_text.split(" ").length
  });
}

// 2. Generate 5.000 data Pengeluaran (EXPENSE)
const TARGET_EXPENSE = 5000;
for (let i = 0; i < TARGET_EXPENSE; i++) {
  const sub = EXPENSE_SUBTYPES[i % EXPENSE_SUBTYPES.length];
  const phrase = sub.phrases[i % sub.phrases.length];
  const amount = sub.amounts[(i * 11) % sub.amounts.length];
  const formattedAmt = formatAmount(amount, i);
  const sender = CITIZEN_NAMES[(i * 5) % CITIZEN_NAMES.length];
  const greeting = GREETINGS[(i * 7) % GREETINGS.length];
  const signoff = SIGN_OFFS[(i * 17) % SIGN_OFFS.length];

  let raw_text = "";
  if (i % 3 === 0) {
    raw_text = `${greeting}, ${phrase} total biaya habis ${formattedAmt} oleh ${sender}. ${signoff}`.trim();
  } else if (i % 3 === 1) {
    raw_text = `Catatan kas keluar: ${phrase} ${formattedAmt}. Pengadaan oleh ${sender}. ${signoff}`.trim();
  } else {
    raw_text = `Lapor kas keluar sebesar ${formattedAmt} buat ${phrase} tadi siang dari ${sender}`.trim();
  }

  raw_text = raw_text.replace(/\s+/g, ' ').replace(/\s+([.,])/g, '$1');
  const normalized_text = normalizeText(raw_text);

  dataset.push({
    id: idCounter++,
    raw_text,
    normalized_text,
    intent: "EXPENSE",
    category: sub.category,
    amount,
    sender,
    month: null,
    tokens_count: normalized_text.split(" ").length
  });
}

// ---------------------------------------------------------------------------
// PENYIMPANAN ARTIFAK HASIL GENERASI
// ---------------------------------------------------------------------------
const apiDataDir = path.resolve(__dirname, '../data');
const webDataDir = path.resolve(__dirname, '../../web/src/data');

if (!fs.existsSync(apiDataDir)) fs.mkdirSync(apiDataDir, { recursive: true });
if (!fs.existsSync(webDataDir)) fs.mkdirSync(webDataDir, { recursive: true });

// 1. Simpan Kamus Normalisasi Slang (JSON)
const slangJson = JSON.stringify(SLANG_DICTIONARY, null, 2);
fs.writeFileSync(path.join(apiDataDir, 'slang_normalization_dictionary.json'), slangJson, 'utf-8');
fs.writeFileSync(path.join(webDataDir, 'slang_normalization_dictionary.json'), slangJson, 'utf-8');

// 2. Simpan 10.000 Dataset Percakapan Kas (JSON)
const datasetPath = path.join(apiDataDir, 'kas_chat_dataset_10k.json');
fs.writeFileSync(datasetPath, JSON.stringify(dataset, null, 2), 'utf-8');

console.log(`✅ Berhasil!`);
console.log(`- Kamus Slang disimpan di: ${path.join(apiDataDir, 'slang_normalization_dictionary.json')}`);
console.log(`- Dataset 10.000 tersimpan di: ${datasetPath}`);
console.log(`- Total data: ${dataset.length} baris (INCOME: 5.000, EXPENSE: 5.000)`);

