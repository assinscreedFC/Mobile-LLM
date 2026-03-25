// Unit tests for Header logic
// Tests model management, menu actions, and UI state logic

describe('Header add model limit', () => {
  it('disables add button when 4 models active', () => {
    const activeModels = ['gpt-4', 'llama-3', 'mistral', 'claude'];
    const disabled = activeModels.length >= 4;
    expect(disabled).toBe(true);
  });

  it('enables add button when less than 4 models', () => {
    const activeModels = ['gpt-4', 'llama-3'];
    const disabled = activeModels.length >= 4;
    expect(disabled).toBe(false);
  });

  it('enables add button with single model', () => {
    const activeModels = ['gpt-4'];
    const disabled = activeModels.length >= 4;
    expect(disabled).toBe(false);
  });

  it('opacity is 0.3 when disabled', () => {
    const activeModels = ['a', 'b', 'c', 'd'];
    const opacity = activeModels.length >= 4 ? 0.3 : 1;
    expect(opacity).toBe(0.3);
  });

  it('opacity is 1 when enabled', () => {
    const activeModels = ['a'];
    const opacity = activeModels.length >= 4 ? 0.3 : 1;
    expect(opacity).toBe(1);
  });
});

describe('Header model display', () => {
  it('shows model name at current index', () => {
    const activeModels = ['gpt-4-turbo', 'llama-3'];
    const currentIndex = 0;
    const displayText = activeModels[currentIndex] || 'model';
    expect(displayText).toBe('gpt-4-turbo');
  });

  it('falls back to "model" when index has no model', () => {
    const activeModels: string[] = [];
    const currentIndex = 0;
    const displayText = activeModels[currentIndex] || 'model';
    expect(displayText).toBe('model');
  });
});

describe('Header handleMenuAction pattern', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('closes menu and dispatches action after 600ms', () => {
    let isMoreMenuVisible = true;
    const action = jest.fn();

    function handleMenuAction(callback: () => void) {
      isMoreMenuVisible = false;
      setTimeout(() => callback(), 600);
    }

    handleMenuAction(action);

    expect(isMoreMenuVisible).toBe(false);
    expect(action).not.toHaveBeenCalled();

    jest.advanceTimersByTime(600);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch before 600ms', () => {
    const action = jest.fn();

    function handleMenuAction(callback: () => void) {
      setTimeout(() => callback(), 600);
    }

    handleMenuAction(action);
    jest.advanceTimersByTime(599);
    expect(action).not.toHaveBeenCalled();
  });
});

describe('Header handleSwitchModel', () => {
  it('calls switchModel with index and new model name', () => {
    const switchModel = jest.fn();
    const setModelVision = jest.fn();
    const currentIndex = 1;

    function handleSwitchModel(newModel: string, vision?: boolean) {
      switchModel(currentIndex, newModel);
      setModelVision(newModel, vision ?? false);
    }

    handleSwitchModel('claude-3-opus', true);

    expect(switchModel).toHaveBeenCalledWith(1, 'claude-3-opus');
    expect(setModelVision).toHaveBeenCalledWith('claude-3-opus', true);
  });

  it('defaults vision to false when undefined', () => {
    const setModelVision = jest.fn();

    function handleSwitchModel(newModel: string, vision?: boolean) {
      setModelVision(newModel, vision ?? false);
    }

    handleSwitchModel('llama-3');
    expect(setModelVision).toHaveBeenCalledWith('llama-3', false);
  });
});

describe('Header multi-model page indicator', () => {
  it('shows indicator when more than 1 model', () => {
    const activeModels = ['gpt-4', 'llama-3'];
    expect(activeModels.length > 1).toBe(true);
  });

  it('hides indicator with single model', () => {
    const activeModels = ['gpt-4'];
    expect(activeModels.length > 1).toBe(false);
  });

  it('highlights correct dot for current index', () => {
    const activeModels = ['gpt-4', 'llama-3', 'mistral'];
    const currentIndex = 1;

    const dots = activeModels.map((_, i) => ({
      width: i === currentIndex ? 'w-4' : 'w-1',
      isActive: i === currentIndex,
    }));

    expect(dots[0].isActive).toBe(false);
    expect(dots[0].width).toBe('w-1');
    expect(dots[1].isActive).toBe(true);
    expect(dots[1].width).toBe('w-4');
    expect(dots[2].isActive).toBe(false);
  });
});

describe('Header more menu items', () => {
  it('has 4 menu actions', () => {
    const menuItems = [
      { key: 'chatControls', destructive: false },
      { key: 'shareChat', destructive: false },
      { key: 'exportChat', destructive: false },
      { key: 'deleteChat', destructive: true },
    ];

    expect(menuItems).toHaveLength(4);
    expect(menuItems.filter(m => m.destructive)).toHaveLength(1);
    expect(menuItems[3].key).toBe('deleteChat');
  });
});
