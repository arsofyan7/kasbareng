/**
 * ============================================================================
 * MODUL DUES: SERVICE REKAPITULASI & STATUS IURAN WARGA (dues.service.ts)
 * ============================================================================
 * Service ini menangani logika bisnis pengelolaan iuran kas komunitas:
 * 1. Pembangkitan periode iuran (bulanan 12 bulan atau cicilan berbasis target termin).
 * 2. Agregasi matriks kepatuhan iuran (Dues Board grid: siapa sudah bayar, menunggu verifikasi, atau nunggak).
 * 3. Sinkronisasi status iuran saat transaksi income/setoran dibuat, disetujui (PAID), atau ditolak (dihapus).
 * 4. Pembuatan template teks pengingat WhatsApp yang siap dibagikan ke grup warga.
 */

import { prisma } from '../../common/prisma';
import { DuesType, DuesPaymentStatus, UserStatus, Prisma } from '@prisma/client';

/**
 * Interface `DuesPeriod`:
 * Representasi satu kolom periode tagihan dalam papan iuran (contoh: "2026-01" atau "TERMIN-1").
 */
export interface DuesPeriod {
  key: string;       // Kunci unik periode, contoh: "2026-01" atau "TERMIN-1"
  label: string;     // Label tampilan panjang, contoh: "Januari 2026" atau "Setoran ke-1"
  shortLabel: string;// Label ringkas untuk tabel, contoh: "Jan" atau "T1"
  monthNumber?: number;
  year?: number;
}

/**
 * Interface `DuesBoardMemberRow`:
 * Baris data kepatuhan satu orang anggota warga pada papan iuran.
 */
export interface DuesBoardMemberRow {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  records: Record<
    string,
    {
      id: string;
      status: DuesPaymentStatus;
      amount: number;
      transactionId: string | null;
      receiptAttachmentId: string | null;
      updatedAt: string;
    }
  >;
  totalPaidAmount: number;
  paidCount: number;
  pendingCount: number;
  unpaidCount: number;
  isFullyPaid: boolean;
}

/**
 * Interface `DuesBoardSummary`:
 * Ringkasan statistik dan metrik keuangan papan iuran pada dompet kas.
 */
export interface DuesBoardSummary {
  walletId: string;
  walletName: string;
  duesType: DuesType;
  duesAmount: number | null;
  targetInstallmentsCount: number | null;
  selectedYear: number;
  totalMembers: number;
  totalCollected: number;
  totalPending: number;
  totalTargetPotential: number;
  complianceRatePercent: number;
  unpaidMembers: {
    userId: string;
    fullName: string;
    unpaidPeriods: string[];
  }[];
  whatsappReminderText: string;
}

/**
 * Interface `DuesBoardResult`:
 * Payload lengkap papan iuran yang dikembalikan ke antarmuka web/mobile.
 */
export interface DuesBoardResult {
  periods: DuesPeriod[];
  members: DuesBoardMemberRow[];
  summary: DuesBoardSummary;
}

export class DuesService {
  /**
   * ============================================================================
   * METHOD: getPeriodsForWallet
   * ============================================================================
   * Fungsi Blok:
   * Menghasilkan daftar periode pembayaran yang berlaku untuk dompet berdasarkan tipe iuran.
   * 
   * Alur Kerja:
   * 1. Jika tipe `duesType === TARGET_INSTALLMENTS`:
   *    Buat N elemen termin (contoh: Setoran ke-1 s/d Setoran ke-10) dengan key "TERMIN-X".
   * 2. Jika tipe `MONTHLY` atau default:
   *    Buat 12 periode bulan kalender (Januari s/d Desember) untuk tahun yang diminta
   *    dengan format key "YYYY-MM" (misal: "2026-01").
   */
  static getPeriodsForWallet(
    duesType: DuesType,
    year: number,
    installmentsCount = 10
  ): DuesPeriod[] {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const shortMonthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
    ];

    if (duesType === DuesType.TARGET_INSTALLMENTS) {
      const count = Math.max(1, Math.min(50, installmentsCount));
      return Array.from({ length: count }, (_, i) => ({
        key: `TERMIN-${i + 1}`,
        label: `Setoran ke-${i + 1}`,
        shortLabel: `T${i + 1}`,
      }));
    }

    // Default: Bulanan (MONTHLY) atau tampilan kalender sukarela (FREEFORM)
    return monthNames.map((name, i) => {
      const monthStr = String(i + 1).padStart(2, '0');
      return {
        key: `${year}-${monthStr}`,
        label: `${name} ${year}`,
        shortLabel: shortMonthNames[i],
        monthNumber: i + 1,
        year,
      };
    });
  }

  /**
   * ============================================================================
   * METHOD: getDuesBoard
   * ============================================================================
   * Fungsi Blok:
   * Mengumpulkan data komprehensif seluruh anggota dompet kas, riwayat setoran iuran,
   * persentase kepatuhan warga, dan menyusun pesan otomatis WhatsApp reminder.
   * 
   * Alur Kerja:
   * 1. Menentukan tahun target (menggunakan parameter `filterYear` atau tahun sistem berjalan).
   * 2. Query data dompet kas beserta seluruh anggotanya yang berstatus `ACTIVE` dari Prisma ORM.
   * 3. Jika dompet tidak ditemukan, lemparkan error 404 NOT_FOUND.
   * 4. Hasilkan daftar periode kolom iuran via `getPeriodsForWallet`.
   * 5. Query semua rekaman `DuesRecord` untuk dompet dan periode tersebut,
   *    lengkap dengan lampiran kwitansi transaksi (`receiptAttachmentId`).
   * 6. Bangun `recordMap` hash map dengan kunci `${userId}:${periodKey}` untuk lookup instan O(1).
   * 7. Iterasi setiap anggota:
   *    - Cek status setiap periode (PAID, PENDING, atau UNPAID).
   *    - Akumulasikan nominal iuran lunas dan tertunda.
   *    - Catat daftar periode yang belum dilunasi warga tersebut.
   * 8. Hitung persentase kepatuhan (compliance rate) = (slot terbayar / total slot target) * 100%.
   * 9. Susun string pesan WhatsApp pengingat iuran yang memuat ringkasan kas, persentase,
   *    daftar penunggak, dan link undangan bergabung KasBareng.
   * 10. Kembalikan payload terstruktur `DuesBoardResult`.
   */
  static async getDuesBoard(
    walletId: string,
    filterYear?: number
  ): Promise<DuesBoardResult> {
    const currentYear = filterYear || new Date().getFullYear();

    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      include: {
        members: {
          where: { status: UserStatus.ACTIVE },
          include: {
            user: {
              select: { id: true, fullName: true, email: true },
            },
          },
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        },
      },
    });

    if (!wallet) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Dompet kas tidak ditemukan.' };
    }

    const duesAmountNumber = wallet.duesAmount ? Number(wallet.duesAmount) : null;
    const installmentsCount = wallet.targetInstallmentsCount || 10;
    const periods = this.getPeriodsForWallet(wallet.duesType, currentYear, installmentsCount);
    const periodKeys = periods.map((p) => p.key);

    // Ambil semua rekaman pembayaran iuran yang sudah ada untuk periode yang relevan
    const existingRecords = await prisma.duesRecord.findMany({
      where: {
        walletId,
        periodKey: { in: periodKeys },
      },
      include: {
        transaction: {
          select: { receiptAttachmentId: true },
        },
      },
    });

    // Indeks rekaman menggunakan Map dengan key `${userId}:${periodKey}`
    const recordMap = new Map<string, typeof existingRecords[0]>();
    for (const rec of existingRecords) {
      recordMap.set(`${rec.userId}:${rec.periodKey}`, rec);
    }

    let totalCollected = 0;
    let totalPending = 0;
    const unpaidMembers: DuesBoardSummary['unpaidMembers'] = [];

    // Bentuk baris data untuk setiap anggota warga
    const memberRows: DuesBoardMemberRow[] = wallet.members.map((m) => {
      const recordsRow: DuesBoardMemberRow['records'] = {};
      let totalPaidAmount = 0;
      let paidCount = 0;
      let pendingCount = 0;
      const unpaidPeriodsForMember: string[] = [];

      for (const p of periods) {
        const key = `${m.userId}:${p.key}`;
        const record = recordMap.get(key);

        if (record && record.status === DuesPaymentStatus.PAID) {
          const amt = Number(record.amount || duesAmountNumber || 0);
          recordsRow[p.key] = {
            id: record.id,
            status: DuesPaymentStatus.PAID,
            amount: amt,
            transactionId: record.transactionId,
            receiptAttachmentId: record.transaction?.receiptAttachmentId || null,
            updatedAt: record.updatedAt.toISOString(),
          };
          totalPaidAmount += amt;
          totalCollected += amt;
          paidCount++;
        } else if (record && record.status === DuesPaymentStatus.PENDING) {
          const amt = Number(record.amount || duesAmountNumber || 0);
          recordsRow[p.key] = {
            id: record.id,
            status: DuesPaymentStatus.PENDING,
            amount: amt,
            transactionId: record.transactionId,
            receiptAttachmentId: record.transaction?.receiptAttachmentId || null,
            updatedAt: record.updatedAt.toISOString(),
          };
          totalPending += amt;
          pendingCount++;
        } else {
          unpaidPeriodsForMember.push(p.shortLabel);
        }
      }

      const unpaidCount = periods.length - (paidCount + pendingCount);

      if (unpaidPeriodsForMember.length > 0) {
        unpaidMembers.push({
          userId: m.userId,
          fullName: m.user.fullName,
          unpaidPeriods: unpaidPeriodsForMember,
        });
      }

      return {
        userId: m.userId,
        fullName: m.user.fullName,
        email: m.user.email,
        role: m.role,
        records: recordsRow,
        totalPaidAmount,
        paidCount,
        pendingCount,
        unpaidCount,
        isFullyPaid: unpaidCount === 0 && pendingCount === 0,
      };
    });

    const totalMembers = wallet.members.length;
    const totalSlots = totalMembers * periods.length;
    const totalPaidSlots = memberRows.reduce((acc, row) => acc + row.paidCount, 0);
    const complianceRatePercent = totalSlots > 0 ? Math.round((totalPaidSlots / totalSlots) * 100) : 0;
    const totalTargetPotential = duesAmountNumber ? totalSlots * duesAmountNumber : 0;

    // Susun format pesan WhatsApp pengingat iuran otomatis
    const periodHeader =
      wallet.duesType === DuesType.TARGET_INSTALLMENTS
        ? `Target ${installmentsCount} Termin (${duesAmountNumber ? `Rp ${duesAmountNumber.toLocaleString('id-ID')} / termin` : 'Sukarela'})`
        : `Tahun ${currentYear} (${duesAmountNumber ? `Rp ${duesAmountNumber.toLocaleString('id-ID')} / bulan` : 'Sukarela'})`;

    const unpaidListText =
      unpaidMembers.length === 0
        ? '🎉 Luar biasa! Seluruh anggota telah melunasi iuran.'
        : unpaidMembers
            .map(
              (u, idx) =>
                `${idx + 1}. *${u.fullName}* (Belum: ${u.unpaidPeriods.slice(0, 4).join(', ')}${u.unpaidPeriods.length > 4 ? '...' : ''})`
            )
            .join('\n');

    const appLink = wallet.inviteCode
      ? `https://kasbareng.id/?join=${wallet.inviteCode}`
      : 'https://kasbareng.id';

    const whatsappReminderText =
      `📢 *PENGINGAT IURAN KAS: ${wallet.name.toUpperCase()}*\n` +
      `Periode: ${periodHeader}\n\n` +
      `Halo Bapak/Ibu anggota, berikut rekap status pembayaran kas:\n` +
      `✅ Kepatuhan Iuran: *${complianceRatePercent}%*\n` +
      `💰 Terkumpul: *Rp ${totalCollected.toLocaleString('id-ID')}*\n\n` +
      `📌 *Daftar Anggota Belum Bayar / Menunggak:*\n` +
      `${unpaidListText}\n\n` +
      `Bagi yang sudah transfer, silakan lapor pembayaran & unggah bukti transfer di KasBareng:\n` +
      `🔗 ${appLink}\n\n` +
      `Terima kasih atas kerja sama dan partisipasi aktif seluruh warga! 🙏`;

    return {
      periods,
      members: memberRows,
      summary: {
        walletId: wallet.id,
        walletName: wallet.name,
        duesType: wallet.duesType,
        duesAmount: duesAmountNumber,
        targetInstallmentsCount: installmentsCount,
        selectedYear: currentYear,
        totalMembers,
        totalCollected,
        totalPending,
        totalTargetPotential,
        complianceRatePercent,
        unpaidMembers,
        whatsappReminderText,
      },
    };
  }

  /**
   * ============================================================================
   * METHOD: syncTransactionDues
   * ============================================================================
   * Fungsi Blok:
   * Menyinkronkan catatan pembayaran iuran (`DuesRecord`) ketika suatu transaksi pemasukan dibuat
   * atau diajukan dalam transaksi database Prisma (`tx`).
   * 
   * Alur Kerja:
   * 1. Memeriksa apakah ada `periodKeys` yang dicakup oleh transaksi.
   * 2. Untuk setiap periode, jalankan operasi `tx.duesRecord.upsert`:
   *    - Jika rekaman belum ada, buat baru dengan status yang sesuai (biasanya PENDING atau PAID).
   *    - Jika sudah ada, perbarui `transactionId` dan statusnya.
   */
  static async syncTransactionDues(
    tx: Prisma.TransactionClient,
    params: {
      walletId: string;
      userId: string;
      transactionId: string;
      periodKeys: string[];
      amountPerPeriod?: number;
      status: DuesPaymentStatus;
    }
  ) {
    const { walletId, userId, transactionId, periodKeys, amountPerPeriod, status } = params;
    if (!periodKeys || periodKeys.length === 0) return;

    for (const key of periodKeys) {
      await tx.duesRecord.upsert({
        where: {
          walletId_userId_periodKey: {
            walletId,
            userId,
            periodKey: key,
          },
        },
        create: {
          walletId,
          userId,
          transactionId,
          periodKey: key,
          amount: amountPerPeriod !== undefined ? new Prisma.Decimal(amountPerPeriod) : null,
          status,
        },
        update: {
          transactionId,
          amount: amountPerPeriod !== undefined ? new Prisma.Decimal(amountPerPeriod) : undefined,
          status,
        },
      });
    }
  }

  /**
   * ============================================================================
   * METHOD: onTransactionStateChanged
   * ============================================================================
   * Fungsi Blok:
   * Memperbarui status rekaman iuran ketika status transaksi pemasukan berubah
   * (misalnya disetujui / diverifikasi oleh pengurus, atau ditolak).
   * 
   * Alur Kerja:
   * 1. Jika `decision === 'APPROVE'`:
   *    Perbarui seluruh baris `DuesRecord` yang terafiliasi dengan `transactionId` menjadi `PAID`.
   * 2. Jika `decision === 'REJECT'`:
   *    Hapus baris `DuesRecord` terafiliasi (`deleteMany`) agar periode tagihan tersebut
   *    kembali terbuka dan dapat dibayarkan kembali oleh anggota.
   */
  static async onTransactionStateChanged(
    tx: Prisma.TransactionClient,
    transactionId: string,
    decision: 'APPROVE' | 'REJECT'
  ) {
    if (decision === 'APPROVE') {
      await tx.duesRecord.updateMany({
        where: { transactionId },
        data: { status: DuesPaymentStatus.PAID },
      });
    } else {
      // Pada penolakan, hapus rekaman iuran agar periode kembali menjadi belum bayar
      await tx.duesRecord.deleteMany({
        where: { transactionId },
      });
    }
  }
}

