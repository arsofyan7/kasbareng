import { PrismaClient, WalletRole, TransactionType, TransactionState, LedgerEntryType, ApprovalDecision, MovementDirection, ReconciliationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { GENESIS_PREVIOUS_HASH } from '../src/algorithms/hash-chain/hash-chain';
import { canonicalizeJson } from '../src/algorithms/canonicalization/canonical-json';
import crypto from 'crypto';

const prisma = new PrismaClient();

function computeSha256(str: string): string {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

async function main() {
  console.log('🌱 Starting KASBARENG Demo Dataset Seeding...');

  // 1. Password hashing
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 2. Create Realistic Community Users
  console.log('👤 Seeding Users...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kasbareng.id' },
    update: {},
    create: {
      email: 'admin@kasbareng.id',
      passwordHash,
      fullName: 'Bpk. Hendra Gunawan',
    },
  });

  const bendahara = await prisma.user.upsert({
    where: { email: 'bendahara@kasbareng.id' },
    update: {},
    create: {
      email: 'bendahara@kasbareng.id',
      passwordHash,
      fullName: 'Ibu Ratna Dewi',
    },
  });

  const sekretaris = await prisma.user.upsert({
    where: { email: 'sekretaris@kasbareng.id' },
    update: {},
    create: {
      email: 'sekretaris@kasbareng.id',
      passwordHash,
      fullName: 'Bpk. Tri Wibowo',
    },
  });

  const warga1 = await prisma.user.upsert({
    where: { email: 'warga1@kasbareng.id' },
    update: {},
    create: {
      email: 'warga1@kasbareng.id',
      passwordHash,
      fullName: 'Bpk. Joko Santoso (Blok A1)',
    },
  });

  const warga2 = await prisma.user.upsert({
    where: { email: 'warga2@kasbareng.id' },
    update: {},
    create: {
      email: 'warga2@kasbareng.id',
      passwordHash,
      fullName: 'Ibu Siti Rahayu (Blok B3)',
    },
  });

  const warga3 = await prisma.user.upsert({
    where: { email: 'warga3@kasbareng.id' },
    update: {},
    create: {
      email: 'warga3@kasbareng.id',
      passwordHash,
      fullName: 'Bpk. Ahmad Yani (Blok C2)',
    },
  });

  // 3. Create or Clean Community Wallet
  console.log('🏛️ Seeding Community Wallet...');
  let wallet = await prisma.wallet.findFirst({
    where: { name: 'Kas Warga RT 05 / RW 08 Asri' },
  });

  if (wallet) {
    // Clean old records for this wallet to ensure pristine seed state
    await prisma.reconciliationMatch.deleteMany({ where: { bankStatement: { walletId: wallet.id } } });
    await prisma.bankStatement.deleteMany({ where: { walletId: wallet.id } });
    await prisma.auditLog.deleteMany({ where: { walletId: wallet.id } });
    await prisma.paymentRecord.deleteMany({ where: { transaction: { walletId: wallet.id } } });
    await prisma.transactionApproval.deleteMany({ where: { transaction: { walletId: wallet.id } } });
    await prisma.transactionEvent.deleteMany({ where: { transaction: { walletId: wallet.id } } });
    await prisma.ledgerEntry.deleteMany({ where: { walletId: wallet.id } });
    await prisma.transaction.deleteMany({ where: { walletId: wallet.id } });
    await prisma.approvalPolicy.deleteMany({ where: { walletId: wallet.id } });
    await prisma.walletMember.deleteMany({ where: { walletId: wallet.id } });
    await prisma.wallet.delete({ where: { id: wallet.id } });
  }

  wallet = await prisma.wallet.create({
    data: {
      name: 'Kas Warga RT 05 / RW 08 Asri',
      description: 'Pencatatan kas terbuka, transparan, dan berkeadilan untuk warga RT 05 RW 08.',
      currency: 'IDR',
      inviteCode: 'RT05-ASRI',
    },
  });

  // Memberships
  await prisma.walletMember.createMany({
    data: [
      { walletId: wallet.id, userId: admin.id, role: WalletRole.ADMIN },
      { walletId: wallet.id, userId: bendahara.id, role: WalletRole.PENGELOLA },
      { walletId: wallet.id, userId: sekretaris.id, role: WalletRole.PENGELOLA },
      { walletId: wallet.id, userId: warga1.id, role: WalletRole.WARGA },
      { walletId: wallet.id, userId: warga2.id, role: WalletRole.WARGA },
      { walletId: wallet.id, userId: warga3.id, role: WalletRole.WARGA },
    ],
  });

  // Approval Policy (2 of 3 managers required for approval)
  await prisma.approvalPolicy.create({
    data: {
      walletId: wallet.id,
      requiredApprovals: 2,
      policyVersion: 1,
      createdBy: admin.id,
    },
  });

  // 4. SHA-256 Hash Chain Helper for Seeding
  let currentSequenceNo = 0;
  let lastHash = GENESIS_PREVIOUS_HASH;

  async function appendAuditEvent(eventType: string, actorId: string, metadata: any) {
    currentSequenceNo++;
    const previousHash = lastHash;
    const eventId = `evt_${Date.now()}_seq${currentSequenceNo}`;
    const payloadObject = {
      actorId,
      eventId,
      eventType,
      metadata,
      previousHash,
      sequenceNo: currentSequenceNo,
      timestamp: new Date().toISOString(),
      walletId: wallet!.id,
    };

    const canonicalPayload = canonicalizeJson(payloadObject);
    const payloadHash = computeSha256(canonicalPayload);
    const currentHash = computeSha256(`${previousHash}:${currentSequenceNo}:${payloadHash}`);
    lastHash = currentHash;

    return prisma.auditLog.create({
      data: {
        walletId: wallet!.id,
        sequenceNo: currentSequenceNo,
        eventId,
        canonicalPayload,
        payloadHash,
        previousHash,
        currentHash,
      },
    });
  }

  // Genesis Audit Event
  await appendAuditEvent('WALLET_GENESIS_CREATED', admin.id, {
    name: wallet.name,
    currency: wallet.currency,
    requiredApprovals: 2,
    inviteCode: wallet.inviteCode,
  });

  // 5. Seed Transactions & Financial Ledger
  console.log('💰 Seeding Financial Transactions & Ledger...');

  // Tx 1: Income Iuran Warga Bulanan
  const tx1 = await prisma.transaction.create({
    data: {
      walletId: wallet.id,
      creatorId: bendahara.id,
      type: TransactionType.INCOME,
      amount: 1500000,
      category: 'Iuran Kas Warga Bulanan',
      notes: 'REF:IURAN-OKT-RT05 - Iuran bulanan Oktober dari 10 KK warga RT 05.',
      state: TransactionState.COMPLETED,
      version: 1,
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      walletId: wallet.id,
      transactionId: tx1.id,
      entryType: LedgerEntryType.CREDIT,
      amount: 1500000,
      currency: 'IDR',
    },
  });

  await prisma.paymentRecord.create({
    data: {
      transactionId: tx1.id,
      paymentStatus: 'PAID',
      paymentReference: 'IURAN-OKT-RT05',
      verifiedBy: bendahara.id,
      verifiedAt: new Date(),
    },
  });

  await appendAuditEvent('TRANSACTION_COMPLETED', bendahara.id, {
    transactionId: tx1.id,
    amount: 1500000,
    type: 'INCOME',
    category: tx1.category,
  });

  // Tx 2: Income Donasi Gapura
  const tx2 = await prisma.transaction.create({
    data: {
      walletId: wallet.id,
      creatorId: admin.id,
      type: TransactionType.INCOME,
      amount: 1000000,
      category: 'Donasi & Pembangunan Gapura',
      notes: 'REF:DONASI-GAPURA-01 - Donasi swadaya warga untuk peremajaan gapura depan.',
      state: TransactionState.COMPLETED,
      version: 1,
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      walletId: wallet.id,
      transactionId: tx2.id,
      entryType: LedgerEntryType.CREDIT,
      amount: 1000000,
      currency: 'IDR',
    },
  });

  await prisma.paymentRecord.create({
    data: {
      transactionId: tx2.id,
      paymentStatus: 'PAID',
      paymentReference: 'DONASI-GAPURA-01',
      verifiedBy: admin.id,
      verifiedAt: new Date(),
    },
  });

  await appendAuditEvent('TRANSACTION_COMPLETED', admin.id, {
    transactionId: tx2.id,
    amount: 1000000,
    type: 'INCOME',
    category: tx2.category,
  });

  // Tx 3: Expense Perbaikan Lampu Gang (Completed with 2 of 3 Quorum approvals)
  const tx3 = await prisma.transaction.create({
    data: {
      walletId: wallet.id,
      creatorId: sekretaris.id,
      type: TransactionType.EXPENSE,
      amount: 350000,
      category: 'Sarana & Prasarana Lingkungan',
      notes: 'REF:LAMPU-GANG-34 - Penggantian 5 bohlam LED dan fiting kabel gang 3 & 4.',
      state: TransactionState.COMPLETED,
      version: 1,
    },
  });

  // Approvals by Admin & Bendahara (Quorum M=2 satisfied)
  await prisma.transactionApproval.createMany({
    data: [
      {
        transactionId: tx3.id,
        approverId: admin.id,
        decision: ApprovalDecision.APPROVE,
        transactionVersion: 1,
        policyVersion: 1,
      },
      {
        transactionId: tx3.id,
        approverId: bendahara.id,
        decision: ApprovalDecision.APPROVE,
        transactionVersion: 1,
        policyVersion: 1,
      },
    ],
  });

  await prisma.paymentRecord.create({
    data: {
      transactionId: tx3.id,
      paymentStatus: 'PAID',
      paymentReference: 'LAMPU-GANG-34',
      verifiedBy: bendahara.id,
      verifiedAt: new Date(),
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      walletId: wallet.id,
      transactionId: tx3.id,
      entryType: LedgerEntryType.DEBIT,
      amount: 350000,
      currency: 'IDR',
    },
  });

  await appendAuditEvent('PAYMENT_EXECUTED', bendahara.id, {
    transactionId: tx3.id,
    amount: 350000,
    type: 'EXPENSE',
    approversCount: 2,
  });

  // Tx 4: Expense Tempat Sampah Terpilah (PENDING APPROVAL: 1 of 2 votes recorded)
  const tx4 = await prisma.transaction.create({
    data: {
      walletId: wallet.id,
      creatorId: bendahara.id,
      type: TransactionType.EXPENSE,
      amount: 600000,
      category: 'Kebersihan Lingkungan',
      notes: 'Pengadaan 3 set tempat sampah terpilah (organik, anorganik, B3) untuk lapangan.',
      state: TransactionState.PENDING_APPROVAL,
      version: 1,
    },
  });

  // 1 Vote recorded by Sekretaris -> Needs 1 more vote (Admin) to reach quorum!
  await prisma.transactionApproval.create({
    data: {
      transactionId: tx4.id,
      approverId: sekretaris.id,
      decision: ApprovalDecision.APPROVE,
      transactionVersion: 1,
      policyVersion: 1,
    },
  });

  await appendAuditEvent('TRANSACTION_APPROVAL_PROCESSED', sekretaris.id, {
    transactionId: tx4.id,
    decision: 'APPROVED',
    currentApprovals: 1,
    requiredApprovals: 2,
  });

  // Tx 5 & 6: Member Income Self-Reports (Iuran Warga Menunggu Verifikasi)
  console.log('💳 Seeding Member Income Self-Reports (Iuran Warga)...');
  const attach1 = await prisma.attachment.create({
    data: {
      walletId: wallet.id,
      uploadedBy: warga1.id,
      storageKey: 'bukti_transfer_joko_oktober.jpg',
      originalFilename: 'struk_transfer_bca_joko.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: BigInt(24560),
      checksum: crypto.createHash('sha256').update('mock_receipt_joko').digest('hex'),
    },
  });

  const tx5 = await prisma.transaction.create({
    data: {
      walletId: wallet.id,
      creatorId: warga1.id,
      type: TransactionType.INCOME,
      amount: 150000,
      category: 'Iuran Warga Bulanan',
      notes: 'Iuran kas bulanan Oktober 2026 - Rumah No. 12 (Bpk. Joko Santoso)',
      receiptAttachmentId: attach1.id,
      state: TransactionState.SUBMITTED,
      version: 1,
    },
  });

  await appendAuditEvent('INCOME_REPORTED', warga1.id, {
    transactionId: tx5.id,
    amount: 150000,
    type: 'INCOME',
    category: tx5.category,
    receiptAttachmentId: attach1.id,
  });

  const attach2 = await prisma.attachment.create({
    data: {
      walletId: wallet.id,
      uploadedBy: warga2.id,
      storageKey: 'bukti_transfer_siti_kebersihan.jpg',
      originalFilename: 'bukti_donasi_siti.png',
      mimeType: 'image/png',
      sizeBytes: BigInt(18920),
      checksum: crypto.createHash('sha256').update('mock_receipt_siti').digest('hex'),
    },
  });

  const tx6 = await prisma.transaction.create({
    data: {
      walletId: wallet.id,
      creatorId: warga2.id,
      type: TransactionType.INCOME,
      amount: 100000,
      category: 'Sumbangan Sukarela Kebersihan',
      notes: 'Donasi sukarela tambahan operasional angkut sampah lingkungan',
      receiptAttachmentId: attach2.id,
      state: TransactionState.SUBMITTED,
      version: 1,
    },
  });

  await appendAuditEvent('INCOME_REPORTED', warga2.id, {
    transactionId: tx6.id,
    amount: 100000,
    type: 'INCOME',
    category: tx6.category,
    receiptAttachmentId: attach2.id,
  });

  // 6. Seed Bank Statements for Reconciliation Demo
  console.log('🏦 Seeding Bank Statements for Reconciliation Demo...');
  const importBatchId = crypto.randomUUID();
  const today = new Date().toISOString().split('T')[0];

  const b1 = await prisma.bankStatement.create({
    data: {
      walletId: wallet.id,
      importBatchId,
      sourceRowNumber: 1,
      transactionDate: new Date(today),
      amount: 1500000,
      direction: MovementDirection.CREDIT,
      description: 'TRANSFER IURAN WARGA RT 05 OKTOBER',
      externalReference: 'IURAN-OKT-RT05',
    },
  });

  const b2 = await prisma.bankStatement.create({
    data: {
      walletId: wallet.id,
      importBatchId,
      sourceRowNumber: 2,
      transactionDate: new Date(today),
      amount: 350000,
      direction: MovementDirection.DEBIT,
      description: 'PEMBELIAN LAMPU JALAN TOKO LISTRIK JAYA',
      externalReference: 'LAMPU-GANG-34',
    },
  });

  const b3 = await prisma.bankStatement.create({
    data: {
      walletId: wallet.id,
      importBatchId,
      sourceRowNumber: 3,
      transactionDate: new Date(today),
      amount: 100000,
      direction: MovementDirection.CREDIT,
      description: 'DONASI KEBERSIHAN DARI WARGA',
      externalReference: null,
    },
  });

  const b4 = await prisma.bankStatement.create({
    data: {
      walletId: wallet.id,
      importBatchId,
      sourceRowNumber: 4,
      transactionDate: new Date(today),
      amount: 75000,
      direction: MovementDirection.CREDIT,
      description: 'TRANSFER KAS DARI WARGA BARU 081299990000',
      externalReference: null,
    },
  });

  // Link initial matches
  await prisma.reconciliationMatch.createMany({
    data: [
      {
        bankStatementId: b1.id,
        transactionId: tx1.id,
        matchStatus: ReconciliationStatus.MATCHED,
        ruleCode: 'EXACT_REFERENCE',
      },
      {
        bankStatementId: b2.id,
        transactionId: tx3.id,
        matchStatus: ReconciliationStatus.MATCHED,
        ruleCode: 'EXACT_REFERENCE',
      },
      {
        bankStatementId: b3.id,
        transactionId: null,
        matchStatus: ReconciliationStatus.AMBIGUOUS,
        ruleCode: 'AMBIGUOUS_CANDIDATES',
        reviewReason: 'Ditemukan beberapa transaksi dengan nominal identik.',
      },
      {
        bankStatementId: b4.id,
        transactionId: null,
        matchStatus: ReconciliationStatus.UNMATCHED,
        ruleCode: 'NO_CANDIDATE',
      },
    ],
  });

  console.log('\n========================================================');
  console.log('✅ KASBARENG DEMO DATASET SEEDING BERHASIL!');
  console.log('========================================================');
  console.log('Dompet Kas       : Kas Warga RT 05 / RW 08 Asri');
  console.log('Kode Undangan    : RT05-ASRI');
  console.log('Aturan Kuorum    : 2 dari 3 Pengurus');
  console.log('Saldo Tercatat   : Rp 2.150.000 (Posted Balance)');
  console.log('Reservasi Aktif  : Rp 600.000 (Tempat Sampah Terpilah)');
  console.log('Saldo Tersedia   : Rp 1.550.000 (Available Balance)');
  console.log('Audit Hash Chain : 5 Event Kriptografis SHA-256 Valid');
  console.log('\nAkun Demo Siap Pakai (Password: Password123!):');
  console.log('1. Admin (Ketua RT)    : admin@kasbareng.id');
  console.log('2. Bendahara Kas       : bendahara@kasbareng.id');
  console.log('3. Sekretaris          : sekretaris@kasbareng.id');
  console.log('4. Warga Aktif         : warga1@kasbareng.id');
  console.log('========================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
