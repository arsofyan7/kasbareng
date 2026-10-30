/**
 * ============================================================================
 * KOMPONEN UTAMA & ORKESTRATOR TATA LETAK APLIKASI (APP.TSX)
 * ============================================================================
 * Komponen ini bertanggung jawab atas:
 * 1. Penyediaan Context Global (Theme, Auth, Wallet).
 * 2. Manajemen Navigasi Tab Utama (Routing Berbasis Tab tanpa reload).
 * 3. Deteksi URL Deep-Link (Parameter ?join=... untuk undangan dompet).
 * 4. Pengendalian visibilitas Modal Global (Transaksi Baru, Ganti Dompet, Rantai Audit, dll).
 * 5. Adaptasi Antarmuka Responsif (Desktop Sidebar vs Mobile Bottom Navigation).
 */

import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import { TransactionType } from './types';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { WalletsPage } from './pages/WalletsPage';
import { MembersPage } from './pages/MembersPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { AiParserPage } from './pages/AiParserPage';
import { DuesBoardPage } from './pages/DuesBoardPage';
import { ProfilePage } from './pages/ProfilePage';
import { Navbar } from './components/common/Navbar';
import { Sidebar, NavTab } from './components/common/Sidebar';
import { BottomNav } from './components/common/BottomNav';
import { WalletSwitcherModal } from './components/common/WalletSwitcherModal';
import { CreateWalletModal } from './components/common/CreateWalletModal';
import { JoinWalletModal } from './components/common/JoinWalletModal';
import { AuditChainModal } from './components/common/AuditChainModal';
import { AlgorithmRulesModal } from './components/common/AlgorithmRulesModal';
import { QuickActionSheet } from './components/common/QuickActionSheet';
import { RecordTransactionModal } from './components/common/RecordTransactionModal';

/**
 * Komponen internal yang memiliki akses langsung ke konteks Auth dan Wallet.
 * Mengatur percabangan tampilan antara Landing Page, Login, dan Dashboard Terotentikasi.
 */
function AppContent() {
  // --------------------------------------------------------------------------
  // STATE & DATA FETCHING: Autentikasi Pengguna
  // --------------------------------------------------------------------------
  const { user, isLoading } = useAuth();

  // --------------------------------------------------------------------------
  // STATE: Kontrol Navigasi & Halaman Publik
  // --------------------------------------------------------------------------
  // Mengontrol apakah form login/register ditampilkan jika pengguna belum masuk
  const [showAuthForm, setShowAuthForm] = useState(false);
  // Tab aktif yang sedang ditampilkan di workspace utama
  const [currentTab, setCurrentTab] = useState<NavTab>('beranda');

  // --------------------------------------------------------------------------
  // STATE: Visibilitas Modal Dompet & Tata Kelola
  // --------------------------------------------------------------------------
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [createWalletOpen, setCreateWalletOpen] = useState(false);
  const [joinWalletOpen, setJoinWalletOpen] = useState(false);
  const [joinInitialCode, setJoinInitialCode] = useState('');
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [algorithmModalOpen, setAlgorithmModalOpen] = useState(false);

  // --------------------------------------------------------------------------
  // STATE: Aksi Cepat (Quick Action Sheet) & Pencatatan Transaksi Global
  // --------------------------------------------------------------------------
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordModalType, setRecordModalType] = useState<TransactionType>('INCOME');
  // Trigger penyegaran data lintas komponen ketika transaksi baru berhasil disimpan
  const [refreshKey, setRefreshKey] = useState(0);

  // --------------------------------------------------------------------------
  // EFEK SAMPING (EFFECT): Penanganan Deep-Link dari URL Query Parameter
  // Mendeteksi link undangan (misal: ?join=KAS-WARGA) atau redirect login (?login=true)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const joinParam = searchParams.get('join');
    const authParam = searchParams.get('auth') || searchParams.get('login');
    const path = window.location.pathname;

    // Arahkan ke form login jika ada query auth atau URL /login
    if (authParam === 'true' || path === '/login' || path === '/auth') {
      setShowAuthForm(true);
    }

    // Tangani parameter kode undangan dompet
    if (joinParam) {
      setJoinInitialCode(joinParam.trim().toUpperCase());
      setJoinWalletOpen(true);
      setShowAuthForm(true);
      // Bersihkan query string dari URL tanpa memicu reload halaman
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // --------------------------------------------------------------------------
  // RENDER UI: Status Pemuatan Awal (Initial Loading State)
  // --------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Memuat KASBARENG...</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER UI: Pengunjung Belum Terotentikasi (Landing Page vs Auth Form)
  // --------------------------------------------------------------------------
  if (!user) {
    if (showAuthForm) {
      return <AuthPage onBackToLanding={() => setShowAuthForm(false)} />;
    }
    return <LandingPage onGoToLogin={() => setShowAuthForm(true)} />;
  }

  // --------------------------------------------------------------------------
  // RENDER UI: Dasbor Aplikasi Pengguna Terotentikasi
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col bg-mint-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Bar Navigasi Atas (Top Navbar) dengan Logo, Switcher Dompet, & Profil */}
      <Navbar
        onOpenCreateWallet={() => setCreateWalletOpen(true)}
        onOpenJoinWallet={() => setJoinWalletOpen(true)}
        onOpenWalletModal={() => setWalletModalOpen(true)}
        onOpenAlgorithmModal={() => setAlgorithmModalOpen(true)}
      />

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Navigasi Bilah Sisi (Sidebar) untuk Layar Desktop & Tablet */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenCreateWallet={() => setCreateWalletOpen(true)}
          onOpenJoinWallet={() => setJoinWalletOpen(true)}
          onOpenAuditChain={() => setAuditModalOpen(true)}
          onOpenQuickAction={() => setQuickActionOpen(true)}
        />

        {/* Area Kerja Konten Utama Berdasarkan Tab yang Dipilih */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-5xl mx-auto w-full">
          {currentTab === 'beranda' && (
            <DashboardPage
              onOpenCreateWallet={() => setCreateWalletOpen(true)}
              onOpenJoinWallet={() => setJoinWalletOpen(true)}
              onNavigateToTab={setCurrentTab}
              onOpenRecordModal={(type) => {
                setRecordModalType(type);
                setRecordModalOpen(true);
              }}
              refreshTrigger={refreshKey}
            />
          )}
          {currentTab === 'transaksi' && (
            <TransactionsPage
              onOpenRecordModal={(type) => {
                setRecordModalType(type);
                setRecordModalOpen(true);
              }}
              refreshTrigger={refreshKey}
            />
          )}
          {currentTab === 'papan-iuran' && <DuesBoardPage />}
          {currentTab === 'kantong' && (
            <WalletsPage
              onOpenCreateWallet={() => setCreateWalletOpen(true)}
              onOpenJoinWallet={() => setJoinWalletOpen(true)}
              onNavigateHome={() => setCurrentTab('beranda')}
            />
          )}
          {currentTab === 'persetujuan' && <ApprovalsPage />}
          {currentTab === 'rekonsiliasi' && <ReconciliationPage />}
          {currentTab === 'ai-parser' && <AiParserPage />}
          {currentTab === 'anggota' && <MembersPage />}
          {currentTab === 'profil' && (
            <ProfilePage onOpenAlgorithmModal={() => setAlgorithmModalOpen(true)} />
          )}
        </main>
      </div>

      {/* Navigasi Bawah Layar Seluler (Bottom Nav) dengan Tombol Aksi Cepat Mengambang */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenQuickAction={() => setQuickActionOpen(true)}
      />

      {/* Sheet Aksi Cepat (Speed Dial Menu ala Aplikasi Finansial Modern) */}
      <QuickActionSheet
        isOpen={quickActionOpen}
        onClose={() => setQuickActionOpen(false)}
        onSelectIncome={() => {
          setQuickActionOpen(false);
          setRecordModalType('INCOME');
          setRecordModalOpen(true);
        }}
        onSelectExpense={() => {
          setQuickActionOpen(false);
          setRecordModalType('EXPENSE');
          setRecordModalOpen(true);
        }}
        onSelectAiChat={() => {
          setQuickActionOpen(false);
          setCurrentTab('ai-parser');
        }}
        onNavigateTab={(tab) => {
          setQuickActionOpen(false);
          setCurrentTab(tab);
        }}
      />

      {/* Modal Universal Pencatatan Transaksi Pemasukan / Pengeluaran */}
      <RecordTransactionModal
        isOpen={recordModalOpen}
        initialType={recordModalType}
        onClose={() => setRecordModalOpen(false)}
        onSuccess={() => {
          setRecordModalOpen(false);
          // Memicu re-fetch data pada widget dasbor dan tabel transaksi
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* Modal Daftar Dompet untuk Berpindah Dompet Kas */}
      <WalletSwitcherModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        onOpenCreateWallet={() => setCreateWalletOpen(true)}
        onOpenJoinWallet={() => setJoinWalletOpen(true)}
      />

      {/* Modal Pembuatan Dompet Kas Baru */}
      <CreateWalletModal
        isOpen={createWalletOpen}
        onClose={() => setCreateWalletOpen(false)}
      />

      {/* Modal Bergabung ke Dompet Kas Menggunakan Kode Undangan */}
      <JoinWalletModal
        isOpen={joinWalletOpen}
        initialCode={joinInitialCode}
        onClose={() => {
          setJoinWalletOpen(false);
          setJoinInitialCode('');
        }}
        onSuccess={() => {
          setCurrentTab('beranda');
        }}
      />

      {/* Modal Inspeksi & Verifikasi Rantai Kriptografis SHA-256 (Audit Trail) */}
      <AuditChainModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
      />

      {/* Modal Edukasi Aturan Algoritma & Tata Kelola Keuangan KasBareng */}
      <AlgorithmRulesModal
        isOpen={algorithmModalOpen}
        onClose={() => setAlgorithmModalOpen(false)}
        onOpenAuditChain={() => {
          setAlgorithmModalOpen(false);
          setAuditModalOpen(true);
        }}
      />
    </div>
  );
}

/**
 * Komponen Root Pembungkus Aplikasi
 * Menginjeksi seluruh Provider Konteks secara bertingkat: Tema -> Autentikasi -> Dompet Aktif
 */
export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WalletProvider>
          <AppContent />
        </WalletProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
