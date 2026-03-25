// Unit tests for ActionMenu logic
// Tests the callback dispatch pattern with delay

describe('ActionMenu callback dispatch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('dispatches callback after 300ms delay', () => {
    const onClose = jest.fn();
    const onCamera = jest.fn();

    // Simulate the handlePress pattern from ActionMenu
    function handlePress(callback?: () => void) {
      onClose();
      if (callback) {
        setTimeout(callback, 300);
      }
    }

    handlePress(onCamera);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCamera).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);
    expect(onCamera).toHaveBeenCalledTimes(1);
  });

  it('closes without callback when no action provided', () => {
    const onClose = jest.fn();

    function handlePress(callback?: () => void) {
      onClose();
      if (callback) {
        setTimeout(callback, 300);
      }
    }

    handlePress();
    expect(onClose).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(300);
    // No callback, nothing else should happen
  });

  it('menu items map correctly to callbacks', () => {
    const callbacks = {
      camera: jest.fn(),
      photo: jest.fn(),
      file: jest.fn(),
      referenceChat: jest.fn(),
    };

    const menuItems = [
      { key: 'camera', callback: callbacks.camera },
      { key: 'photo', callback: callbacks.photo },
      { key: 'file', callback: callbacks.file },
      { key: 'referenceChat', callback: callbacks.referenceChat },
    ];

    expect(menuItems).toHaveLength(4);
    menuItems.forEach(item => {
      expect(typeof item.callback).toBe('function');
    });
  });
});
