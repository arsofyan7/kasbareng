import { describe, it, expect } from 'vitest';
import { evaluateQuorum, QuorumInput } from './quorum-evaluator';

describe('Algorithm: Quorum Evaluator M-of-N', () => {
  const baseInput: QuorumInput = {
    creatorId: 'user_alice',
    transactionVersion: 1,
    policyVersion: 1,
    requiredApprovals: 2,
    eligibleApproverIds: ['user_bob', 'user_charlie', 'user_dave'],
    approvals: [],
  };

  it('evaluates approved = true when valid unique approvals reach M (2-of-3)', () => {
    const input: QuorumInput = {
      ...baseInput,
      approvals: [
        {
          approverId: 'user_bob',
          decision: 'APPROVE',
          transactionVersion: 1,
          policyVersion: 1,
          createdAt: new Date(),
        },
        {
          approverId: 'user_charlie',
          decision: 'APPROVE',
          transactionVersion: 1,
          policyVersion: 1,
          createdAt: new Date(),
        },
      ],
    };

    const res = evaluateQuorum(input);
    expect(res.approved).toBe(true);
    expect(res.validApprovalCount).toBe(2);
    expect(res.validApproverIds).toEqual(['user_bob', 'user_charlie']);
    expect(res.rejectedApprovals.length).toBe(0);
  });

  it('evaluates approved = false when approvals are below M', () => {
    const input: QuorumInput = {
      ...baseInput,
      approvals: [
        {
          approverId: 'user_bob',
          decision: 'APPROVE',
          transactionVersion: 1,
          policyVersion: 1,
          createdAt: new Date(),
        },
      ],
    };

    const res = evaluateQuorum(input);
    expect(res.approved).toBe(false);
    expect(res.validApprovalCount).toBe(1);
  });

  it('strictly blocks self-approval by transaction creator by default', () => {
    const input: QuorumInput = {
      ...baseInput,
      eligibleApproverIds: ['user_alice', 'user_bob', 'user_charlie'],
      approvals: [
        {
          approverId: 'user_alice', // creator!
          decision: 'APPROVE',
          transactionVersion: 1,
          policyVersion: 1,
          createdAt: new Date(),
        },
        {
          approverId: 'user_bob',
          decision: 'APPROVE',
          transactionVersion: 1,
          policyVersion: 1,
          createdAt: new Date(),
        },
      ],
    };

    const res = evaluateQuorum(input);
    expect(res.approved).toBe(false); // only bob is valid
    expect(res.validApprovalCount).toBe(1);
    expect(res.rejectedApprovals.some((r) => r.reason === 'SELF_APPROVAL_FORBIDDEN')).toBe(true);
  });

  it('deduplicates multiple approvals from the same identity', () => {
    const input: QuorumInput = {
      ...baseInput,
      approvals: [
        {
          approverId: 'user_bob',
          decision: 'APPROVE',
          transactionVersion: 1,
          policyVersion: 1,
          createdAt: new Date(),
        },
        {
          approverId: 'user_bob', // duplicate
          decision: 'APPROVE',
          transactionVersion: 1,
          policyVersion: 1,
          createdAt: new Date(),
        },
      ],
    };

    const res = evaluateQuorum(input);
    expect(res.approved).toBe(false);
    expect(res.validApprovalCount).toBe(1);
    expect(res.rejectedApprovals.some((r) => r.reason === 'DUPLICATE_APPROVAL')).toBe(true);
  });

  it('rejects approvals for outdated transaction or policy versions', () => {
    const input: QuorumInput = {
      ...baseInput,
      approvals: [
        {
          approverId: 'user_bob',
          decision: 'APPROVE',
          transactionVersion: 0, // stale tx version!
          policyVersion: 1,
          createdAt: new Date(),
        },
        {
          approverId: 'user_charlie',
          decision: 'APPROVE',
          transactionVersion: 1,
          policyVersion: 2, // policy mismatch!
          createdAt: new Date(),
        },
      ],
    };

    const res = evaluateQuorum(input);
    expect(res.approved).toBe(false);
    expect(res.validApprovalCount).toBe(0);
    expect(res.rejectedApprovals.length).toBe(2);
  });

  it('rejects approval from non-eligible user', () => {
    const input: QuorumInput = {
      ...baseInput,
      approvals: [
        {
          approverId: 'user_eve', // not in eligible list
          decision: 'APPROVE',
          transactionVersion: 1,
          policyVersion: 1,
          createdAt: new Date(),
        },
      ],
    };

    const res = evaluateQuorum(input);
    expect(res.approved).toBe(false);
    expect(res.rejectedApprovals.some((r) => r.reason === 'NOT_AN_ELIGIBLE_APPROVER')).toBe(true);
  });

  it('detects invalid configuration when M > N', () => {
    const res = evaluateQuorum({
      ...baseInput,
      requiredApprovals: 5,
      eligibleApproverIds: ['user_bob', 'user_charlie'], // only 2!
    });
    expect(res.approved).toBe(false);
    expect(res.configurationError).toBeDefined();
  });
});
