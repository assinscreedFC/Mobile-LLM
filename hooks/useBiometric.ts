/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import { useState, useEffect, useCallback } from 'react';
import { biometricService } from '../services/biometricService';

export function useBiometric() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [available, enabled] = await Promise.all([
        biometricService.isAvailable(),
        biometricService.isEnabled(),
      ]);
      setIsAvailable(available);
      setIsEnabled(enabled);
      setLoading(false);
    })();
  }, []);

  const toggle = useCallback(async (value: boolean) => {
    if (value) {
      // Verify biometric before enabling
      const success = await biometricService.authenticate('Confirm to enable biometric lock');
      if (!success) return false;
    }
    await biometricService.setEnabled(value);
    setIsEnabled(value);
    return true;
  }, []);

  return { isAvailable, isEnabled, loading, toggle };
}
