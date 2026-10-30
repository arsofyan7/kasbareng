/**
 * ============================================================================
 * AuthContext.tsx - Konteks Autentikasi Global KASBARENG
 * ============================================================================
 * Modul ini bertanggung jawab atas manajemen state autentikasi seluruh aplikasi.
 * Fitur utama yang dikelola di sini:
 * 1. Penyimpanan & restorasi token JWT (Session Persistence via LocalStorage).
 * 2. Validasi sesi aktif ke server backend (/api/v1/auth/me).
 * 3. Aksi Login, Register, dan Logout yang terpusat.
 * 4. Custom hook `useAuth()` untuk konsumsi data akun pengguna di komponen anak.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, ApiResponse } from '../types';

/**
 * Kontrak interface untuk AuthContextType.
 * Menentukan struktur state dan fungsi yang dapat diakses oleh komponen consumer.
 */
interface AuthContextType {
  user: User | null;         // Data profil pengguna yang sedang login (null jika belum login)
  token: string | null;      // Token JWT untuk header Authorization Bearer
  isLoading: boolean;        // Flag penanda apakah proses pengecekan sesi awal sedang berjalan
  login: (email: string, password: string) => Promise<void>;                      // Fungsi autentikasi login
  register: (fullName: string, email: string, password: string) => Promise<void>; // Fungsi registrasi pengguna baru
  logout: () => void;                                                             // Fungsi keluar akun & pembersihan sesi
}

// Inisialisasi React Context dengan nilai awal undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Komponen AuthProvider
 * Membungkus seluruh hierarki aplikasi agar semua halaman memiliki akses ke sesi autentikasi.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  
  // State token JWT: Diambil pertama kali dari LocalStorage browser agar sesi bertahan saat refresh
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('kasbareng_token'));
  
  // State profil pengguna yang aktif saat ini
  const [user, setUser] = useState<User | null>(null);
  
  // State loading: Menahan rendering rute terlindungi sebelum pengecekan token selesai
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ---------------------------------------------------------------------------
  // EFEK SAMPING: Validasi Sesi Pengguna saat Aplikasi Dimuat (Mount / Token Berubah)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchMe = async () => {
      // Jika tidak ada token tersimpan di browser, hentikan loading dan biarkan status tamu
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Melakukan verifikasi token JWT ke endpoint profil backend
        const res = await fetch('/api/v1/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json: ApiResponse<User> = await res.json();
        if (res.ok && json.data) {
          // Token valid: set data pengguna ke state global
          setUser(json.data);
        } else {
          // Token kedaluwarsa atau tidak valid: bersihkan token lokal untuk keamanan
          setToken(null);
          setUser(null);
          localStorage.removeItem('kasbareng_token');
        }
      } catch (err) {
        // Penanganan jika terjadi kegagalan jaringan saat menghubungi server backend
        console.error('Failed to restore session:', err);
      } finally {
        // Selesai pengecekan sesi, izinkan UI rute melanjutkan rendering
        setIsLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  // ---------------------------------------------------------------------------
  // HANDLER: Login Akun Pengguna
  // ---------------------------------------------------------------------------
  const login = async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const json: ApiResponse<{ user: User; token: string }> = await res.json();

    // Validasi respons: jika status gagal atau payload data kosong, lemparkan pesan error
    if (!res.ok || !json.data) {
      throw new Error(json.error?.message || 'Gagal masuk akun. Periksa kembali email dan kata sandi.');
    }

    // Simpan token JWT ke LocalStorage agar sesi tetap ada setelah reload
    localStorage.setItem('kasbareng_token', json.data.token);
    
    // Sinkronkan state token dan data profil pengguna ke state React
    setToken(json.data.token);
    setUser(json.data.user);
  };

  // ---------------------------------------------------------------------------
  // HANDLER: Registrasi Pengguna Baru
  // ---------------------------------------------------------------------------
  const register = async (fullName: string, email: string, password: string) => {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password }),
    });

    const json: ApiResponse<{ user: User; token: string }> = await res.json();

    // Jika registrasi gagal (misal email sudah terdaftar), lempar exception
    if (!res.ok || !json.data) {
      throw new Error(json.error?.message || 'Pendaftaran gagal. Silakan coba kembali.');
    }

    // Langsung otomatis login setelah registrasi berhasil
    localStorage.setItem('kasbareng_token', json.data.token);
    setToken(json.data.token);
    setUser(json.data.user);
  };

  // ---------------------------------------------------------------------------
  // HANDLER: Logout / Keluar Sesi
  // ---------------------------------------------------------------------------
  const logout = () => {
    // Bersihkan seluruh kredensial dan cache dompet aktif dari LocalStorage
    localStorage.removeItem('kasbareng_token');
    localStorage.removeItem('kasbareng_active_wallet_id');
    
    // Reset state lokal ke kondisi awal (tamu)
    setToken(null);
    setUser(null);
  };

  // ---------------------------------------------------------------------------
  // RENDER CONTEXT PROVIDER
  // Menyediakan value auth ke seluruh komponen turunan di dalam tree
  // ---------------------------------------------------------------------------
  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom Hook: useAuth
 * Memudahkan komponen fungsional untuk mengakses state dan method autentikasi.
 * Melempar error informatif jika dipanggil di luar cakupan <AuthProvider>.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
