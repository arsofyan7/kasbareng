/**
 * ============================================================================
 * ENTRY POINT UTAMA APLIKASI WEB KASBARENG
 * ============================================================================
 * File ini bertindak sebagai berkas bootstrapping React DOM yang memuat seluruh
 * hierarki aplikasi ke dalam elemen root HTML.
 * Mengaktifkan StrictMode untuk mendeteksi potensi efek samping tak terduga
 * dan mengimpor stylesheet global Tailwind CSS.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ----------------------------------------------------------------------------
// Inisialisasi Root Rendering React DOM
// Menemukan elemen HTML dengan ID 'root' dan memasang tree komponen React
// ----------------------------------------------------------------------------
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Komponen utama yang membungkus seluruh Provider Konteks dan Tata Letak Navigasi */}
    <App />
  </React.StrictMode>
);
