/**
 * ============================================================================
 * LandingPage.tsx - Halaman Pembuka Publik (Marketing & Showcase KasBareng)
 * ============================================================================
 * Komponen halaman pendaratan utama (Landing Page) yang menyajikan profil solusi KasBareng:
 * 1. Hero Section: Memperkenalkan proposisi nilai "Kelola Kas Bersama Tanpa Curiga, Bebas Drama"
 *    dengan tangkapan layar responsif desktop dan mobile PWA.
 * 2. Data & Dampak Nasional: Statistik agregat kas informal (1.050.000+ RT, > Rp 3,5 Triliun kas komunal,
 *    dan 92% masih memakai buku tulis / Excel manual).
 * 3. Analisis Masalah Kas Manual: Menjelaskan 4 titik rentan konflik (beban bendahara sendirian,
 *    belanja kas sepihak, manipulasi spreadsheet, dan selisih rekening bank).
 * 4. Rincian 4 Fitur Inti Berstandar Finansial:
 *    - Kuorum Persetujuan Belanja M-of-N (Anti-Self Approval Guard)
 *    - Buku Kas Kriptografis RFC 8785 SHA-256 Linked Hash Chain
 *    - Papan Iuran Pintar & Pengingat WhatsApp
 *    - Rekonsiliasi Rekening Koran Bank Otomatis (3-Pass CSV Matcher)
 * 5. Tampilan Mobile-First PWA: Memperlihatkan antarmuka Quick Action Sheet dan Gated Access Code.
 * 6. Skenario Penggunaan (Use Cases) Interaktif: Tab pemilih untuk RT/RW, Paguyuban/Hobi, dan Keluarga/Arisan.
 * 7. Aksesibilitas Global: Pengalih bahasa (Bilingual ID/EN), Dark/Light theme toggle,
 *    dan tombol aksi langsung (CTA) menuju gerbang otentikasi.
 */

import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Wallet,
  ShieldCheck,
  Lock,
  Smartphone,
  Users2,
  ArrowRight,
  Sun,
  Moon,
  CheckCircle2,
  Sparkles,
  BarChart3,
  ChevronRight,
  Globe2,
  FileText,
  BadgeAlert,
  Zap,
} from 'lucide-react';

// Konstanta URL aset gambar ilustrasi mockup antarmuka
const heroShowcaseImg = '/kasbareng-hero-showcase.png';
const duesImg = '/desktop-dues.png';
const mobileQuickImg = '/mobile-quick-action.png';
const mobileDashImg = '/mobile-dashboard.png';

/**
 * Interface properti komponen LandingPage
 */
interface LandingPageProps {
  onGoToLogin: () => void; // Callback pemicu navigasi langsung ke halaman login/register
}

// Tipe bahasa yang didukung oleh kamus landing page
type Lang = 'id' | 'en';

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin }) => {
  // ---------------------------------------------------------------------------
  // CONTEXT & STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  // Mengambil state tema aktif dan fungsi toggle tema dari ThemeContext
  const { isDark, toggleTheme } = useTheme();

  // State bahasa aktif ('id' untuk Bahasa Indonesia, 'en' untuk English)
  const [lang, setLang] = useState<Lang>('id');

  // State tab skenario kasus penggunaan komunitas yang sedang dipilih
  const [activeTab, setActiveTab] = useState<'rt' | 'komunitas' | 'keluarga'>('rt');

  // ---------------------------------------------------------------------------
  // KAMUS KONTEN BILINGUAL (ID / EN)
  // ---------------------------------------------------------------------------
  const t = {
    id: {
      badge: 'Solusi Pembukuan Kas Komunitas & Paguyuban Modern',
      heroTitle1: 'Kelola Kas Bersama',
      heroTitle2: 'Tanpa Curiga, Bebas Drama.',
      heroDesc:
        'Aplikasi kas bersama berbasis PWA untuk RT/RW, paguyuban, dan komunitas dengan persetujuan belanja multi-pengurus (Kuorum M-of-N), audit kriptografis SHA-256 anti-manipulasi, dan papan rekap iuran otomatis.',
      ctaPrimary: 'Buka Aplikasi / Masuk',
      ctaSecondary: 'Pelajari Fitur Utama',
      navFeatures: 'Fitur Utama',
      navWhy: 'Mengapa Kasbareng',
      navImpact: 'Dampak & Data',
      navUseCases: 'Untuk Siapa',
      stat1Val: '1.050.000+',
      stat1Lbl: 'Rukun Tetangga di Indonesia',
      stat1Sub: 'Sumber: Kemendagri RI',
      stat2Val: '> Rp 3,5 T',
      stat2Lbl: 'Estimasi Kas Komunal / Thn',
      stat2Sub: 'Perputaran kas mikro informal',
      stat3Val: '92%',
      stat3Lbl: 'Masih Pakai Cara Manual',
      stat3Sub: 'Buku tulis & chat WhatsApp',
      stat4Val: '100% Anti-Edit',
      stat4Lbl: 'Audit Trail Kriptografis',
      stat4Sub: 'SHA-256 Linked Chain',
      whyTitle: 'Mengapa Kas Komunitas Sering Memicu Salah Paham?',
      whySubtitle: 'Bukan karena niat buruk, melainkan sistem lama yang tidak menyediakan perlindungan.',
      pain1Title: 'Beban Berat Bendahara Sendirian',
      pain1Desc: 'Waktu tersita habis mencatat kuitansi manual. Saat ada selisih hitung sedikit saja, bendahara paling rentan dicurigai.',
      pain2Title: 'Belanja Kas Keluar Sepihak',
      pain2Desc: 'Uang kas terpakai tanpa persetujuan pengurus lain, memicu rasa tidak enak dan prasangka antar warga.',
      pain3Title: 'Catatan Excel Mudah Diutak-Atik',
      pain3Desc: 'File spreadsheet di laptop bisa diedit kapan saja tanpa jejak audit, sedangkan slip transfer tercecer di chat.',
      pain4Title: 'Rekonsiliasi Bank yang Menghabiskan Waktu',
      pain4Desc: 'Saldo di buku kas fisik hampir tidak pernah cocok dengan saldo rekening bank resmi di akhir bulan.',
      featureHeadingBadge: 'Fitur Inti Berstandar Finansial',
      featureHeadingTitle: 'Keamanan Setara Perusahaan, Tampilan Seringkas E-Wallet',
      f1Badge: 'Tata Kelola Pengeluaran',
      f1Title: 'Izin Belanja Bersama (Kuorum M-of-N)',
      f1Desc: 'Pengeluaran kas wajib disetujui minimal 2 pengurus (contoh: Ketua RT + Sekretaris). Si pembuat draf dilarang menyetujui anggarannya sendiri (Anti-Self Approval Guard).',
      f2Badge: 'Integritas Data',
      f2Title: 'Buku Kas Bersegel SHA-256 Anti-Tamper',
      f2Desc: 'Setiap transaksi diikat dalam rantai hash kriptografis berstandar RFC 8785. Jika ada yang iseng mengubah data di database, sistem seketika membunyikan alarm manipulasi.',
      f3Badge: 'Kepatuhan Warga',
      f3Title: 'Papan Iuran Pintar & Pengingat WhatsApp',
      f3Desc: 'Matriks iuran visual transparan untuk seluruh anggota. Warga bisa lapor transfer mandiri, bayar borongan 6-12 bulan, dan pengurus bisa kirim notifikasi santun.',
      f4Badge: 'Efisiensi Waktu',
      f4Title: 'Pencocokan Rekening Koran Bank Otomatis',
      f4Desc: 'Tinggal upload mutasi CSV resmi (BCA, Mandiri, BRI, BNI). Algoritma 3-Pass mencocokkan nominal, tanggal, dan berita transfer dalam sekejap.',
      mobileTitle: 'Ringan, Ramah Warga, Tanpa Unduh Play Store',
      mobileDesc: 'Teknologi Progressive Web App (PWA) memungkinkan aplikasi dibuka langsung dari link WhatsApp warga di smartphone apa saja. Cukup 2 ketukan untuk catat kas atau cek saldo.',
      useCaseTitle: 'Dirancang Tepat Sasaran untuk Berbagai Komunitas',
      useCaseSubtitle: 'Satu akun dapat mengelola banyak kas sekaligus dengan peran berbeda (Admin, Pengelola, atau Warga).',
      tabRt: 'RT & RW Perumahan',
      tabKomunitas: 'Paguyuban & Hobi',
      tabKeluarga: 'Kas Keluarga & Arisan',
      ctaBottomTitle: 'Siap Wujudkan Kas Komunitas yang Transparan & Damai?',
      ctaBottomSubtitle: 'Mulai kelola kas paguyuban Anda sekarang. Gratis dicoba tanpa instalasi rumit.',
      ctaBottomBtn: 'Masuk ke Kasbareng Sekarang',
      footerRights: 'KASBARENG — Platform Tata Kelola Kas Bersama & Keuangan Komunitas Modern.',
      langSwitch: 'English',
    },
    en: {
      badge: 'Modern Financial Governance for Communities & Guilds',
      heroTitle1: 'Manage Group Treasury',
      heroTitle2: 'Zero Suspicion, Zero Drama.',
      heroDesc:
        'A lightweight PWA community treasury platform for neighborhood associations, guilds, and families with M-of-N multi-approval quorum, SHA-256 tamper-evident cryptographic audit chains, and automated dues tracking.',
      ctaPrimary: 'Open App / Sign In',
      ctaSecondary: 'Explore Core Features',
      navFeatures: 'Features',
      navWhy: 'Why Kasbareng',
      navImpact: 'Data & Impact',
      navUseCases: 'Use Cases',
      stat1Val: '1,050,000+',
      stat1Lbl: 'Neighborhood Associations in ID',
      stat1Sub: 'Source: Ministry of Home Affairs',
      stat2Val: '> $220M / Yr',
      stat2Lbl: 'Estimated Informal Communal Cash',
      stat2Sub: 'Aggregate community dues volume',
      stat3Val: '92%',
      stat3Lbl: 'Still Rely on Manual Methods',
      stat3Sub: 'Physical logbooks & WhatsApp chats',
      stat4Val: '100% Tamper-Evident',
      stat4Lbl: 'Cryptographic Audit Trail',
      stat4Sub: 'RFC 8785 SHA-256 Linked Chain',
      whyTitle: 'Why Does Community Cash Often Spark Conflict?',
      whySubtitle: 'Not due to ill intent, but because fragile manual methods fail to protect volunteer treasurers.',
      pain1Title: 'Heavy Mental Burden on Treasurers',
      pain1Desc: 'Endless hours lost reconciling paper receipts. Any minor discrepancy leaves the treasurer vulnerable to unfair suspicion.',
      pain2Title: 'Unilateral Expense Decisions',
      pain2Desc: 'Treasury funds spent without co-signers, generating mistrust and whispered grievances among members.',
      pain3Title: 'Vulnerable Excel Spreadsheets',
      pain3Desc: 'Spreadsheets can be secretly edited anytime without an audit trail, while bank slips drown in chat histories.',
      pain4Title: 'Exhausting Bank Reconciliation',
      pain4Desc: 'Cashbook balances rarely match bank statement balances at month-end, delaying community financial reports.',
      featureHeadingBadge: 'Enterprise Governance Standards',
      featureHeadingTitle: 'Corporate Financial Rigor with E-Wallet Simplicity',
      f1Badge: 'Expenditure Governance',
      f1Title: 'M-of-N Multi-Approval Quorum',
      f1Desc: 'Expenses require dynamic co-approval by designated officers. Creators cannot approve their own expense proposals (Anti-Self Approval Guard).',
      f2Badge: 'Data Integrity',
      f2Title: 'SHA-256 Tamper-Evident Linked Chain',
      f2Desc: 'Every ledger action is sealed with RFC 8785 canonical JSON hashing. Any unauthorized database tampering instantly breaks the chain and triggers visual alarms.',
      f3Badge: 'Member Compliance',
      f3Title: 'Smart Dues Board & WhatsApp Reminders',
      f3Desc: 'Transparent matrix of member contributions. Supports self-reported bank transfers, multi-period batch payments, and gentle WhatsApp reminders.',
      f4Badge: 'Time Efficiency',
      f4Title: 'Automated 3-Pass Bank CSV Matcher',
      f4Desc: 'Upload official bank export files (BCA, Mandiri, BRI, BNI). The deterministic 3-Pass engine matches amounts, dates, and transfer remarks instantly.',
      mobileTitle: 'Lightning Fast, Mobile-First PWA',
      mobileDesc: 'No bulky app store downloads required. Opens instantly from any WhatsApp invite link on any phone. Record transactions or check balances in 2 taps.',
      useCaseTitle: 'Engineered for Every Type of Collective',
      useCaseSubtitle: 'One account can manage multiple community treasuries with isolated roles (Admin, Manager, or Member).',
      tabRt: 'Neighborhoods (RT / RW)',
      tabKomunitas: 'Clubs & Alumni Groups',
      tabKeluarga: 'Extended Families & Arisan',
      ctaBottomTitle: 'Ready to Experience Conflict-Free Group Finances?',
      ctaBottomSubtitle: 'Start managing your collective treasury today. Free to try with zero complex setup.',
      ctaBottomBtn: 'Launch Kasbareng Now',
      footerRights: 'KASBARENG — Modern Multi-Treasury & Financial Governance PWA.',
      langSwitch: 'Bahasa Indonesia',
    },
  };

  // Variabel penampung terjemahan aktif
  const curr = t[lang];

  // ---------------------------------------------------------------------------
  // RENDER UI UTAMA
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans transition-colors duration-200">
      {/* 1. Latar Belakang Ambient Glow & Pola Grid Halus */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[550px] h-[550px] bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      </div>

      {/* 2. Bilah Navigasi Atas Lengket (Sticky Top Navigation) */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Identitas Brand KasBareng */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/30">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
                  KASBARENG
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  PWA Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Modern Multi-Treasury & Governance
              </p>
            </div>
          </div>

          {/* Tautan Navigasi Tengah (Tampilan Desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#why" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              {curr.navWhy}
            </a>
            <a href="#features" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              {curr.navFeatures}
            </a>
            <a href="#impact" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              {curr.navImpact}
            </a>
            <a href="#usecases" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              {curr.navUseCases}
            </a>
          </nav>

          {/* Tombol Kontrol Kanan: Pengalih Bahasa, Toggle Tema, & Tombol CTA Masuk */}
          <div className="flex items-center gap-3">
            {/* Tombol Ganti Bahasa (ID / EN) */}
            <button
              onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Ganti Bahasa / Switch Language"
            >
              <Globe2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>{lang.toUpperCase()}</span>
            </button>

            {/* Tombol Toggle Tema (Terang / Gelap) */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer"
              title={isDark ? 'Beralih ke Mode Terang (Light Mode)' : 'Beralih ke Mode Gelap (Dark Mode)'}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-600 animate-in spin-in-180 duration-200" />
              )}
            </button>

            {/* Tombol CTA Masuk / Buka Aplikasi Langsung */}
            <button
              onClick={onGoToLogin}
              className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <span>{curr.ctaPrimary}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* 3. Hero Section Utama */}
      <section className="relative z-10 pt-12 pb-20 sm:pt-20 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Badge Sorotan Solusi */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm font-semibold mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <Sparkles className="w-4 h-4" />
          <span>{curr.badge}</span>
        </div>

        {/* Judul Hero Utama */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white max-w-5xl mx-auto leading-[1.1] mb-6">
          {curr.heroTitle1}{' '}
          <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400 bg-clip-text text-transparent">
            {curr.heroTitle2}
          </span>
        </h1>

        {/* Deskripsi Hero */}
        <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed mb-10">
          {curr.heroDesc}
        </p>

        {/* Tombol Aksi Hero (CTA Utama & Sekunder) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={onGoToLogin}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-base sm:text-lg shadow-xl shadow-emerald-500/30 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span>{curr.ctaPrimary}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <a
            href="#features"
            className="w-full sm:w-auto px-7 py-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-base transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span>{curr.ctaSecondary}</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </a>
        </div>

        {/* Frame Showcase Tangkapan Layar Desktop & Mobile */}
        <div className="relative mx-auto max-w-5xl rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-slate-200 via-slate-100 to-slate-200/80 dark:from-slate-700/60 dark:via-slate-800/40 dark:to-slate-900/80 border border-slate-300 dark:border-slate-700/80 shadow-2xl shadow-emerald-950/20 dark:shadow-emerald-950/60">
          <div className="overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-950">
            <img
              src={heroShowcaseImg}
              alt="Kasbareng Responsive Desktop & Mobile Showcase"
              className="w-full h-auto object-cover object-top hover:scale-[1.01] transition-transform duration-700"
            />
          </div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-white/95 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 backdrop-blur-md text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2 shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Tampilan Desktop Web & Mobile PWA Responsive</span>
          </div>
        </div>
      </section>

      {/* 4. Bagian Statistik: Skala Masalah & Potensi Nasional */}
      <section id="impact" className="relative z-10 py-20 bg-slate-100/70 dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 block">
              Skala Kebutuhan Nasional
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              Bukan Masalah Sepele: Jutaan Kas Warga Menanti Solusi
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Metrik 1: Jumlah RT di Seluruh Indonesia */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-all group shadow-sm">
              <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-105 transition-transform origin-left">
                {curr.stat1Val}
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-base mb-1">{curr.stat1Lbl}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{curr.stat1Sub}</div>
            </div>

            {/* Metrik 2: Estimasi Perputaran Kas Komunal Tahunan */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 transition-all group shadow-sm">
              <div className="text-3xl sm:text-4xl font-black text-cyan-600 dark:text-cyan-400 mb-2 group-hover:scale-105 transition-transform origin-left">
                {curr.stat2Val}
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-base mb-1">{curr.stat2Lbl}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{curr.stat2Sub}</div>
            </div>

            {/* Metrik 3: Persentase Kas yang Masih Manual */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 transition-all group shadow-sm">
              <div className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 mb-2 group-hover:scale-105 transition-transform origin-left">
                {curr.stat3Val}
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-base mb-1">{curr.stat3Lbl}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{curr.stat3Sub}</div>
            </div>

            {/* Metrik 4: Audit Trail Kriptografis KASBARENG */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/40 transition-all group shadow-sm">
              <div className="text-3xl sm:text-4xl font-black text-teal-600 dark:text-teal-400 mb-2 group-hover:scale-105 transition-transform origin-left">
                {curr.stat4Val}
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-base mb-1">{curr.stat4Lbl}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{curr.stat4Sub}</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Bagian "Mengapa Kas Komunitas Sering Memicu Salah Paham?" (4 Pain Points) */}
      <section id="why" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400 mb-2 block">
            Tantangan Kas Komunitas
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4">
            {curr.whyTitle}
          </h2>
          <p className="text-base text-slate-500 dark:text-slate-400">
            {curr.whySubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Masalah 1: Beban Berat Bendahara Sendirian */}
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-rose-500/40 transition-all flex gap-5 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Users2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{curr.pain1Title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{curr.pain1Desc}</p>
            </div>
          </div>

          {/* Masalah 2: Belanja Kas Keluar Sepihak */}
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 transition-all flex gap-5 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <BadgeAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{curr.pain2Title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{curr.pain2Desc}</p>
            </div>
          </div>

          {/* Masalah 3: Catatan Excel Mudah Dimanipulasi */}
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 transition-all flex gap-5 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{curr.pain3Title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{curr.pain3Desc}</p>
            </div>
          </div>

          {/* Masalah 4: Selisih Rekening Bank & Buku Kas */}
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-all flex gap-5 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{curr.pain4Title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{curr.pain4Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Bagian Fitur Inti Berstandar Finansial (Deep Dive) */}
      <section id="features" className="relative z-10 py-24 bg-slate-100/70 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 block">
              {curr.featureHeadingBadge}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4">
              {curr.featureHeadingTitle}
            </h2>
          </div>

          <div className="space-y-20">
            {/* Fitur 1: Kuorum Persetujuan Belanja Multi-Pengurus (M-of-N) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  {curr.f1Badge}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {curr.f1Title}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                  {curr.f1Desc}
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Anti-Self Approval Guard (pembuat draf dilarang setujui sendiri)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Reservasi Saldo Otomatis (mencegah kas defisit / double spending)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Konfirmasi multi-pengurus real-time via smartphone</span>
                  </div>
                </div>
              </div>

              {/* Simulasi Visual Kartu Kuorum Persetujuan */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Pengajuan Belanja Kas RT</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    Menunggu Kuorum (1/2)
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-base">Pembelian Lampu Pos Ronda</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Diajukan oleh: Ibu Ratna (Bendahara)</div>
                  </div>
                  <div className="text-right font-black text-rose-600 dark:text-rose-400 text-base">
                    Rp 450.000
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Progres Suara:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">50% Terpenuhi</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className="w-1/2 h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium">
                    ✓ Bpk. Hendra (Ketua RT) - Setuju
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium">
                    ⏳ Bpk. Tri (Sekretaris) - Menunggu
                  </div>
                </div>
              </div>
            </div>

            {/* Fitur 2: Buku Kas Kriptografis RFC 8785 SHA-256 Linked Chain */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 p-6 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                  <Lock className="w-4 h-4" />
                  <span>Rantai Audit Kriptografis RFC 8785 SHA-256</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1">
                  <div className="text-slate-500"># Blok Audit 04 (Disahkan)</div>
                  <div className="text-emerald-700 dark:text-emerald-400 truncate">Hash: e3b0c44298fc1c149afbf4c8996fb92427...</div>
                  <div className="text-slate-600 dark:text-slate-400 truncate">Prev: a5892c9b10bd82ae0ac6240d82998a4365...</div>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="text-xs text-slate-700 dark:text-slate-200">
                    <span className="font-bold block text-emerald-700 dark:text-emerald-300">Status Integritas: Valid 100%</span>
                    Tidak ada catatan yang dimodifikasi. Setiap rupiah terverifikasi secara matematis.
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2 space-y-6">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30">
                  {curr.f2Badge}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {curr.f2Title}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                  {curr.f2Desc}
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span>Prinsip mini-blockchain berbobot ringan tanpa gas-fee</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span>Deteksi otomatis jika ada manipulasi dari database langsung</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span>Laporan pertanggungjawaban warga terbukti otentik</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fitur 3: Papan Iuran Pintar & Pengingat WhatsApp */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30">
                  {curr.f3Badge}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {curr.f3Title}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                  {curr.f3Desc}
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>Matriks iuran bulanan visual (hijau = lunas, merah = belum)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>Bayar borongan multi-periode dalam satu ketukan</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>Broadcast pengingat sopan ke kontak WhatsApp warga</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-950">
                <img
                  src={duesImg}
                  alt="Papan Rekap Iuran Komunitas Kasbareng"
                  className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Bagian Showcase Mobile-First Progressive Web App (PWA) */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <Smartphone className="w-4 h-4" />
              <span>Mobile-First Progressive Web App</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white leading-tight">
              {curr.mobileTitle}
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
              {curr.mobileDesc}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400 mb-2" />
                <div className="font-bold text-slate-900 dark:text-white text-sm">Quick Action Sheet</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Aksi cepat setor kas & iuran dari tombol navigasi bawah.</div>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2" />
                <div className="font-bold text-slate-900 dark:text-white text-sm">Gated Community Access</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Masuk komunitas cukup dengan 1 Kode Akses unik warga.</div>
              </div>
            </div>
          </div>

          {/* Screenshot Tampilan Smartphone Berjejer */}
          <div className="lg:col-span-6 flex items-center justify-center gap-6">
            <div className="w-44 sm:w-56 rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 -rotate-2 hover:rotate-0 transition-transform duration-500">
              <img src={mobileDashImg} alt="Kasbareng Mobile Dashboard" className="w-full h-auto" />
            </div>
            <div className="w-44 sm:w-56 rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rotate-3 hover:rotate-0 transition-transform duration-500">
              <img src={mobileQuickImg} alt="Kasbareng Quick Action Sheet" className="w-full h-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* 8. Bagian Skenario Kasus Penggunaan (Use Cases Interaktif) */}
      <section id="usecases" className="relative z-10 py-24 bg-slate-100/70 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 block">
              Multi-Treasury Komunitas
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4">
              {curr.useCaseTitle}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
              {curr.useCaseSubtitle}
            </p>
          </div>

          {/* Tab Pemilih Komunitas */}
          <div className="flex justify-center gap-3 mb-10">
            <button
              onClick={() => setActiveTab('rt')}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'rt'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent'
              }`}
            >
              {curr.tabRt}
            </button>
            <button
              onClick={() => setActiveTab('komunitas')}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'komunitas'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent'
              }`}
            >
              {curr.tabKomunitas}
            </button>
            <button
              onClick={() => setActiveTab('keluarga')}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'keluarga'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent'
              }`}
            >
              {curr.tabKeluarga}
            </button>
          </div>

          {/* Konten Tab Kasus Penggunaan Terpilih */}
          <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            {activeTab === 'rt' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-800 dark:text-slate-200 text-sm">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">Iuran Keamanan & Sampah</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Papan kontrol warga lunas per bulan lengkap dengan pengingat WA santun.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-cyan-600 dark:text-cyan-400">Belanja Tenda & Alat Pos</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pengadaan barang wajib di-acc minimal 2 pengurus (Ketua + Sekretaris).</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-teal-600 dark:text-teal-400">Laporan Rapat Warga</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Cetak rekap kas resmi seketika tanpa lembur hitung kuitansi di Excel.</p>
                </div>
              </div>
            )}

            {activeTab === 'komunitas' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-800 dark:text-slate-200 text-sm">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">Panitia Acara & Baksos</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Kas khusus per kegiatan dengan kuorum bendahara & koordinator acara.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-cyan-600 dark:text-cyan-400">Kas Klub Sepeda / Motor</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Iuran touring dan pembelian merchandise tercatat terbuka untuk semua anggota.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-teal-600 dark:text-teal-400">Komunitas Alumni</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Transparansi dana donasi beasiswa dan sumbangan sosial alumni.</p>
                </div>
              </div>
            )}

            {activeTab === 'keluarga' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-800 dark:text-slate-200 text-sm">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">Kas Dana Darurat Keluarga</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Simpanan bersama untuk kebutuhan tak terduga tanpa rasa saling curiga.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-cyan-600 dark:text-cyan-400">Arisan Berkala</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pencatatan setoran arisan transparan, siapa yang giliran dapat tercatat rapi.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-teal-600 dark:text-teal-400">Dana Renovasi Rumah Waris</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Persetujuan belanja bahan material wajib disepakati seluruh saudara.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 9. Ajakan Bertindak Bawah (Bottom Call to Action) */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="p-12 sm:p-16 rounded-3xl bg-gradient-to-br from-emerald-100 via-white to-teal-50 dark:from-emerald-950/60 dark:via-slate-900 dark:to-slate-950 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4">
            {curr.ctaBottomTitle}
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            {curr.ctaBottomSubtitle}
          </p>
          <button
            onClick={onGoToLogin}
            className="px-9 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-lg shadow-xl shadow-emerald-500/30 transition-all duration-300 hover:scale-105 inline-flex items-center gap-3 cursor-pointer"
          >
            <span>{curr.ctaBottomBtn}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* 10. Footer Halaman Publik */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-slate-800 py-10 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
        <div className="flex items-center justify-center gap-2 font-bold text-slate-700 dark:text-slate-300 text-sm">
          <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>KASBARENG</span>
        </div>
        <p>{curr.footerRights}</p>
        <p className="text-slate-400 dark:text-slate-500">
          Built with React 18, Vite, TypeScript, Express, Prisma, & Vitest.
        </p>
      </footer>
    </div>
  );
};
