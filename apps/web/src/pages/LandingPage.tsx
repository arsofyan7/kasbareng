/**
 * ============================================================================
 * LandingPage.tsx — Halaman Publik Marketing KasBareng
 * ============================================================================
 * Landing page utama yang memperkenalkan solusi KasBareng kepada calon pengguna:
 *  - Hero Section dengan showcase aplikasi
 *  - Statistik & Data Nasional
 *  - Pain Points (4 masalah kas komunitas)
 *  - 4 Fitur Inti Berstandar Finansial
 *  - Showcase Mobile PWA
 *  - Use Cases Interaktif (Tab)
 *  - CTA Bottom & Footer
 *
 * Desain: Neo-Financial Editorial — bold typography, geometric accents,
 * glass morphism depth, asymmetric layouts. Responsive & bilingual (ID/EN).
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

// ---------------------------------------------------------------------------
// URL Aset Gambar (dari folder /public)
// ---------------------------------------------------------------------------
const heroShowcaseImg = '/kasbareng-hero-showcase.png';
const duesImg = '/desktop-dues.png';
const mobileQuickImg = '/mobile-quick-action.png';
const mobileDashImg = '/mobile-dashboard.png';

/** Props komponen LandingPage */
interface LandingPageProps {
  onGoToLogin: () => void; // Callback ke halaman login/register
}

/** Tipe bahasa yang didukung */
type Lang = 'id' | 'en';

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin }) => {
  // ---------------------------------------------------------------------------
  // STATE & CONTEXT
  // ---------------------------------------------------------------------------
  const { isDark, toggleTheme } = useTheme();
  const [lang, setLang] = useState<Lang>('id');
  const [activeTab, setActiveTab] = useState<'rt' | 'komunitas' | 'keluarga'>('rt');

  // ---------------------------------------------------------------------------
  // KAMUS KONTEN BILINGUAL (ID / EN)
  // ---------------------------------------------------------------------------
  const t = {
    id: {
      badge: 'Solusi Pembukuan Kas Komunitas & Paguyuban Modern',
      heroTitle1: 'Kelola Kas Bersama',
      heroTitle2: 'Tanpa Curiga,',
      heroTitle3: 'Bebas Drama.',
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
      stat4Val: '100%',
      stat4Lbl: 'Anti-Edit Kriptografis',
      stat4Sub: 'SHA-256 Linked Chain',
      whyTitle: 'Mengapa Kas Komunitas Sering Memicu Salah Paham?',
      whySubtitle:
        'Bukan karena niat buruk — melainkan sistem lama yang tidak menyediakan perlindungan.',
      pain1Title: 'Beban Berat Bendahara Sendirian',
      pain1Desc:
        'Waktu tersita habis mencatat kuitansi manual. Saat ada selisih hitung sedikit saja, bendahara paling rentan dicurigai.',
      pain2Title: 'Belanja Kas Keluar Sepihak',
      pain2Desc:
        'Uang kas terpakai tanpa persetujuan pengurus lain, memicu rasa tidak enak dan prasangka antar warga.',
      pain3Title: 'Catatan Excel Mudah Diutak-Atik',
      pain3Desc:
        'File spreadsheet di laptop bisa diedit kapan saja tanpa jejak audit, sedangkan slip transfer tercecer di chat.',
      pain4Title: 'Rekonsiliasi Bank yang Menghabiskan Waktu',
      pain4Desc:
        'Saldo di buku kas fisik hampir tidak pernah cocok dengan saldo rekening bank resmi di akhir bulan.',
      featureHeadingBadge: 'Fitur Inti Berstandar Finansial',
      featureHeadingTitle: 'Keamanan Setara Perusahaan, Tampilan Seringkas E-Wallet',
      f1Badge: 'Tata Kelola Pengeluaran',
      f1Title: 'Izin Belanja Bersama (Kuorum M-of-N)',
      f1Desc:
        'Pengeluaran kas wajib disetujui minimal 2 pengurus (contoh: Ketua RT + Sekretaris). Si pembuat draf dilarang menyetujui anggarannya sendiri (Anti-Self Approval Guard).',
      f2Badge: 'Integritas Data',
      f2Title: 'Buku Kas Bersegel SHA-256 Anti-Tamper',
      f2Desc:
        'Setiap transaksi diikat dalam rantai hash kriptografis berstandar RFC 8785. Jika ada yang iseng mengubah data di database, sistem seketika membunyikan alarm manipulasi.',
      f3Badge: 'Kepatuhan Warga',
      f3Title: 'Papan Iuran Pintar & Pengingat WhatsApp',
      f3Desc:
        'Matriks iuran visual transparan untuk seluruh anggota. Warga bisa lapor transfer mandiri, bayar borongan 6–12 bulan, dan pengurus bisa kirim notifikasi santun.',
      f4Badge: 'Efisiensi Waktu',
      f4Title: 'Pencocokan Rekening Koran Bank Otomatis',
      f4Desc:
        'Tinggal upload mutasi CSV resmi (BCA, Mandiri, BRI, BNI). Algoritma 3-Pass mencocokkan nominal, tanggal, dan berita transfer dalam sekejap.',
      mobileTitle: 'Ringan, Ramah Warga, Tanpa Unduh Play Store',
      mobileDesc:
        'Teknologi Progressive Web App (PWA) memungkinkan aplikasi dibuka langsung dari link WhatsApp warga di smartphone apa saja. Cukup 2 ketukan untuk catat kas atau cek saldo.',
      useCaseTitle: 'Dirancang Tepat Sasaran untuk Berbagai Komunitas',
      useCaseSubtitle:
        'Satu akun dapat mengelola banyak kas sekaligus dengan peran berbeda (Admin, Pengelola, atau Warga).',
      tabRt: 'RT & RW Perumahan',
      tabKomunitas: 'Paguyuban & Hobi',
      tabKeluarga: 'Kas Keluarga & Arisan',
      ctaBottomTitle: 'Siap Wujudkan Kas Komunitas yang Transparan & Damai?',
      ctaBottomSubtitle:
        'Mulai kelola kas paguyuban Anda sekarang. Gratis dicoba tanpa instalasi rumit.',
      ctaBottomBtn: 'Masuk ke Kasbareng Sekarang',
      footerRights: 'KASBARENG — Platform Tata Kelola Kas Bersama & Keuangan Komunitas Modern.',
      langSwitch: 'English',
    },
    en: {
      badge: 'Modern Financial Governance for Communities & Guilds',
      heroTitle1: 'Manage Group Treasury',
      heroTitle2: 'Zero Suspicion,',
      heroTitle3: 'Zero Drama.',
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
      stat4Val: '100%',
      stat4Lbl: 'Tamper-Evident Audit',
      stat4Sub: 'RFC 8785 SHA-256 Linked Chain',
      whyTitle: 'Why Does Community Cash Often Spark Conflict?',
      whySubtitle:
        'Not due to ill intent, but because fragile manual methods fail to protect volunteer treasurers.',
      pain1Title: 'Heavy Mental Burden on Treasurers',
      pain1Desc:
        'Endless hours lost reconciling paper receipts. Any minor discrepancy leaves the treasurer vulnerable to unfair suspicion.',
      pain2Title: 'Unilateral Expense Decisions',
      pain2Desc:
        'Treasury funds spent without co-signers, generating mistrust and whispered grievances among members.',
      pain3Title: 'Vulnerable Excel Spreadsheets',
      pain3Desc:
        'Spreadsheets can be secretly edited anytime without an audit trail, while bank slips drown in chat histories.',
      pain4Title: 'Exhausting Bank Reconciliation',
      pain4Desc:
        'Cashbook balances rarely match bank statement balances at month-end, delaying community financial reports.',
      featureHeadingBadge: 'Enterprise Governance Standards',
      featureHeadingTitle: 'Corporate Financial Rigor with E-Wallet Simplicity',
      f1Badge: 'Expenditure Governance',
      f1Title: 'M-of-N Multi-Approval Quorum',
      f1Desc:
        'Expenses require dynamic co-approval by designated officers. Creators cannot approve their own expense proposals (Anti-Self Approval Guard).',
      f2Badge: 'Data Integrity',
      f2Title: 'SHA-256 Tamper-Evident Linked Chain',
      f2Desc:
        'Every ledger action is sealed with RFC 8785 canonical JSON hashing. Any unauthorized database tampering instantly breaks the chain and triggers visual alarms.',
      f3Badge: 'Member Compliance',
      f3Title: 'Smart Dues Board & WhatsApp Reminders',
      f3Desc:
        'Transparent matrix of member contributions. Supports self-reported bank transfers, multi-period batch payments, and gentle WhatsApp reminders.',
      f4Badge: 'Time Efficiency',
      f4Title: 'Automated 3-Pass Bank CSV Matcher',
      f4Desc:
        'Upload official bank export files (BCA, Mandiri, BRI, BNI). The deterministic 3-Pass engine matches amounts, dates, and transfer remarks instantly.',
      mobileTitle: 'Lightning Fast, Mobile-First PWA',
      mobileDesc:
        'No bulky app store downloads required. Opens instantly from any WhatsApp invite link on any phone. Record transactions or check balances in 2 taps.',
      useCaseTitle: 'Engineered for Every Type of Collective',
      useCaseSubtitle:
        'One account can manage multiple community treasuries with isolated roles (Admin, Manager, or Member).',
      tabRt: 'Neighborhoods (RT / RW)',
      tabKomunitas: 'Clubs & Alumni Groups',
      tabKeluarga: 'Extended Families & Arisan',
      ctaBottomTitle: 'Ready to Experience Conflict-Free Group Finances?',
      ctaBottomSubtitle:
        'Start managing your collective treasury today. Free to try with zero complex setup.',
      ctaBottomBtn: 'Launch Kasbareng Now',
      footerRights: 'KASBARENG — Modern Multi-Treasury & Financial Governance PWA.',
      langSwitch: 'Bahasa Indonesia',
    },
  };

  /** Terjemahan aktif berdasarkan bahasa yang dipilih */
  const curr = t[lang];

  // ---------------------------------------------------------------------------
  // RENDER UTAMA
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-white dark:bg-[#080f0b] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">

      {/* ── LATAR BELAKANG DEKORATIF GLOBAL ── */}
      {/* Elemen ambient glow dan dot-grid yang fixed di balik semua konten */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Blob gradien kiri atas — warna emerald */}
        <div className="absolute -top-60 -left-60 w-[700px] h-[700px] bg-emerald-500/8 dark:bg-emerald-500/12 rounded-full blur-[160px]" />
        {/* Blob gradien kanan tengah — warna teal */}
        <div className="absolute top-1/2 -right-60 w-[600px] h-[600px] bg-teal-500/8 dark:bg-teal-400/10 rounded-full blur-[160px]" />
        {/* Blob gradien bawah kiri — warna cyan */}
        <div className="absolute -bottom-60 left-1/4 w-[500px] h-[500px] bg-cyan-500/6 dark:bg-cyan-500/8 rounded-full blur-[160px]" />
        {/* Pola dot-grid halus di seluruh halaman */}
        <div
          className="absolute inset-0 opacity-[0.07] dark:opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════
          NAVIGASI FIXED TOP (TETAP MENEMPEL KETIKA DISCROLL)
      ════════════════════════════════════════════════════════════════ */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-slate-200/60 dark:border-white/5 backdrop-blur-2xl bg-white/85 dark:bg-[#080f0b]/90 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between gap-4">

          {/* Logo brand — klik untuk scroll ke atas */}
          <button
            type="button"
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            {/* Icon wallet dengan gradient emerald */}
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-shadow">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            {/* Nama brand & sub-label */}
            <div className="flex flex-col leading-none text-left">
              <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">
                KASBARENG
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hidden sm:block">
                Community Treasury
              </span>
            </div>
          </button>

          {/* Tautan navigasi tengah (desktop only) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500 dark:text-slate-400">
            <a href="#why" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">{curr.navWhy}</a>
            <a href="#features" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">{curr.navFeatures}</a>
            <a href="#impact" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">{curr.navImpact}</a>
            <a href="#usecases" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">{curr.navUseCases}</a>
          </nav>

          {/* Tombol kontrol kanan: bahasa + tema + CTA */}
          <div className="flex items-center gap-2">
            {/* Toggle bahasa ID/EN */}
            <button
              onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
              title="Ganti Bahasa / Switch Language"
            >
              <Globe2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{lang.toUpperCase()}</span>
            </button>

            {/* Toggle tema gelap/terang */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center transition-all cursor-pointer"
              title={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            >
              {isDark
                ? <Sun className="w-4 h-4 text-amber-400" />
                : <Moon className="w-4 h-4 text-slate-600" />
              }
            </button>

            {/* Tombol utama CTA masuk aplikasi */}
            <button
              onClick={onGoToLogin}
              className="group hidden sm:flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:shadow-emerald-500/40 cursor-pointer"
            >
              <span>{curr.ctaPrimary}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════
          SEGMEN PALING ATAS (HERO) — FIT 1 LAYAR PENUH (VIEWPORT)
      ════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 min-h-screen lg:h-screen pt-[68px] flex items-center justify-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-8 lg:py-0">

          {/* Kolom Kiri: Teks Hero, Headline, & CTA */}
          <div className="lg:col-span-7 space-y-5 lg:space-y-6">
            {/* Badge solusi */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm font-semibold">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{curr.badge}</span>
            </div>

            {/* Headline utama */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] xl:text-[3.75rem] font-black tracking-tight leading-[1.08] text-slate-900 dark:text-white">
              <span className="block">{curr.heroTitle1}</span>
              <span className="block bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-300 bg-clip-text text-transparent">
                {curr.heroTitle2} {curr.heroTitle3}
              </span>
            </h1>

            {/* Deskripsi ringkas */}
            <p className="text-sm sm:text-base lg:text-lg text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              {curr.heroDesc}
            </p>

            {/* Tombol CTA primer dan sekunder */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1">
              <button
                onClick={onGoToLogin}
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-500/30 transition-all duration-300 hover:shadow-emerald-500/50 hover:-translate-y-0.5 cursor-pointer"
              >
                <span>{curr.ctaPrimary}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#why"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-semibold text-sm sm:text-base transition-all"
              >
                <span>{curr.ctaSecondary}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </a>
            </div>

            {/* Poin jaminan kunci / micro highlights */}
            <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-semibold text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>RFC 8785 SHA-256</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Kuorum Belanja M-of-N</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Progressive Web App</span>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Showcase Gambar Hero dengan Browser Frame */}
          <div className="lg:col-span-5 relative">
            {/* Ambient glow lembut di belakang gambar */}
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-cyan-500/15 rounded-3xl blur-2xl pointer-events-none" />

            {/* Frame browser mockup responsif */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-[0_25px_60px_-15px_rgba(16,185,129,0.2)] dark:shadow-[0_25px_60px_-15px_rgba(16,185,129,0.3)] bg-slate-900">
              {/* Browser chrome header bar */}
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100/90 dark:bg-[#111a14]/90 border-b border-slate-200/80 dark:border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex-1 mx-3 h-5 rounded bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center px-2.5">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">kasbareng.app</span>
                </div>
              </div>
              {/* Gambar showcase responsif */}
              <img
                src={heroShowcaseImg}
                alt="Kasbareng Responsive Desktop & Mobile Showcase"
                className="w-full h-auto max-h-[42vh] sm:max-h-[48vh] object-contain object-top"
              />
            </div>

            {/* Label caption kecil di bawah gambar */}
            <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Tampilan Desktop Web & Mobile PWA Responsive</span>
            </div>
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SEGMEN #WHY (PAIN POINTS) — FIT 1 LAYAR PENUH (VIEWPORT)
      ════════════════════════════════════════════════════════════════ */}
      <section id="why" className="relative z-10 min-h-screen lg:h-screen flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-12 lg:py-0 max-w-7xl mx-auto scroll-mt-[68px]">
        {/* Background band lembut */}
        <div className="absolute inset-0 bg-slate-950/[0.02] dark:bg-white/[0.015] pointer-events-none rounded-3xl" />

        <div className="relative w-full">
          {/* Header section #why */}
          <div className="max-w-3xl mb-6 lg:mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-rose-500 dark:text-rose-400 block mb-2">
              Tantangan Kas Komunitas
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
              {curr.whyTitle}
            </h2>
            <p className="text-xs sm:text-sm lg:text-base text-slate-500 dark:text-slate-400">
              {curr.whySubtitle}
            </p>
          </div>

          {/* Grid 2x2 pain point cards — pas dalam viewport */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
            {/* Pain 1 */}
            <div className="group relative p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/[0.02] hover:border-rose-400/40 dark:hover:border-rose-500/30 transition-all overflow-hidden shadow-sm">
              <div className="absolute -right-2 -bottom-4 text-7xl lg:text-8xl font-black text-rose-500/5 dark:text-rose-500/5 leading-none select-none pointer-events-none">01</div>
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3">
                  <Users2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-1.5">{curr.pain1Title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{curr.pain1Desc}</p>
              </div>
            </div>

            {/* Pain 2 */}
            <div className="group relative p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/[0.02] hover:border-amber-400/40 dark:hover:border-amber-500/30 transition-all overflow-hidden shadow-sm">
              <div className="absolute -right-2 -bottom-4 text-7xl lg:text-8xl font-black text-amber-500/5 dark:text-amber-500/5 leading-none select-none pointer-events-none">02</div>
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                  <BadgeAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-1.5">{curr.pain2Title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{curr.pain2Desc}</p>
              </div>
            </div>

            {/* Pain 3 */}
            <div className="group relative p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/[0.02] hover:border-cyan-400/40 dark:hover:border-cyan-500/30 transition-all overflow-hidden shadow-sm">
              <div className="absolute -right-2 -bottom-4 text-7xl lg:text-8xl font-black text-cyan-500/5 dark:text-cyan-500/5 leading-none select-none pointer-events-none">03</div>
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-1.5">{curr.pain3Title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{curr.pain3Desc}</p>
              </div>
            </div>

            {/* Pain 4 */}
            <div className="group relative p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/[0.02] hover:border-emerald-400/40 dark:hover:border-emerald-500/30 transition-all overflow-hidden shadow-sm">
              <div className="absolute -right-2 -bottom-4 text-7xl lg:text-8xl font-black text-emerald-500/5 dark:text-emerald-500/5 leading-none select-none pointer-events-none">04</div>
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-1.5">{curr.pain4Title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{curr.pain4Desc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          TRUST BAR — Badge teknologi & kepercayaan
      ════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 pt-16 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Garis pemisah tipis */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent" />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2">Dibangun dengan standar tertinggi</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent" />
          </div>
          {/* Deretan badge teknologi / jaminan */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: 'SHA-256 Cryptographic' },
              { icon: <Lock className="w-3.5 h-3.5" />, label: 'RFC 8785 Canonical JSON' },
              { icon: <Zap className="w-3.5 h-3.5" />, label: 'Vitest 103/103 Passed' },
              { icon: <Smartphone className="w-3.5 h-3.5" />, label: 'PWA Ready' },
              { icon: <BarChart3 className="w-3.5 h-3.5" />, label: '3-Pass Bank Matcher' },
              { icon: <Users2 className="w-3.5 h-3.5" />, label: 'M-of-N Quorum Guard' },
            ].map((b) => (
              <div
                key={b.label}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-white/3 text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                <span className="text-emerald-600 dark:text-emerald-400">{b.icon}</span>
                {b.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          STATISTIK / IMPACT — Angka-angka besar
      ════════════════════════════════════════════════════════════════ */}
      <section id="impact" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 scroll-mt-[72px]">
        <div className="max-w-7xl mx-auto">
          {/* Header section */}
          <div className="mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block mb-3">
              Skala Kebutuhan Nasional
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white max-w-2xl leading-tight">
              Bukan Masalah Sepele — Jutaan Kas Warga Menanti Solusi
            </h2>
          </div>

          {/* Grid 4 kartu statistik — angka besar proporsional dengan aksen warna berbeda */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {/* Stat 1: Jumlah RT */}
            <div className="group relative p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/8 hover:border-emerald-500/40 dark:hover:border-emerald-500/30 transition-all overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-2xl" />
              <div className="text-3xl sm:text-4xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 mb-2 sm:mb-3 leading-tight">
                {curr.stat1Val}
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base mb-1">{curr.stat1Lbl}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">{curr.stat1Sub}</div>
            </div>

            {/* Stat 2: Estimasi kas komunal */}
            <div className="group relative p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/8 hover:border-cyan-500/40 dark:hover:border-cyan-500/30 transition-all overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 rounded-l-2xl" />
              <div className="text-3xl sm:text-4xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-black tracking-tight text-cyan-600 dark:text-cyan-400 mb-2 sm:mb-3 leading-tight">
                {curr.stat2Val}
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base mb-1">{curr.stat2Lbl}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">{curr.stat2Sub}</div>
            </div>

            {/* Stat 3: Masih manual */}
            <div className="group relative p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/8 hover:border-amber-500/40 dark:hover:border-amber-500/30 transition-all overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl" />
              <div className="text-3xl sm:text-4xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-black tracking-tight text-amber-600 dark:text-amber-400 mb-2 sm:mb-3 leading-tight">
                {curr.stat3Val}
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base mb-1">{curr.stat3Lbl}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">{curr.stat3Sub}</div>
            </div>

            {/* Stat 4: Anti-edit kriptografis */}
            <div className="group relative p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/8 hover:border-teal-500/40 dark:hover:border-teal-500/30 transition-all overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-teal-500 rounded-l-2xl" />
              <div className="text-3xl sm:text-4xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-black tracking-tight text-teal-600 dark:text-teal-400 mb-2 sm:mb-3 leading-tight">
                {curr.stat4Val}
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base mb-1">{curr.stat4Lbl}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">{curr.stat4Sub}</div>
            </div>
          </div>
        </div>
      </section>



      {/* ════════════════════════════════════════════════════════════════
          FITUR INTI — 4 Solusi Berstandar Finansial
      ════════════════════════════════════════════════════════════════ */}
      <section id="features" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 scroll-mt-[72px]">
        <div className="max-w-7xl mx-auto">
          {/* Header section */}
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block mb-3">
              {curr.featureHeadingBadge}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white leading-tight">
              {curr.featureHeadingTitle}
            </h2>
          </div>

          {/* ── Fitur 1: Kuorum M-of-N ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
            {/* Teks penjelasan */}
            <div className="space-y-5">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                {curr.f1Badge}
              </span>
              <h3 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                {curr.f1Title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                {curr.f1Desc}
              </p>
              <ul className="space-y-3 pt-2">
                {[
                  'Anti-Self Approval Guard — pembuat draf dilarang setujui sendiri',
                  'Reservasi Saldo Otomatis mencegah kas defisit & double spending',
                  'Konfirmasi multi-pengurus real-time via smartphone',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mock UI Card Kuorum */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-[#0d1a11] shadow-2xl shadow-emerald-950/5 dark:shadow-emerald-950/40 overflow-hidden">
              {/* Header card */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.02]">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Pengajuan Belanja Kas RT</span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  Menunggu Kuorum (1/2)
                </span>
              </div>
              <div className="p-5 space-y-4">
                {/* Item belanja */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">Pembelian Lampu Pos Ronda</div>
                    <div className="text-xs text-slate-400 mt-0.5">Diajukan: Ibu Ratna (Bendahara)</div>
                  </div>
                  <div className="font-black text-rose-600 dark:text-rose-400 text-base">Rp 450.000</div>
                </div>
                {/* Progress bar kuorum */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Progres Suara</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">50% Terpenuhi</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-1/2 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
                  </div>
                </div>
                {/* Status tiap pengurus */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    ✓ Bpk. Hendra (Ketua RT) — Setuju
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/8 text-xs font-semibold text-slate-400">
                    ⏳ Bpk. Tri (Sekretaris) — Menunggu
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Fitur 2: SHA-256 Hash Chain ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
            {/* Mock UI Card Kriptografi — ditaruh kiri di desktop */}
            <div className="order-2 lg:order-1 rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-[#0d1a11] shadow-2xl shadow-cyan-950/5 dark:shadow-cyan-950/40 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.02]">
                <Lock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Rantai Audit Kriptografis RFC 8785 SHA-256</span>
              </div>
              <div className="p-5 space-y-4">
                {/* Block audit */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0a1510] border border-slate-100 dark:border-white/5 font-mono text-xs space-y-1.5">
                  <div className="text-slate-400"># Blok Audit 04 (Disahkan)</div>
                  <div className="text-emerald-600 dark:text-emerald-400 truncate">Hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4…</div>
                  <div className="text-slate-500 truncate">Prev: a5892c9b10bd82ae0ac6240d82998a4365cb91f2…</div>
                  <div className="text-cyan-600 dark:text-cyan-400">Tx: Pemasukan Iuran Rp 50.000 — 2025-07-01</div>
                </div>
                {/* Status integritas */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-emerald-700 dark:text-emerald-300 mb-1">Status Integritas: Valid 100%</div>
                    <div className="text-slate-500 dark:text-slate-400">Tidak ada catatan yang dimodifikasi. Setiap rupiah terverifikasi secara matematis.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Teks penjelasan — ditaruh kanan di desktop */}
            <div className="order-1 lg:order-2 space-y-5">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/25">
                {curr.f2Badge}
              </span>
              <h3 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                {curr.f2Title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                {curr.f2Desc}
              </p>
              <ul className="space-y-3 pt-2">
                {[
                  'Prinsip mini-blockchain ringan tanpa gas-fee',
                  'Deteksi otomatis jika ada manipulasi dari database langsung',
                  'Laporan pertanggungjawaban warga terbukti otentik',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4.5 h-4.5 text-cyan-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Fitur 3: Papan Iuran + Screenshot ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
            {/* Teks */}
            <div className="space-y-5">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/25">
                {curr.f3Badge}
              </span>
              <h3 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                {curr.f3Title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                {curr.f3Desc}
              </p>
              <ul className="space-y-3 pt-2">
                {[
                  'Matriks iuran bulanan visual (hijau = lunas, merah = belum)',
                  'Bayar borongan multi-periode dalam satu ketukan',
                  'Broadcast pengingat sopan ke kontak WhatsApp warga',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4.5 h-4.5 text-teal-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Screenshot papan iuran */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/8 shadow-2xl shadow-teal-950/5 dark:shadow-teal-950/40">
              <img
                src={duesImg}
                alt="Papan Rekap Iuran Komunitas Kasbareng"
                className="w-full h-auto object-cover hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          </div>

          {/* ── Fitur 4: Rekonsiliasi Bank CSV ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Mock UI Card Rekonsiliasi CSV */}
            <div className="order-2 lg:order-1 rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-[#0d1a11] shadow-2xl shadow-teal-950/5 dark:shadow-teal-950/40 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.02]">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Rekonsiliasi CSV Bank — Algoritma 3-Pass</span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  3 Matched ✓
                </span>
              </div>
              <div className="p-5 space-y-3">
                {/* Baris transaksi yang berhasil dicocokkan */}
                {[
                  { bank: 'BCA', nama: 'Ibu Sari — Iuran Juli', nominal: 'Rp 50.000', status: 'match', color: 'emerald' },
                  { bank: 'Mandiri', nama: 'Bpk. Joko — Iuran Agustus', nominal: 'Rp 50.000', status: 'match', color: 'emerald' },
                  { bank: 'BRI', nama: 'Ibu Dewi — Iuran Sept', nominal: 'Rp 50.000', status: 'pending', color: 'amber' },
                ].map((row) => (
                  <div key={row.nama} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                        {row.bank}
                      </span>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{row.nama}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-800 dark:text-white">{row.nominal}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${row.status === 'match' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                        {row.status === 'match' ? '✓ Match' : '⏳ Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Teks penjelasan */}
            <div className="order-1 lg:order-2 space-y-5">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                {curr.f4Badge}
              </span>
              <h3 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                {curr.f4Title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                {curr.f4Desc}
              </p>
              <ul className="space-y-3 pt-2">
                {[
                  'Support BCA, Mandiri, BRI, BNI format CSV resmi',
                  'Cocokkan nominal + tanggal + berita transfer sekaligus',
                  'Laporan rekonsiliasi siap download dalam sekejap',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          MOBILE PWA SHOWCASE
      ════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        {/* Background emerald gelap subtle */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] to-teal-500/[0.04] dark:from-emerald-500/[0.06] dark:to-teal-500/[0.06] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Teks konten mobile section */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile-First Progressive Web App</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white leading-tight">
              {curr.mobileTitle}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg leading-relaxed">
              {curr.mobileDesc}
            </p>
            {/* Feature pill list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-5 rounded-xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/[0.02]">
                <Zap className="w-5 h-5 text-amber-500 mb-3" />
                <div className="font-bold text-slate-900 dark:text-white text-sm mb-1">Quick Action Sheet</div>
                <div className="text-xs text-slate-400 leading-relaxed">Aksi cepat setor kas & iuran dari tombol navigasi bawah.</div>
              </div>
              <div className="p-5 rounded-xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/[0.02]">
                <ShieldCheck className="w-5 h-5 text-emerald-500 mb-3" />
                <div className="font-bold text-slate-900 dark:text-white text-sm mb-1">Gated Community Access</div>
                <div className="text-xs text-slate-400 leading-relaxed">Masuk komunitas cukup dengan 1 Kode Akses unik warga.</div>
              </div>
            </div>
          </div>

          {/* Screenshot dua ponsel berdampingan — rotasi berlawanan */}
          <div className="flex justify-center items-end gap-4 sm:gap-8">
            {/* Ponsel kiri — sedikit miring kiri */}
            <div className="relative -rotate-3 hover:rotate-0 transition-transform duration-500">
              <div className="w-[160px] sm:w-[196px] rounded-[2rem] overflow-hidden border-4 border-slate-200 dark:border-white/10 shadow-2xl shadow-emerald-950/10 dark:shadow-emerald-950/50 bg-white dark:bg-slate-950">
                <img src={mobileDashImg} alt="Kasbareng Mobile Dashboard" className="w-full h-auto" />
              </div>
              {/* Glow di bawah ponsel kiri */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-emerald-500/15 blur-xl rounded-full" />
            </div>
            {/* Ponsel kanan — sedikit miring kanan */}
            <div className="relative rotate-3 hover:rotate-0 transition-transform duration-500 translate-y-8">
              <div className="w-[160px] sm:w-[196px] rounded-[2rem] overflow-hidden border-4 border-slate-200 dark:border-white/10 shadow-2xl shadow-emerald-950/10 dark:shadow-emerald-950/50 bg-white dark:bg-slate-950">
                <img src={mobileQuickImg} alt="Kasbareng Quick Action Sheet" className="w-full h-auto" />
              </div>
              {/* Glow di bawah ponsel kanan */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-teal-500/15 blur-xl rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          USE CASES — Tab interaktif komunitas
      ════════════════════════════════════════════════════════════════ */}
      <section id="usecases" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 scroll-mt-[72px]">
        <div className="max-w-7xl mx-auto">
          {/* Header section */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block mb-3">
              Multi-Treasury Komunitas
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4 leading-tight">
              {curr.useCaseTitle}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
              {curr.useCaseSubtitle}
            </p>
          </div>

          {/* Tab selector — pill style */}
          <div className="flex justify-center gap-2 sm:gap-3 mb-10 flex-wrap">
            {(['rt', 'komunitas', 'keluarga'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-emerald-500 text-white dark:text-slate-950 shadow-lg shadow-emerald-500/25'
                    : 'border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-emerald-500/30'
                }`}
              >
                {tab === 'rt' ? curr.tabRt : tab === 'komunitas' ? curr.tabKomunitas : curr.tabKeluarga}
              </button>
            ))}
          </div>

          {/* Konten tab — card grid 3 kolom */}
          <div className="max-w-4xl mx-auto">
            {/* Tab RT/RW */}
            {activeTab === 'rt' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { color: 'emerald', title: 'Iuran Keamanan & Sampah', desc: 'Papan kontrol warga lunas per bulan lengkap dengan pengingat WA santun.' },
                  { color: 'cyan', title: 'Belanja Tenda & Alat Pos', desc: 'Pengadaan barang wajib di-acc minimal 2 pengurus (Ketua + Sekretaris).' },
                  { color: 'teal', title: 'Laporan Rapat Warga', desc: 'Cetak rekap kas resmi seketika tanpa lembur hitung kuitansi di Excel.' },
                ].map((item) => (
                  <div key={item.title} className="p-6 rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/[0.02] space-y-3">
                    <div className={`font-black text-base text-${item.color}-600 dark:text-${item.color}-400`}>{item.title}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tab Komunitas/Hobi */}
            {activeTab === 'komunitas' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { color: 'emerald', title: 'Panitia Acara & Baksos', desc: 'Kas khusus per kegiatan dengan kuorum bendahara & koordinator acara.' },
                  { color: 'cyan', title: 'Kas Klub Sepeda / Motor', desc: 'Iuran touring dan pembelian merchandise tercatat terbuka untuk semua anggota.' },
                  { color: 'teal', title: 'Komunitas Alumni', desc: 'Transparansi dana donasi beasiswa dan sumbangan sosial alumni.' },
                ].map((item) => (
                  <div key={item.title} className="p-6 rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/[0.02] space-y-3">
                    <div className={`font-black text-base text-${item.color}-600 dark:text-${item.color}-400`}>{item.title}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tab Keluarga/Arisan */}
            {activeTab === 'keluarga' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { color: 'emerald', title: 'Kas Dana Darurat Keluarga', desc: 'Simpanan bersama untuk kebutuhan tak terduga tanpa rasa saling curiga.' },
                  { color: 'cyan', title: 'Arisan Berkala', desc: 'Pencatatan setoran arisan transparan, siapa yang giliran dapat tercatat rapi.' },
                  { color: 'teal', title: 'Dana Renovasi Rumah Waris', desc: 'Persetujuan belanja bahan material wajib disepakati seluruh saudara.' },
                ].map((item) => (
                  <div key={item.title} className="p-6 rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/[0.02] space-y-3">
                    <div className={`font-black text-base text-${item.color}-600 dark:text-${item.color}-400`}>{item.title}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          CTA BOTTOM — Full-bleed gradient dramatis
      ════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Card CTA dengan background gradien emerald bold */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-700 dark:via-teal-700 dark:to-emerald-800 p-12 sm:p-20 text-center">
            {/* Dekorasi lingkaran besar transparan di sudut */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full border border-white/15 pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full border border-white/10 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/5 blur-3xl pointer-events-none" />

            {/* Konten CTA */}
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 text-white text-xs font-bold mb-8">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gratis dicoba — tanpa kartu kredit</span>
              </div>
              <h2 className="text-3xl sm:text-6xl font-black text-white mb-5 leading-tight max-w-3xl mx-auto">
                {curr.ctaBottomTitle}
              </h2>
              <p className="text-emerald-100 text-base sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
                {curr.ctaBottomSubtitle}
              </p>
              <button
                onClick={onGoToLogin}
                className="group inline-flex items-center gap-3 px-10 py-4 sm:py-5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-700 font-black text-base sm:text-lg shadow-2xl shadow-emerald-950/30 transition-all duration-300 hover:scale-[1.03] hover:shadow-emerald-950/40 cursor-pointer"
              >
                <span>{curr.ctaBottomBtn}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-white/5 mt-16 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo footer */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-slate-700 dark:text-slate-300 tracking-tight">KASBARENG</span>
          </div>

          {/* Teks copyright & stack teknis */}
          <div className="text-center sm:text-right space-y-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">{curr.footerRights}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Built with React 18, Vite, TypeScript, Express, Prisma & Vitest.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
};
