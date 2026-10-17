export type ApprovalDecision = 'APPROVE' | 'REJECT';

export interface ApprovalRecord {
  approverId: string;
  decision: ApprovalDecision;
  transactionVersion: number;
  policyVersion: number;
  createdAt: string | Date;
  comment?: string;
}

export interface QuorumInput {
  creatorId: string;
  transactionVersion: number;
  policyVersion: number;
  requiredApprovals: number;
  eligibleApproverIds: string[];
  approvals: ApprovalRecord[];
  options?: {
    allowSelfApproval?: boolean;
  };
}

export interface RejectedApproval {
  approverId: string;
  reason:
    | 'DECISION_IS_NOT_APPROVE'
    | 'TRANSACTION_VERSION_MISMATCH'
    | 'POLICY_VERSION_MISMATCH'
    | 'NOT_AN_ELIGIBLE_APPROVER'
    | 'SELF_APPROVAL_FORBIDDEN'
    | 'DUPLICATE_APPROVAL';
  details?: string;
}

export interface QuorumResult {
  approved: boolean;
  requiredApprovals: number;
  validApprovalCount: number;
  eligibleApproverCount: number;
  validApproverIds: string[];
  rejectedApprovals: RejectedApproval[];
  hasRejectionDecision: boolean;
  configurationError?: string;
}

/**
 * Pure evaluation function for M-of-N Quorum with strict anti-self approval and version guards.
 */
export function evaluateQuorum(input: QuorumInput): QuorumResult {
  const {
    creatorId,
    transactionVersion,
    policyVersion,
    requiredApprovals,
    eligibleApproverIds,
    approvals,
    options = {},
  } = input;

  const allowSelfApproval = options.allowSelfApproval ?? false;
  const eligibleSet = new Set(eligibleApproverIds);
  const rejectedApprovals: RejectedApproval[] = [];
  const validApproverSet = new Set<string>();
  let hasRejectionDecision = false;

  // 1. Boundary & Invariant validation
  if (requiredApprovals < 1) {
    return {
      approved: false,
      requiredApprovals,
      validApprovalCount: 0,
      eligibleApproverCount: eligibleSet.size,
      validApproverIds: [],
      rejectedApprovals: [],
      hasRejectionDecision: false,
      configurationError: 'requiredApprovals (M) must be at least 1.',
    };
  }

  if (requiredApprovals > eligibleSet.size) {
    return {
      approved: false,
      requiredApprovals,
      validApprovalCount: 0,
      eligibleApproverCount: eligibleSet.size,
      validApproverIds: [],
      rejectedApprovals: [],
      hasRejectionDecision: false,
      configurationError: `requiredApprovals (${requiredApprovals}) cannot exceed eligible approver count (${eligibleSet.size}).`,
    };
  }

  // 2. Process approvals
  for (const record of approvals) {
    // Check if there is an explicit rejection
    if (record.decision === 'REJECT') {
      hasRejectionDecision = true;
      rejectedApprovals.push({
        approverId: record.approverId,
        reason: 'DECISION_IS_NOT_APPROVE',
        details: 'Explicit rejection submitted.',
      });
      continue;
    }

    // Version checks
    if (record.transactionVersion !== transactionVersion) {
      rejectedApprovals.push({
        approverId: record.approverId,
        reason: 'TRANSACTION_VERSION_MISMATCH',
        details: `Approval was on tx version ${record.transactionVersion}, expected ${transactionVersion}`,
      });
      continue;
    }

    if (record.policyVersion !== policyVersion) {
      rejectedApprovals.push({
        approverId: record.approverId,
        reason: 'POLICY_VERSION_MISMATCH',
        details: `Approval was on policy version ${record.policyVersion}, expected ${policyVersion}`,
      });
      continue;
    }

    // Eligibility check
    if (!eligibleSet.has(record.approverId)) {
      rejectedApprovals.push({
        approverId: record.approverId,
        reason: 'NOT_AN_ELIGIBLE_APPROVER',
        details: `${record.approverId} is not in the eligible approvers list.`,
      });
      continue;
    }

    // Anti-self approval
    if (!allowSelfApproval && record.approverId === creatorId) {
      rejectedApprovals.push({
        approverId: record.approverId,
        reason: 'SELF_APPROVAL_FORBIDDEN',
        details: 'Transaction creator cannot approve their own transaction.',
      });
      continue;
    }

    // Deduplication check
    if (validApproverSet.has(record.approverId)) {
      rejectedApprovals.push({
        approverId: record.approverId,
        reason: 'DUPLICATE_APPROVAL',
        details: `Duplicate approval from ${record.approverId} ignored.`,
      });
      continue;
    }

    // Valid approval counted
    validApproverSet.add(record.approverId);
  }

  const validApproverIds = Array.from(validApproverSet);
  const validApprovalCount = validApproverIds.length;
  const approved = validApprovalCount >= requiredApprovals;

  return {
    approved,
    requiredApprovals,
    validApprovalCount,
    eligibleApproverCount: eligibleSet.size,
    validApproverIds,
    rejectedApprovals,
    hasRejectionDecision,
  };
}
