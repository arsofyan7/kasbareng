import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { WalletsPage } from './pages/WalletsPage';
import { MembersPage } from './pages/MembersPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { AiParserPage } from './pages/AiParserPage';
import { ProfilePage } from './pages/ProfilePage';
import { Navbar } from './components/common/Navbar';
import { Sidebar, NavTab } from './components/common/Sidebar';
import { BottomNav } from './components/common/BottomNav';
import { WalletSwitcherModal } from './components/common/WalletSwitcherModal';
import { CreateWalletModal } from './components/common/CreateWalletModal';
import { JoinWalletModal } from './components/common/JoinWalletModal';
import { AuditChainModal } from './components/common/AuditChainModal';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('beranda');
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [createWalletOpen, setCreateWalletOpen] = useState(false);
  const [joinWalletOpen, setJoinWalletOpen] = useState(false);
  const [joinInitialCode, setJoinInitialCode] = useState('');
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  // Check URL query parameters or hash on mount (e.g. ?join=RT05-SEJAHTERA)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const joinParam = searchParams.get('join');
    if (joinParam) {
      setJoinInitialCode(joinParam.trim().toUpperCase());
      setJoinWalletOpen(true);
      // Clean URL without page reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        onOpenCreateWallet={() => setCreateWalletOpen(true)}
        onOpenJoinWallet={() => setJoinWalletOpen(true)}
        onOpenWalletModal={() => setWalletModalOpen(true)}
        onOpenAuditChain={() => setAuditModalOpen(true)}
      />

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Desktop & Tablet Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenCreateWallet={() => setCreateWalletOpen(true)}
          onOpenJoinWallet={() => setJoinWalletOpen(true)}
          onOpenAuditChain={() => setAuditModalOpen(true)}
        />

        {/* Main Workspace Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-5xl mx-auto w-full">
          {currentTab === 'beranda' && (
            <DashboardPage
              onOpenCreateWallet={() => setCreateWalletOpen(true)}
              onOpenJoinWallet={() => setJoinWalletOpen(true)}
              onNavigateToTab={setCurrentTab}
              onOpenAuditChain={() => setAuditModalOpen(true)}
            />
          )}
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
          {currentTab === 'profil' && <ProfilePage />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Modals */}
      <WalletSwitcherModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        onOpenCreateWallet={() => setCreateWalletOpen(true)}
        onOpenJoinWallet={() => setJoinWalletOpen(true)}
      />

      <CreateWalletModal
        isOpen={createWalletOpen}
        onClose={() => setCreateWalletOpen(false)}
      />

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

      {/* Tamper-Evident SHA-256 Audit Chain Modal */}
      <AuditChainModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
      />
    </div>
  );
}

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
