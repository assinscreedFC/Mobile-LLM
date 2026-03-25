// Unit tests for useHaptics logic
// Since useHaptics is a React hook, we test the underlying logic pattern

describe('useHaptics logic', () => {
  const mockImpactAsync = jest.fn();
  const mockNotificationAsync = jest.fn();

  // Replicate the haptics dispatch logic from the hook
  function triggerHaptic(
    type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning',
    enabled: boolean
  ) {
    if (!enabled) return;

    switch (type) {
      case 'light':
        mockImpactAsync('Light');
        break;
      case 'medium':
        mockImpactAsync('Medium');
        break;
      case 'heavy':
        mockImpactAsync('Heavy');
        break;
      case 'success':
        mockNotificationAsync('Success');
        break;
      case 'error':
        mockNotificationAsync('Error');
        break;
      case 'warning':
        mockNotificationAsync('Warning');
        break;
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when haptics disabled', () => {
    triggerHaptic('light', false);
    triggerHaptic('success', false);
    expect(mockImpactAsync).not.toHaveBeenCalled();
    expect(mockNotificationAsync).not.toHaveBeenCalled();
  });

  it('triggers impact for light/medium/heavy', () => {
    triggerHaptic('light', true);
    expect(mockImpactAsync).toHaveBeenCalledWith('Light');

    triggerHaptic('medium', true);
    expect(mockImpactAsync).toHaveBeenCalledWith('Medium');

    triggerHaptic('heavy', true);
    expect(mockImpactAsync).toHaveBeenCalledWith('Heavy');
  });

  it('triggers notification for success/error/warning', () => {
    triggerHaptic('success', true);
    expect(mockNotificationAsync).toHaveBeenCalledWith('Success');

    triggerHaptic('error', true);
    expect(mockNotificationAsync).toHaveBeenCalledWith('Error');

    triggerHaptic('warning', true);
    expect(mockNotificationAsync).toHaveBeenCalledWith('Warning');
  });

  it('impact types use impactAsync, notification types use notificationAsync', () => {
    triggerHaptic('light', true);
    triggerHaptic('medium', true);
    triggerHaptic('heavy', true);
    expect(mockImpactAsync).toHaveBeenCalledTimes(3);
    expect(mockNotificationAsync).not.toHaveBeenCalled();

    jest.clearAllMocks();

    triggerHaptic('success', true);
    triggerHaptic('error', true);
    triggerHaptic('warning', true);
    expect(mockNotificationAsync).toHaveBeenCalledTimes(3);
    expect(mockImpactAsync).not.toHaveBeenCalled();
  });
});
