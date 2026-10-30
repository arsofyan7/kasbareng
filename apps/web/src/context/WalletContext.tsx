/**
 * ============================================================================
 * WalletContext.tsx - Konteks Manajemen Multi-Treasury / Dompet Kas
 * ============================================================================
 * Modul ini merupakan inti dari arsitektur multi-tenancy Kasbareng di sisi frontend.
 * Satu pengguna dapat memiliki atau bergabung ke banyak dompet kas (RT/RW, arisan, keluarga,
 * komunitas hobi), masing-masing dengan kebijakan kuorum, anggota, dan buku kas terisolasi.
 *
 * Tanggung Jawab Utama:
 * 1. Mengambil dan mengelola daftar seluruh dompet kas milik pengguna (/api/v1/wallets).
 * 2. Menyimpan dan memulihkan dompet aktif (`activeWallet`) via LocalStorage.
 * 3. Pembuatan dompet baru dengan konfigurasi kuorum persetujuan & skema iuran.
 * 4. Bergabung ke dompet kas menggunakan kode undangan unik (Invite Code).
 * 5. Manajemen kode undangan kustom dan pengaturan konfigurasi dompet kas.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Wallet, ApiResponse } from '../types';
import { useAuth } from './AuthContext';

/**
 * Interface kontrak WalletContextType
 * Mendefinisikan state global dompet kas dan fungsi operasional yang tersedia.
 */
interface WalletContextType {
  wallets: Wallet[];                // Daftar seluruh dompet kas yang diikuti pengguna
  activeWallet: Wallet | null;      // Dompet kas yang saat ini sedang aktif dipilih di UI
  isLoading: boolean;               // Flag penanda proses loading data dompet kas
  selectWallet: (walletId: string) => void;     // Mengganti dompet aktif berdasarkan ID
  refreshWallets: () => Promise<void>;         // Memuat ulang daftar dompet dari server
  createWallet: (                               // Membuat dompet kas baru beserta konfigurasi awalnya
    name: string,
    description?: string,
    requiredApprovals?: number,
    customInviteCode?: string,
    duesOptions?: {
      duesType?: import('../types').DuesType;
      duesAmount?: number;
      targetInstallmentsCount?: number;
    }
  ) => Promise<Wallet>;
  joinWallet: (inviteCode: string) => Promise<{ walletId: string; name: string }>; // Masuk ke dompet via kode undangan
  updateInviteCode: (walletId: string, customCode?: string) => Promise<{ id: string; inviteCode: string }>; // Reset / custom kode undangan
  updateWalletSettings: (                       // Memperbarui informasi & aturan iuran dompet
    walletId: string,
    settings: {
      name?: string;
      description?: string | null;
      duesType?: import('../types').DuesType;
      duesAmount?: number | null;
      targetInstallmentsCount?: number | null;
    }
  ) => Promise<Wallet>;
}

// Inisialisasi React Context untuk dompet kas
const WalletContext = createContext<WalletContextType | undefined>(undefined);

/**
 * Komponen WalletProvider
 * Membungkus aplikasi untuk menyuplai konteks dompet kas aktif ke seluruh komponen.
 */
export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Mengambil token dan user dari AuthContext sebagai prasyarat otentikasi API
  const { token, user } = useAuth();
  
  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  
  // Daftar semua dompet yang diikuti oleh user
  const [wallets, setWallets] = useState<Wallet[]>([]);
  
  // Objek dompet kas yang sedang dipilih untuk melihat dashboard & transaksi
  const [activeWallet, setActiveWallet] = useState<Wallet | null>(null);
  
  // Status loading indikator fetch data dompet
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // HANDLER: Memuat Ulang Daftar Dompet Pengguna (refreshWallets)
  // Dibungkus useCallback agar stabil saat dijadikan dependensi useEffect
  // ---------------------------------------------------------------------------
  const refreshWallets = useCallback(async () => {
    // Jika tidak ada token (belum login), reset seluruh state dompet
    if (!token) {
      setWallets([]);
      setActiveWallet(null);
      return;
    }

    setIsLoading(true);
    try {
      // Ambil daftar dompet dari endpoint backend
      const res = await fetch('/api/v1/wallets', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json: ApiResponse<Wallet[]> = await res.json();
      if (res.ok && json.data) {
        setWallets(json.data);

        // Pulihkan dompet aktif dari LocalStorage atau default ke dompet pertama
        const savedId = localStorage.getItem('kasbareng_active_wallet_id');
        const found = json.data.find((w) => w.id === savedId);

        if (found) {
          // Jika ID dompet yang tersimpan di LocalStorage masih valid, pilih dompet tersebut
          setActiveWallet(found);
        } else if (json.data.length > 0) {
          // Jika tidak ada preferensi tersimpan, otomatis pilih dompet urutan pertama
          setActiveWallet(json.data[0]);
          localStorage.setItem('kasbareng_active_wallet_id', json.data[0].id);
        } else {
          // Pengguna belum memiliki dompet sama sekali
          setActiveWallet(null);
        }
      }
    } catch (err) {
      console.error('Failed to load user wallets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // ---------------------------------------------------------------------------
  // EFEK SAMPING: Pemicu refresh saat status sesi login berubah
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (user && token) {
      refreshWallets();
    } else {
      setWallets([]);
      setActiveWallet(null);
    }
  }, [user, token, refreshWallets]);

  // ---------------------------------------------------------------------------
  // HANDLER: Memilih Dompet Aktif (selectWallet)
  // ---------------------------------------------------------------------------
  const selectWallet = (walletId: string) => {
    const found = wallets.find((w) => w.id === walletId);
    if (found) {
      setActiveWallet(found);
      // Persist preferensi ke LocalStorage agar tidak reset saat pengguna refresh halaman
      localStorage.setItem('kasbareng_active_wallet_id', found.id);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLER: Membuat Dompet Kas Baru (createWallet)
  // Mendukung pengaturan ambang batas kuorum M-of-N dan skema iuran anggota
  // ---------------------------------------------------------------------------
  const createWallet = async (
    name: string,
    description?: string,
    requiredApprovals = 2,
    customInviteCode?: string,
    duesOptions?: {
      duesType?: import('../types').DuesType;
      duesAmount?: number;
      targetInstallmentsCount?: number;
    }
  ) => {
    if (!token) throw new Error('Otentikasi diperlukan.');

    const res = await fetch('/api/v1/wallets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        description,
        requiredApprovals,
        customInviteCode: customInviteCode || undefined,
        duesType: duesOptions?.duesType,
        duesAmount: duesOptions?.duesAmount,
        targetInstallmentsCount: duesOptions?.targetInstallmentsCount,
      }),
    });

    const json: ApiResponse<Wallet> = await res.json();
    if (!res.ok || !json.data) {
      throw new Error(json.error?.message || 'Gagal membuat dompet kas baru.');
    }

    // Refresh daftar dompet dan langsung jadikan dompet baru tersebut sebagai dompet aktif
    await refreshWallets();
    selectWallet(json.data.id);
    return json.data;
  };

  // ---------------------------------------------------------------------------
  // HANDLER: Bergabung ke Dompet Kas Menggunakan Kode Undangan (joinWallet)
  // ---------------------------------------------------------------------------
  const joinWallet = async (inviteCode: string) => {
    if (!token) throw new Error('Otentikasi diperlukan.');

    // Normalisasi kode undangan: hapus spasi dan ubah ke huruf kapital
    const res = await fetch('/api/v1/wallets/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
    });

    const json: ApiResponse<{ walletId: string; name: string }> = await res.json();
    if (!res.ok || !json.data) {
      throw new Error(json.error?.message || 'Gagal bergabung ke dompet kas.');
    }

    // Muat ulang daftar dompet dan arahkan ke dompet yang baru saja dimasuki
    await refreshWallets();
    selectWallet(json.data.walletId);
    return json.data;
  };

  // ---------------------------------------------------------------------------
  // HANDLER: Memperbarui / Reset Kode Undangan Dompet (updateInviteCode)
  // Hanya dapat dilakukan oleh pengguna dengan role ADMIN / PENGELOLA
  // ---------------------------------------------------------------------------
  const updateInviteCode = async (walletId: string, customCode?: string) => {
    if (!token) throw new Error('Otentikasi diperlukan.');

    const res = await fetch(`/api/v1/wallets/${walletId}/invite-code`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ customCode: customCode ? customCode.trim().toUpperCase() : undefined }),
    });

    const json: ApiResponse<{ id: string; inviteCode: string }> = await res.json();
    if (!res.ok || !json.data) {
      throw new Error(json.error?.message || 'Gagal memperbarui kode undangan.');
    }

    await refreshWallets();
    return json.data;
  };

  // ---------------------------------------------------------------------------
  // HANDLER: Memperbarui Pengaturan Dompet Kas (updateWalletSettings)
  // Mengubah nama, deskripsi, atau konfigurasi skema iuran kas
  // ---------------------------------------------------------------------------
  const updateWalletSettings = async (
    walletId: string,
    settings: {
      name?: string;
      description?: string | null;
      duesType?: import('../types').DuesType;
      duesAmount?: number | null;
      targetInstallmentsCount?: number | null;
    }
  ) => {
    if (!token) throw new Error('Otentikasi diperlukan.');

    const res = await fetch(`/api/v1/wallets/${walletId}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settings),
    });

    const json: ApiResponse<Wallet> = await res.json();
    if (!res.ok || !json.data) {
      throw new Error(json.error?.message || 'Gagal memperbarui pengaturan dompet.');
    }

    await refreshWallets();
    return json.data;
  };

  // ---------------------------------------------------------------------------
  // RENDER CONTEXT PROVIDER
  // Menyediakan value data dompet dan operasi mutasi ke seluruh komponen anak
  // ---------------------------------------------------------------------------
  return (
    <WalletContext.Provider
      value={{
        wallets,
        activeWallet,
        isLoading,
        selectWallet,
        refreshWallets,
        createWallet,
        joinWallet,
        updateInviteCode,
        updateWalletSettings,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

/**
 * Custom Hook: useWallet
 * Akses cepat ke konteks multi-dompet Kasbareng di level komponen.
 */
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

