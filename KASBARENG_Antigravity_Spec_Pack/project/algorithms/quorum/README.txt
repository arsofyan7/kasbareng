ALGORITHM: QUORUM EVALUATOR M-OF-N

TUJUAN
Menghitung apakah jumlah persetujuan valid telah memenuhi requiredApprovals.

INPUT
- transaction creator ID
- transaction version
- policy version
- requiredApprovals (M)
- daftar eligible approver IDs (N)
- daftar approval records

OUTPUT
- approved: boolean
- validApproverIds
- rejectedApprovalReasons
- requiredApprovals
- validApprovalCount

PSEUDOCODE
1. Ambil approval dengan decision=APPROVE.
2. Pastikan transactionVersion dan policyVersion sesuai.
3. Pastikan approver termasuk eligible approvers.
4. Buang approval duplicate untuk identitas yang sama.
5. Terapkan larangan self-approval jika policy mengaktifkannya.
6. Hitung valid approver unik.
7. approved = valid count >= M.

INVARIANT
- Satu identitas dihitung paling banyak satu kali per transaksi/version.
- M harus >= 1 dan tidak boleh melebihi jumlah approver eligible.
- Approval versi lama tidak dihitung.
- Role admin saja tidak otomatis menjadikan seseorang approver jika policy membutuhkan daftar approver tertentu.

KOMPLEKSITAS
O(A) dengan hash set, A adalah jumlah approval records yang diperiksa.

EDGE CASE
- Duplicate request.
- Approver sudah dinonaktifkan.
- Policy berubah.
- Creator juga approver.
- M lebih besar daripada eligible approvers.
