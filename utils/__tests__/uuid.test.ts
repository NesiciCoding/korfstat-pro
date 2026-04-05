import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateUUID } from '../uuid';

describe('generateUUID', () => {
  const originalCrypto = global.window?.crypto;

  afterEach(() => {
    vi.restoreAllMocks();
    if (global.window) {
      // @ts-ignore
      global.window.crypto = originalCrypto;
    }
  });

  it('should generate a valid UUID using crypto.randomUUID when available', () => {
    const mockUUID = '12345678-1234-4321-8765-123456789012';
    
    const mockRandomUUID = vi.fn().mockReturnValue(mockUUID);
    
    Object.defineProperty(global.window, 'crypto', {
      value: { randomUUID: mockRandomUUID },
      configurable: true,
      writable: true
    });

    const uuid = generateUUID();
    expect(uuid).toBe(mockUUID);
    expect(mockRandomUUID).toHaveBeenCalled();
  });

  it('should generate a valid UUID using fallback when crypto is unavailable', () => {
    // Mock window to NOT have crypto or randomUUID
    Object.defineProperty(global.window, 'crypto', {
      value: undefined,
      configurable: true,
      writable: true
    });

    const uuid = generateUUID();
    
    // Check format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(uuid.length).toBe(36);
  });

  it('should generate different UUIDs on subsequent calls (fallback)', () => {
    // Mock window to NOT have crypto
    if (global.window) {
      // @ts-ignore
      delete global.window.crypto;
    }

    const uuid1 = generateUUID();
    const uuid2 = generateUUID();
    
    expect(uuid1).not.toBe(uuid2);
  });
});
