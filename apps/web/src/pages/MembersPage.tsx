/**
 * ============================================================================
 * HALAMAN MANAJEMEN ANGGOTA & PERAN DOMPET KAS (MEMBERSPAGE.TSX)
 * ============================================================================
 * Komponen ini mengatur keanggotaan dan hak akses di tingkat dompet bersama (RBAC):
 * 1. Manajemen Peran 3 Tingkat:
 *    - ADMIN: Pemilik/ketua dompet dengan hak penuh (kebijakan kuorum, mutasi peran, invite code).
 *    - PENGELOLA: Bendahara/sekretaris yang berwenang mengajukan & memverifikasi transaksi.
 *    - WARGA: Anggota biasa yang berpartisipasi membayar iuran & memantau transparansi kas.
 * 2. Distribusi Akses Cepat via Kode Undangan (Invite Code): Fitur salin kode,
 *    salin tautan deep-link (?join=...), dan bagikan langsung ke WhatsApp.
 * 3. Tambah Anggota Manual: Mengundang anggota terdaftar berdasarkan alamat email.
 * 4. Modifikasi Hak Akses Realtime: Admin dapat menaikkan/menurunkan peran anggota
 *    secara langsung melalui dropdown tabel tanpa reload halaman.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { WalletMember, WalletRole, ApiResponse } from '../types';
import {
  Users2,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Users,
  AlertCircle,
  X,
  KeyRound,
  Copy,
  Check,
  Share2,
  Sparkles,
  Search,
  Calendar,
} from 'lucide-react';
import { ManageInviteCodeModal } from '../components/common/ManageInviteCodeModal';

export const MembersPage: React.FC = () => {
  // --------------------------------------------------------------------------
  // STATE & HOOKS: Konteks Autentikasi Pengguna & Dompet Aktif
  // --------------------------------------------------------------------------
  const { token, user } = useAuth();
  const { activeWallet } = useWallet();

  // --------------------------------------------------------------------------
  // STATE: Data Anggota, Status Pemuatan, & Filter
  // --------------------------------------------------------------------------
  /** Daftar seluruh anggota aktif di dompet kas bersama */
  const [members, setMembers] = useState<WalletMember[]>([]);
  /** Status pemuatan data dari server */
  const [isLoading, setIsLoading] = useState(false);
  /** Pesan error jika query gagal */
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  /** Kata kunci pencarian nama atau email anggota */
  const [searchQuery, setSearchQuery] = useState('');
  /** Filter peran anggota: SEMUA, ADMIN, PENGELOLA, atau WARGA */
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'PENGELOLA' | 'WARGA'>('ALL');

  // --------------------------------------------------------------------------
  // STATE: Notifikasi Visual Salin Kode Undangan & Tautan
  // --------------------------------------------------------------------------
  /** Modal kustomisasi kode undangan (khusus peran Admin) */
  const [manageCodeModalOpen, setManageCodeModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // --------------------------------------------------------------------------
  // STATE: Modal Tambah Anggota Manual via Email
  // --------------------------------------------------------------------------
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<WalletRole>('WARGA');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // PENGECEKAN HAK AKSES PERAN
  // --------------------------------------------------------------------------
  /** True jika pengguna memiliki peran tertinggi ADMIN di dompet ini */
  const isAdmin = activeWallet?.myRole === 'ADMIN';
  /** True jika pengguna adalah ADMIN atau PENGELOLA */
  const isManagerOrAdmin = activeWallet?.myRole === 'ADMIN' || activeWallet?.myRole === 'PENGELOLA';

  // --------------------------------------------------------------------------
  // QUERY & DATA FETCHING: Pengambilan Daftar Anggota dari API
  // --------------------------------------------------------------------------
  const fetchMembers = useCallback(async () => {
    if (!token || !activeWallet) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/wallets/${activeWallet.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json: ApiResponse<WalletMember[]> = await res.json();
      if (res.ok && json.data) {
        setMembers(json.data);
      } else {
        setErrorMsg(json.error?.message || 'Gagal memuat daftar anggota.');
      }
    } catch (err: any) {
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  }, [token, activeWallet]);

  // --------------------------------------------------------------------------
  // EFEK SAMPING: Muat Ulang Anggota Saat Dompet Berganti
  // --------------------------------------------------------------------------
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // --------------------------------------------------------------------------
  // MEMOISASI STATISTIK: Perhitungan Jumlah Anggota per Peran
  // --------------------------------------------------------------------------
  const counts = useMemo(() => {
    const all = members.length;
    const admin = members.filter((m) => m.role === 'ADMIN').length;
    const pengelola = members.filter((m) => m.role === 'PENGELOLA').length;
    const warga = members.filter((m) => m.role === 'WARGA').length;
    return { all, admin, pengelola, warga };
  }, [members]);

  // --------------------------------------------------------------------------
  // MEMOISASI FILTER: Penyaringan Anggota Berdasarkan Tab Peran & Input Cari
  // --------------------------------------------------------------------------
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (roleFilter !== 'ALL' && m.role !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.fullName.toLowerCase().includes(q);
        const matchEmail = m.email.toLowerCase().includes(q);
        return matchName || matchEmail;
      }
      return true;
    });
  }, [members, roleFilter, searchQuery]);

  // --------------------------------------------------------------------------
  // AKSI USER: Salin Kode Undangan ke Clipboard
  // --------------------------------------------------------------------------
  const handleCopyCode = () => {
    if (!activeWallet?.inviteCode) return;
    navigator.clipboard.writeText(activeWallet.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // --------------------------------------------------------------------------
  // AKSI USER: Salin Tautan Pendaftaran Otomatis (?join=CODE)
  // --------------------------------------------------------------------------
  const handleCopyLink = () => {
    if (!activeWallet?.inviteCode) return;
    const shareLink = `${window.location.origin}/?join=${activeWallet.inviteCode}`;
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // --------------------------------------------------------------------------
  // AKSI USER: Bagikan Undangan Dompet Langsung ke WhatsApp
  // --------------------------------------------------------------------------
  const handleShareWhatsApp = () => {
    if (!activeWallet?.inviteCode) return;
    const shareLink = `${window.location.origin}/?join=${activeWallet.inviteCode}`;
    const text = encodeURIComponent(
      `Halo! Mari bergabung ke pencatatan kas transparan "${activeWallet.name}" di KasBareng.\n\n` +
      `Gunakan Kode Undangan: *${activeWallet.inviteCode}*\n` +
      `Atau klik langsung tautan ini untuk bergabung:\n${shareLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // --------------------------------------------------------------------------
  // AKSI USER: Tambah Anggota Manual Berdasarkan Email Pengguna Terdaftar
  // --------------------------------------------------------------------------
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setIsSubmitting(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/v1/wallets/${activeWallet!.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: newEmail.trim(), role: newRole }),
      });

      const json: ApiResponse<any> = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal menambahkan anggota.');
      }

      setNewEmail('');
      setNewRole('WARGA');
      setAddModalOpen(false);
      await fetchMembers();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // AKSI USER: Perubahan Hak Akses / Peran Anggota oleh Admin
  // --------------------------------------------------------------------------
  const handleRoleChange = async (memberId: string, role: WalletRole) => {
    try {
      const res = await fetch(
        `/api/v1/wallets/${activeWallet!.id}/members/${memberId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role }),
        }
      );

      const json: ApiResponse<any> = await res.json();
      if (!res.ok) {
        alert(json.error?.message || 'Gagal mengubah role anggota.');
      } else {
        await fetchMembers();
      }
    } catch (err) {
      alert('Gagal menghubungi server.');
    }
  };

  // --------------------------------------------------------------------------
  // HELPER FORMAT: Lencana Peran Anggota (Admin, Pengelola, Anggota)
  // --------------------------------------------------------------------------
  const getRoleBadge = (role: WalletRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin
          </span>
        );
      case 'PENGELOLA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/20">
            <UserCheck className="w-3.5 h-3.5" />
            Pengelola
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/20">
            <Users className="w-3.5 h-3.5" />
            Anggota
          </span>
        );
    }
  };

  /** Helper warna latar avatar berdasarkan tingkatan peran */
  const getAvatarBg = (role: WalletRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-emerald-600 text-white';
      case 'PENGELOLA':
        return 'bg-sky-600 text-white';
      default:
        return 'bg-slate-700 text-slate-100';
    }
  };

  // --------------------------------------------------------------------------
  // RENDER UI: Tampilan Halaman Anggota & Peran Kas Bersama
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header Judul & Tombol Tambah Anggota */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Keanggotaan & Peran Kas Bersama
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Daftar anggota dan pengelola kas di{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {activeWallet?.name}
            </span>
          </p>
        </div>

        {/* Tombol Tambah Anggota Manual (Khusus Admin) */}
        {isAdmin && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto cursor-pointer"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            + Tambah Anggota Manual
          </button>
        )}
      </div>

      {/* 2. Kartu Bagikan Kode Undangan Komunitas (Khusus Pengurus & Admin) */}
      {activeWallet && isManagerOrAdmin && (
        <div className="p-5 rounded-3xl bg-slate-900 text-white dark:bg-slate-900/90 border border-slate-700/80 dark:border-slate-700 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="space-y-1.5 z-10">
            <div className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                Akses Anggota (Private Gated)
              </span>
              <span className="text-xs text-slate-400">
                Join Otomatis: <strong>ANGGOTA</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-xs text-slate-300">Kode Undangan:</span>
              <span className="font-mono text-base font-extrabold tracking-wider text-emerald-400 bg-black/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                {activeWallet.inviteCode || 'KAS-BERSAMA'}
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Anggota yang memasukkan kode ini otomatis langsung terdaftar sebagai Anggota tanpa perlu di-acc manual satu per satu.
            </p>
          </div>

          {/* Tombol Aksi Salin & Bagikan */}
          <div className="flex flex-wrap items-center gap-2 z-10">
            <button
              onClick={handleCopyCode}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              {copiedCode ? 'Tersalin!' : 'Salin Kode'}
            </button>

            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-slate-300" />}
              {copiedLink ? 'Link Tersalin!' : 'Salin Link'}
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Bagikan WA
            </button>

            {isAdmin && (
              <button
                onClick={() => setManageCodeModalOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-xs font-semibold text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Atur Kode
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Bilah Filter Tab Peran & Kolom Pencarian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tombol Tab Filter Peran */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 max-w-lg">
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              roleFilter === 'ALL'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Semua ({counts.all})
          </button>
          <button
            onClick={() => setRoleFilter('ADMIN')}
            className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              roleFilter === 'ADMIN'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Admin ({counts.admin})
          </button>
          <button
            onClick={() => setRoleFilter('PENGELOLA')}
            className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              roleFilter === 'PENGELOLA'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Pengelola ({counts.pengelola})
          </button>
          <button
            onClick={() => setRoleFilter('WARGA')}
            className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              roleFilter === 'WARGA'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Anggota ({counts.warga})
          </button>
        </div>

        {/* Kolom Pencarian Anggota */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau email..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs py-2 pl-8 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm placeholder:text-slate-400"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Banner Indikator Kesalahan */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 5. Daftar Tabel Desktop & Kartu Seluler Anggota */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-slate-400 animate-pulse bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700">
          Memuat daftar anggota kas...
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-slate-900/40 space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Tidak ada anggota ditemukan pada filter ini.
          </p>
          <p className="text-xs text-slate-400">
            Coba bersihkan pencarian atau ubah tab peranan.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tampilan Tabel Desktop */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Anggota</th>
                  <th className="px-6 py-4">Peran (Role)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Bergabung</th>
                  {isAdmin && <th className="px-6 py-4 text-right">Kelola Peran</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredMembers.map((m) => {
                  const isCurrentUser = m.userId === user?.id;
                  const initial = m.fullName ? m.fullName.charAt(0).toUpperCase() : 'W';
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Avatar & Profil Anggota */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full ${getAvatarBg(m.role)} flex items-center justify-center font-bold text-xs shrink-0 shadow-sm`}>
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                              <span className="truncate">{m.fullName}</span>
                              {isCurrentUser && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {m.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Lencana Peran Anggota */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(m.role)}
                      </td>

                      {/* Status Keaktifan Akun */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 font-medium">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          Aktif
                        </span>
                      </td>

                      {/* Tanggal Bergabung */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {m.joinedAt ? (
                          new Date(m.joinedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Dropdown Pengubah Peran (Khusus Admin Dompet) */}
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.id, e.target.value as WalletRole)}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-sm"
                          >
                            <option value="WARGA">Anggota</option>
                            <option value="PENGELOLA">Pengelola</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tampilan Kartu Seluler */}
          <div className="md:hidden space-y-3">
            {filteredMembers.map((m) => {
              const isCurrentUser = m.userId === user?.id;
              const initial = m.fullName ? m.fullName.charAt(0).toUpperCase() : 'W';
              return (
                <div
                  key={m.id}
                  className="p-5 rounded-3xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full ${getAvatarBg(m.role)} flex items-center justify-center font-bold text-sm shrink-0`}>
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className="truncate">{m.fullName}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Anda
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {m.email}
                        </div>
                      </div>
                    </div>

                    <div>{getRoleBadge(m.role)}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : 'Aktif'}
                    </span>

                    {isAdmin && (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value as WalletRole)}
                        className="px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 text-xs font-semibold"
                      >
                        <option value="WARGA">Anggota</option>
                        <option value="PENGELOLA">Pengelola</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Modal Tambah Anggota Manual Berdasarkan Email */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Tambah Anggota ke Dompet
              </h2>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Pengguna Terdaftar
                </label>
                <input
                  type="email"
                  required
                  placeholder="anggota@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Peran (Role) di Dompet Ini
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as WalletRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="WARGA">Anggota (Melihat laporan & setoran)</option>
                  <option value="PENGELOLA">Pengelola (Mengajukan transaksi kas)</option>
                  <option value="ADMIN">Admin (Mengelola anggota & aturan)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Menambahkan...' : 'Tambah Anggota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal Konfigurasi Kustomisasi Kode Undangan Dompet */}
      <ManageInviteCodeModal
        isOpen={manageCodeModalOpen}
        onClose={() => setManageCodeModalOpen(false)}
      />
    </div>
  );
};
