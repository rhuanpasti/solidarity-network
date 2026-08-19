const SENSITIVE_KEYS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'passwordHash',
  'token',
  'csrfToken',
  'authorization',
  'cookie',
  'set-cookie',
  'secret',
]);

function isSensitiveKey(key: string) {
  const normalizedKey = key.toLowerCase();

  return (
    SENSITIVE_KEYS.has(normalizedKey) ||
    normalizedKey.includes('password') ||
    normalizedKey.includes('token') ||
    normalizedKey.includes('secret')
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function sanitizeForLogs(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLogs(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => {
      if (isSensitiveKey(key)) {
        return [key, '[REDACTED]'];
      }

      return [key, sanitizeForLogs(entryValue)];
    }),
  );
}

function maskValue(value: string, visibleCharacters = 2) {
  if (value.length <= visibleCharacters) {
    return '[REDACTED]';
  }

  return `${'*'.repeat(Math.max(3, value.length - visibleCharacters))}${value.slice(-visibleCharacters)}`;
}

export function sanitizeForAudit(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForAudit(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => {
      const normalizedKey = key.toLowerCase();

      if (normalizedKey === 'address') {
        return [key, '[REDACTED_ADDRESS]'];
      }

      if (normalizedKey === 'document' || normalizedKey === 'phone') {
        return [key, typeof entryValue === 'string' ? maskValue(entryValue) : '[REDACTED]'];
      }

      if (normalizedKey === 'email' && typeof entryValue === 'string') {
        const [localPart, domain] = entryValue.split('@');
        return [key, localPart && domain ? `${maskValue(localPart, 1)}@${domain}` : '[REDACTED]'];
      }

      if (isSensitiveKey(key)) {
        return [key, '[REDACTED]'];
      }

      return [key, sanitizeForAudit(entryValue)];
    }),
  );
}
