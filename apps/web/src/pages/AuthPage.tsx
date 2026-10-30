/**
 * ============================================================================
 * AuthPage.tsx - Halaman Otentikasi Pengguna (Login & Registrasi Akun)
 * ============================================================================
 * Komponen antarmuka gerbang masuk ke ekosistem KasBareng:
 * 1. Mendukung dua mode interaksi: Masuk Akun (Login) dan Pendaftaran Anggota Baru (Register).
 * 2. Mengelola input kredensial (nama lengkap, alamat email, dan kata sandi).
 * 3. Integrasi Otentikasi: Memanggil fungsi login dan register dari AuthContext yang
 *    berkomunikasi dengan endpoint REST API `/api/v1/auth/*`.
 * 4. Menyediakan pintasan kredensial demo (Akun Admin Bendahara vs Akun Anggota Warga)
 *    untuk kemudahan evaluasi dan demonstrasi tata kelola multi-peran.
 * 5. Tampilan responsif dengan latar belakang ilustrasi tematik, efek visual blur neon,
 *    dan pemilih tema tampilan (Light/Dark).
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Wallet, Sun, Moon, ArrowRight, AlertCircle, Sparkles, ArrowLeft } from 'lucide-react';
import communityBg from '../assets/community-fintech-bg.jpg';

/**
 * Interface properti komponen AuthPage
 */
interface AuthPageProps {
  onBackToLanding?: () => void; // Callback navigasi kembali ke halaman pembuka (Landing Page)
}

export const AuthPage: React.FC<AuthPageProps> = ({ onBackToLanding }) => {
  // ---------------------------------------------------------------------------
  // HOOKS & CONTEXT
  // ---------------------------------------------------------------------------
  // Mengambil aksi login dan register dari AuthContext
  const { login, register } = useAuth();

  // Mengambil tema aktif dan fungsi toggle tema dari ThemeContext
  const { theme, toggleTheme } = useTheme();

  // ---------------------------------------------------------------------------
  // FORM & COMPONENT STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  // Mode formulir aktif ('login' untuk masuk, 'register' untuk buat akun baru)
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Nilai input teks form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Status pemrosesan permintaan HTTP ke backend
  const [isLoading, setIsLoading] = useState(false);

  // Penampung pesan kesalahan otentikasi dari backend atau validasi lokal
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  /**
   * Menangani pengiriman form login atau pendaftaran akun baru
   * @param e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (mode === 'login') {
        // Eksekusi login via kredensial email & password
        await login(email.trim(), password);
      } else {
        // Validasi kelengkapan nama pada mode registrasi
        if (!fullName.trim()) {
          throw new Error('Nama lengkap wajib diisi.');
        }
        // Eksekusi pendaftaran akun baru
        await register(fullName.trim(), email.trim(), password);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan. Silakan coba kembali.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Mengisi form secara instan dengan akun contoh demo (Admin vs Anggota)
   * @param type - Jenis akun demo yang ingin diuji ('admin' | 'warga')
   */
  const handleDemoFill = (type: 'admin' | 'warga') => {
    setErrorMsg(null);
    if (type === 'admin') {
      setEmail('budi.admin@kasbareng.id');
      setPassword('AdminKasbareng123!');
      setFullName('Budi Santoso');
    } else {
      setEmail('siti.warga@kasbareng.id');
      setPassword('WargaKasbareng123!');
      setFullName('Siti Rahayu');
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER UI UTAMA
  // ---------------------------------------------------------------------------
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors overflow-hidden">
      {/* 1. Latar Belakang Animasi & Ornamen Visual Tematik */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0 bg-slate-950">
        {/* Gambar Ilustrasi Gotong Royong dengan Animasi Slow-Zoom Halus */}
        <img
          src={communityBg}
          alt="Kas Komunitas Gotong Royong"
          className="w-full h-full object-cover object-center opacity-60 sm:opacity-70 transition-opacity duration-700 animate-slow-zoom scale-105"
        />

        {/* Lapisan Vignette Gradient untuk Memastikan Keterbacaan Teks */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-slate-950/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-slate-950/60" />

        {/* Efek Pendar Cahaya Neon (Ambient Orbs) */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/25 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/25 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
      </div>

      {/* 2. Bilah Atas (Top Bar): Logo Brand, Tombol Kembali, & Toggle Tema */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          {/* Tombol Kembali ke Landing Page */}
          {onBackToLanding && (
            <button
              onClick={onBackToLanding}
              className="p-2 -ml-2 mr-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Kembali ke Landing Page"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Landing Page</span>
            </button>
          )}

          {/* Logo Brand KasBareng */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white drop-shadow-sm">
            KASBARENG
          </span>
        </div>

        {/* Tombol Toggle Tema (Terang / Gelap) */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-slate-700/80 bg-slate-900/80 backdrop-blur-md text-slate-200 hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          title={`Ganti tema (${theme})`}
        >
          {theme === 'dark' ? (
            <Moon className="w-4 h-4 text-emerald-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
        </button>
      </header>

      {/* 3. Kontainer Utama Form Otentikasi (Glassmorphism Card) */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full backdrop-blur-2xl bg-white/95 dark:bg-slate-900/90 rounded-3xl border border-white/30 dark:border-slate-700 shadow-2xl shadow-emerald-950/50 p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Header Kartu & Tagline Transparansi */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>Transparansi Kas Keluarga & Komunitas Bersama</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {mode === 'login' ? 'Selamat Datang Kembali' : 'Mulai Kas & Tabungan Bersama'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Platform transparansi kas keluarga, komunitas, & perkumpulan
            </p>
          </div>

          {/* Tab Pemilih Mode: Masuk Akun vs Daftar Baru */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Masuk Akun
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Daftar Baru
            </button>
          </div>

          {/* Banner Pesan Kesalahan (Alert Error) */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Formulir Input Otentikasi */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Nama Lengkap (Hanya Tampil Saat Pendaftaran) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            )}

            {/* Input Alamat Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Email
              </label>
              <input
                type="email"
                required
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Input Kata Sandi */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kata Sandi
              </label>
              <input
                type="password"
                required
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Tombol Submit Form */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? 'Memproses...' : mode === 'login' ? 'Masuk ke Kas Bersama' : 'Daftar Akun'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Pintasan Pengisian Akun Demo Cepat */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-medium text-slate-400 block text-center">
              Akses Cepat Pengujian Demo:
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('admin')}
                className="flex-1 py-1.5 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-center transition-colors cursor-pointer"
              >
                Isi Akun Admin
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('warga')}
                className="flex-1 py-1.5 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-center transition-colors cursor-pointer"
              >
                Isi Akun Anggota
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Footer Halaman */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
        KASBARENG • Zero-Trust Community Financial Transparency Platform
      </footer>
    </div>
  );
};
