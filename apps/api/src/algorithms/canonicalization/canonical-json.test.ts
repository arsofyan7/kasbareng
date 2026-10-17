import { describe, it, expect } from 'vitest';
import { canonicalJson } from './canonical-json.js';

describe('Algorithm: Canonical JSON Serializer', () => {
  it('harus menghasilkan string yang identik terlepas dari urutan key objek', () => {
    const objA = { z: 10, a: 'halo', m: true };
    const objB = { a: 'halo', m: true, z: 10 };
    const objC = { m: true, z: 10, a: 'halo' };

    const canonA = canonicalJson(objA);
    const canonB = canonicalJson(objB);
    const canonC = canonicalJson(objC);

    expect(canonA).toBe('{\"a\":\"halo\",\"m\":true,\"z\":10}');
    expect(canonA).toBe(canonB);
    expect(canonB).toBe(canonC);
  });

  it('harus mengurutkan key objek bersarang (nested objects) secara rekursif', () => {
    const nestedA = {
      walletId: 'w-1',
      details: { beta: 2, alpha: 1 },
      items: [{ b: 2, a: 1 }]
    };
    const nestedB = {
      items: [{ a: 1, b: 2 }],
      details: { alpha: 1, beta: 2 },
      walletId: 'w-1'
    };

    expect(canonicalJson(nestedA)).toBe(canonicalJson(nestedB));
    expect(canonicalJson(nestedA)).toBe(
      '{\"details\":{\"alpha\":1,\"beta\":2},\"items\":[{\"a\":1,\"b\":2}],\"walletId\":\"w-1\"}'
    );
  });

  it('harus menangani array, null, boolean, dan tipe primitif dengan stabil', () => {
    expect(canonicalJson(null)).toBe('null');
    expect(canonicalJson(true)).toBe('true');
    expect(canonicalJson(12345)).toBe('12345');
    expect(canonicalJson('uang kas')).toBe('\"uang kas\"');
    expect(canonicalJson([3, 2, 1])).toBe('[3,2,1]');
  });

  it('harus memformat Date ke format UTC ISO-8601 standar', () => {
    const d = new Date('2026-10-17T12:00:00.000Z');
    expect(canonicalJson({ at: d })).toBe('{\"at\":\"2026-10-17T12:00:00.000Z\"}');
  });
});
