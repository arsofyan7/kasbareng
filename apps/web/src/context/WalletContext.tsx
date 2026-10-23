import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Wallet, ApiResponse } from '../types';
import { useAuth } from './AuthContext';

interface WalletContextType {
  wallets: Wallet[];
  activeWallet: Wallet | null;
  isLoading: boolean;
  selectWallet: (walletId: string) => void;
  refreshWallets: () => Promise<void>;
  createWallet: (
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
  joinWallet: (inviteCode: string) => Promise<{ walletId: string; name: string }>;
  updateInviteCode: (walletId: string, customCode?: string) => Promise<{ id: string; inviteCode: string }>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [activeWallet, setActiveWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshWallets = useCallback(async () => {
    if (!token) {
      setWallets([]);
      setActiveWallet(null);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/wallets', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json: ApiResponse<Wallet[]> = await res.json();
      if (res.ok && json.data) {
        setWallets(json.data);

        // Restore active wallet from localStorage or pick the first one
        const savedId = localStorage.getItem('kasbareng_active_wallet_id');
        const found = json.data.find((w) => w.id === savedId);

        if (found) {
          setActiveWallet(found);
        } else if (json.data.length > 0) {
          setActiveWallet(json.data[0]);
          localStorage.setItem('kasbareng_active_wallet_id', json.data[0].id);
        } else {
          setActiveWallet(null);
        }
      }
    } catch (err) {
      console.error('Failed to load user wallets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user && token) {
      refreshWallets();
    } else {
      setWallets([]);
      setActiveWallet(null);
    }
  }, [user, token, refreshWallets]);

  const selectWallet = (walletId: string) => {
    const found = wallets.find((w) => w.id === walletId);
    if (found) {
      setActiveWallet(found);
      localStorage.setItem('kasbareng_active_wallet_id', found.id);
    }
  };

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

    await refreshWallets();
    selectWallet(json.data.id);
    return json.data;
  };

  const joinWallet = async (inviteCode: string) => {
    if (!token) throw new Error('Otentikasi diperlukan.');

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

    await refreshWallets();
    selectWallet(json.data.walletId);
    return json.data;
  };

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
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
