import { prisma } from '../../common/prisma';
import { DuesType, DuesPaymentStatus, UserStatus, Prisma } from '@prisma/client';

export interface DuesPeriod {
  key: string;       // e.g. "2026-01" or "TERMIN-1"
  label: string;     // e.g. "Januari 2026" or "Setoran 1"
  shortLabel: string;// e.g. "Jan" or "T1"
  monthNumber?: number;
  year?: number;
}

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

export interface DuesBoardResult {
  periods: DuesPeriod[];
  members: DuesBoardMemberRow[];
  summary: DuesBoardSummary;
}

export class DuesService {
  /**
   * Generates periodic keys and display labels.
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

    // Default: MONTHLY (or FREEFORM calendar view)
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
   * Fetches full dues board with members grid and compliance metrics.
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

    // Fetch existing records for these periods in this wallet
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

    // Build lookup by `${userId}:${periodKey}`
    const recordMap = new Map<string, typeof existingRecords[0]>();
    for (const rec of existingRecords) {
      recordMap.set(`${rec.userId}:${rec.periodKey}`, rec);
    }

    let totalCollected = 0;
    let totalPending = 0;
    const unpaidMembers: DuesBoardSummary['unpaidMembers'] = [];

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

    // Generate neat WhatsApp Reminder text
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
   * Synchronizes dues payment records for a transaction.
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
   * Updates dues status when a transaction is verified or rejected.
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
      // On reject, remove the dues records so the periods become available again for payment
      await tx.duesRecord.deleteMany({
        where: { transactionId },
      });
    }
  }
}
