import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { ManageInviteCodeModal } from '../components/common/ManageInviteCodeModal';

export const MembersPage: React.FC = () => {
  const { token, user } = useAuth();
  const { activeWallet } = useWallet();

  const [members, setMembers] = useState<WalletMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Invite code modal & copy states
  const [manageCodeModalOpen, setManageCodeModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Add Member Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<WalletRole>('WARGA');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const isAdmin = activeWallet?.myRole === 'ADMIN';

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

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleCopyCode = () => {
    if (!activeWallet?.inviteCode) return;
    navigator.clipboard.writeText(activeWallet.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!activeWallet?.inviteCode) return;
    const shareLink = `${window.location.origin}/?join=${activeWallet.inviteCode}`;
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!activeWallet?.inviteCode) return;
    const shareLink = `${window.location.origin}/?join=${activeWallet.inviteCode}`;
    const text = encodeURIComponent(
      `Halo warga! Mari bergabung ke pencatatan kas transparan "${activeWallet.name}" di KasBareng.\n\n` +
      `Gunakan Kode Undangan: *${activeWallet.inviteCode}*\n` +
      `Atau klik langsung tautan ini untuk bergabung:\n${shareLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

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

  const getRoleBadge = (role: WalletRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin
          </span>
        );
      case 'PENGELOLA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <UserCheck className="w-3.5 h-3.5" />
            Pengelola
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <Users className="w-3.5 h-3.5" />
            Warga
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Keanggotaan & Peran Komunitas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Daftar warga dan pengelola kas di{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {activeWallet?.name}
            </span>
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            + Tambah Anggota Manual
          </button>
        )}
      </div>

      {/* Community Invite Code Share Card */}
      {activeWallet && (
        <div className="p-5 rounded-3xl bg-slate-900 text-white dark:bg-slate-900/90 dark:border dark:border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="space-y-1.5 z-10">
            <div className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                Akses Warga (Gated Komunitas)
              </span>
              <span className="text-xs text-slate-400">
                Join Otomatis: <strong>WARGA</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-xs text-slate-300">Kode Undangan:</span>
              <span className="font-mono text-base font-extrabold tracking-wider text-emerald-400 bg-black/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                {activeWallet.inviteCode || 'KAS-KOMUNITAS'}
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Warga yang memasukkan kode ini otomatis langsung terdaftar sebagai role WARGA tanpa perlu di-acc manual satu per satu.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 z-10">
            <button
              onClick={handleCopyCode}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all flex items-center gap-1.5"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              {copiedCode ? 'Tersalin!' : 'Salin Kode'}
            </button>

            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all flex items-center gap-1.5"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-slate-300" />}
              {copiedLink ? 'Link Tersalin!' : 'Salin Link'}
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              Bagikan WA
            </button>

            {isAdmin && (
              <button
                onClick={() => setManageCodeModalOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-xs font-semibold text-slate-200 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Atur Kode
              </button>
            )}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Members Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400 animate-pulse">
            Memuat daftar anggota kas...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Nama Lengkap & Email</th>
                  <th className="px-6 py-4">Peran (Role)</th>
                  <th className="px-6 py-4">Status</th>
                  {isAdmin && <th className="px-6 py-4 text-right">Ubah Peran</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {members.map((m) => {
                  const isCurrentUser = m.userId === user?.id;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          {m.fullName}
                          {isCurrentUser && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Anda
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {m.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(m.role)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Aktif
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.id, e.target.value as WalletRole)}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="WARGA">Warga</option>
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
        )}
      </div>

      {/* Add Member Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Tambah Anggota ke Dompet
              </h2>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                  placeholder="warga@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Peran (Role) di Dompet Ini
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as WalletRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="WARGA">Warga (Melihat laporan & iuran)</option>
                  <option value="PENGELOLA">Pengelola (Mengajukan transaksi kas)</option>
                  <option value="ADMIN">Admin (Mengelola anggota & aturan)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Menambahkan...' : 'Tambah Anggota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Invite Code Modal */}
      <ManageInviteCodeModal
        isOpen={manageCodeModalOpen}
        onClose={() => setManageCodeModalOpen(false)}
      />
    </div>
  );
};
