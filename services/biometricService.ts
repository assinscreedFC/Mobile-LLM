/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

let _verifiedThisSession = false;

export const biometricSession = {
  isVerified: (): boolean => _verifiedThisSession,
  markVerified: (): void => { _verifiedThisSession = true; },
  reset: (): void => { _verifiedThisSession = false; },
};

export const biometricService = {
  /** Check if device supports biometric auth */
  isAvailable: async (): Promise<boolean> => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  },

  /** Get supported authentication types */
  getSupportedTypes: async (): Promise<LocalAuthentication.AuthenticationType[]> => {
    return LocalAuthentication.supportedAuthenticationTypesAsync();
  },

  /** Check if user has enabled biometric lock */
  isEnabled: async (): Promise<boolean> => {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  },

  /** Enable/disable biometric lock */
  setEnabled: async (enabled: boolean): Promise<void> => {
    if (enabled) {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
    } else {
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    }
  },

  /** Prompt biometric authentication */
  authenticate: async (promptMessage: string): Promise<boolean> => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: '',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  },
};
