const OPAQUE_GUEST_NAMES = new Set([
  '[ENCRYPTED_PII_UNREADABLE]',
  '[Encrypted guest data unavailable]',
  '[Encrypted guest data stored in IndexedDB]',
]);

export function isUnreadableGuestName(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) return true;
  if (OPAQUE_GUEST_NAMES.has(normalized)) return true;

  return (
    normalized.startsWith('{') &&
    normalized.includes('"ciphertext"') &&
    normalized.includes('"iv"')
  );
}

export function getGuestDisplayName(value: string, fallback = 'Guest'): string {
  return isUnreadableGuestName(value) ? fallback : value;
}
