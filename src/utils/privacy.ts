/**
 * Utilities for masking PII when Privacy Mode is active.
 */

export function maskGuestName(name: string, privacyMode: boolean): string {
  if (!privacyMode || !name) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return `${parts[0].charAt(0)}•••`;
  }
  return parts.map((p) => `${p.charAt(0)}•••`).join(' ');
}

export function maskContact(contact: string | undefined, privacyMode: boolean): string {
  if (!privacyMode || !contact) return contact || '';
  if (contact.includes('@')) {
    const [user, domain] = contact.split('@');
    return `${user.charAt(0)}•••@${domain}`;
  }
  if (contact.length > 4) {
    return `${contact.slice(0, 3)}••••${contact.slice(-2)}`;
  }
  return '••••';
}

export function maskText(text: string | undefined, privacyMode: boolean): string {
  if (!privacyMode || !text) return text || '';
  return '[CONFIDENTIAL]';
}
