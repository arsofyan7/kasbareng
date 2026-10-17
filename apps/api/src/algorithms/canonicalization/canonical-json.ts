/**
 * RFC 8785 Canonical JSON implementation.
 * Ensures deterministic string representation with sorted keys,
 * no unnecessary whitespace, and strict IEEE-754 / standard JSON encoding.
 */
export function canonicalizeJson(value: unknown): string {
  function serialize(obj: unknown): string {
    if (obj === null) {
      return 'null';
    }

    if (obj instanceof Date) {
      return JSON.stringify(obj.toISOString());
    }

    if (typeof obj === 'boolean' || typeof obj === 'number') {
      return JSON.stringify(obj);
    }

    if (typeof obj === 'string') {
      return JSON.stringify(obj);
    }

    if (typeof obj === 'bigint') {
      return obj.toString();
    }

    if (Array.isArray(obj)) {
      const items = obj.map((item) => serialize(item));
      return '[' + items.join(',') + ']';
    }

    if (typeof obj === 'object') {
      // Sort object keys lexicographically by UTF-16 code units (standard Array.sort())
      const keys = Object.keys(obj as Record<string, unknown>).sort();
      const pairs: string[] = [];

      for (const key of keys) {
        const val = (obj as Record<string, unknown>)[key];
        // Omit undefined and functions per JSON specification
        if (val !== undefined && typeof val !== 'function') {
          pairs.push(JSON.stringify(key) + ':' + serialize(val));
        }
      }

      return '{' + pairs.join(',') + '}';
    }

    return 'null';
  }

  return serialize(value);
}

export const canonicalJson = canonicalizeJson;