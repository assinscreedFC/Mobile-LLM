import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

import { biometricService, biometricSession } from '../../services/biometricService';

const mockLocalAuth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;

beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as any).__secureStoreReset();
  biometricSession.reset();
});

describe('biometricService', () => {
  describe('isAvailable', () => {
    it('returns true when hardware exists and user is enrolled', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);

      expect(await biometricService.isAvailable()).toBe(true);
    });

    it('returns false when no hardware', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);

      expect(await biometricService.isAvailable()).toBe(false);
      expect(mockLocalAuth.isEnrolledAsync).not.toHaveBeenCalled();
    });

    it('returns false when hardware exists but not enrolled', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);

      expect(await biometricService.isAvailable()).toBe(false);
    });
  });

  describe('getSupportedTypes', () => {
    it('delegates to LocalAuthentication.supportedAuthenticationTypesAsync', async () => {
      const mockTypes = [1, 2] as any;
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue(mockTypes);

      const result = await biometricService.getSupportedTypes();
      expect(result).toEqual(mockTypes);
    });
  });

  describe('isEnabled', () => {
    it('returns true when SecureStore has "true"', async () => {
      await SecureStore.setItemAsync('biometric_enabled', 'true');
      expect(await biometricService.isEnabled()).toBe(true);
    });

    it('returns false when SecureStore has no value', async () => {
      expect(await biometricService.isEnabled()).toBe(false);
    });

    it('returns false when SecureStore has non-"true" value', async () => {
      await SecureStore.setItemAsync('biometric_enabled', 'false');
      expect(await biometricService.isEnabled()).toBe(false);
    });
  });

  describe('setEnabled', () => {
    it('stores "true" in SecureStore when enabled', async () => {
      await biometricService.setEnabled(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('biometric_enabled', 'true');
    });

    it('deletes from SecureStore when disabled', async () => {
      await biometricService.setEnabled(false);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('biometric_enabled');
    });
  });

  describe('authenticate', () => {
    it('returns true on success', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true, error: '' } as any);

      expect(await biometricService.authenticate('Unlock')).toBe(true);
      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Unlock',
        fallbackLabel: '',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
    });

    it('returns false on failure', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false, error: 'cancelled' } as any);

      expect(await biometricService.authenticate('Unlock')).toBe(false);
    });
  });
});

describe('biometricSession', () => {
  beforeEach(() => {
    biometricSession.reset();
  });

  it('isVerified returns false initially', () => {
    expect(biometricSession.isVerified()).toBe(false);
  });

  it('markVerified sets isVerified to true', () => {
    biometricSession.markVerified();
    expect(biometricSession.isVerified()).toBe(true);
  });

  it('reset sets isVerified back to false', () => {
    biometricSession.markVerified();
    biometricSession.reset();
    expect(biometricSession.isVerified()).toBe(false);
  });
});
