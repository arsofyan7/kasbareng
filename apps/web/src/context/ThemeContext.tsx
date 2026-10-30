/**
 * ============================================================================
 * ThemeContext.tsx - Konteks Tema (Dark Mode / Light Mode / System) KASBARENG
 * ============================================================================
 * Modul ini mengatur perpindahan tema visual di seluruh aplikasi:
 * 1. Mendukung 3 pilihan tema: 'light', 'dark', atau 'system' (mengikuti OS pengguna).
 * 2. Memanipulasi class CSS `dark` pada elemen root dokumen HTML (Tailwind CSS Dark Mode).
 * 3. Menyimpan preferensi tema pengguna ke LocalStorage browser.
 * 4. Mendengarkan perubahan preferensi warna OS secara dinamis saat mode 'system' dipilih.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

// Tipe data pilihan tema yang didukung
export type Theme = 'light' | 'dark' | 'system';

/**
 * Kontrak interface untuk ThemeContextType
 */
interface ThemeContextType {
  theme: Theme;                 // Pilihan tema saat ini ('light' | 'dark' | 'system')
  isDark: boolean;              // Nilai boolean terhitung apakah mode gelap sedang aktif
  setTheme: (theme: Theme) => void; // Fungsi untuk mengganti tema secara eksplisit
  toggleTheme: () => void;      // Fungsi pintas untuk toggle cepat antara light dan dark
}

// Inisialisasi React Context tema
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Komponen ThemeProvider
 * Membungkus aplikasi untuk mendistribusikan state tema dan menyinkronkan class CSS DOM.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------

  // State pilihan tema pengguna: Diambil dari LocalStorage, default ke 'system' jika belum disetel
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('kasbareng_theme');
    return (saved as Theme) || 'system';
  });

  // State evaluasi apakah tema gelap sedang aktif (boolean nyata untuk styling kondisional)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('kasbareng_theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    // Jika 'system', periksa preferensi media query OS
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // ---------------------------------------------------------------------------
  // EFEK SAMPING: Sinkronisasi DOM & Listener Perubahan Preferensi Sistem Operasi
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Fungsi internal untuk menghitung dan menerapkan class `dark` ke elemen <html>
    const updateResolvedTheme = () => {
      let resolvedDark = false;
      if (theme === 'dark') {
        resolvedDark = true;
      } else if (theme === 'light') {
        resolvedDark = false;
      } else {
        // Mode 'system': Ikuti hasil media query OS pengguna
        resolvedDark = mediaQuery.matches;
      }

      setIsDark(resolvedDark);
      
      // Tambahkan atau hapus class `dark` dari <html> agar styling Tailwind dark:* aktif
      if (resolvedDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    // Jalankan segera saat efek dimuat atau pilihan tema berubah
    updateResolvedTheme();

    // Listener otomatis: Jika user menyetel 'system', dengarkan jika OS berganti mode (misal jam malam)
    const listener = () => {
      if (theme === 'system') {
        updateResolvedTheme();
      }
    };

    mediaQuery.addEventListener('change', listener);
    // Cleanup listener saat komponen unmount atau saat dependensi theme berubah
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  // ---------------------------------------------------------------------------
  // HANDLER: Setel Tema Baru & Simpan ke LocalStorage
  // ---------------------------------------------------------------------------
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('kasbareng_theme', newTheme);
  };

  // ---------------------------------------------------------------------------
  // HANDLER: Toggle Cepat Light <-> Dark
  // ---------------------------------------------------------------------------
  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER CONTEXT PROVIDER
  // ---------------------------------------------------------------------------
  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Custom Hook: useTheme
 * Memudahkan komponen UI untuk mengakses status tema atau memicu pengubahan tema.
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
