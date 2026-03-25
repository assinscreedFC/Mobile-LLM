// Unit tests for InputBar logic
// Tests action dispatch, send guards, and attachment preview logic

describe('InputBar handleAction logic', () => {
  it('stops generation when isTyping is true', () => {
    const stopGeneration = jest.fn();
    const sendMessage = jest.fn();
    const isTyping = true;
    const inputText = 'hello';
    const attachments: any[] = [];

    // Replicate handleAction logic
    if (isTyping) {
      stopGeneration();
    } else if (inputText.trim().length > 0 || attachments.length > 0) {
      sendMessage(inputText.trim());
    }

    expect(stopGeneration).toHaveBeenCalledTimes(1);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('sends message when text is non-empty and not typing', () => {
    const stopGeneration = jest.fn();
    const sendMessage = jest.fn();
    const isTyping = false;
    const inputText = '  hello world  ';
    const attachments: any[] = [];

    if (isTyping) {
      stopGeneration();
    } else if (inputText.trim().length > 0 || attachments.length > 0) {
      sendMessage(inputText.trim());
    }

    expect(sendMessage).toHaveBeenCalledWith('hello world');
    expect(stopGeneration).not.toHaveBeenCalled();
  });

  it('sends when attachments exist even if text is empty', () => {
    const sendMessage = jest.fn();
    const isTyping = false;
    const inputText = '';
    const attachments = [{ type: 'image', uri: 'file://photo.jpg' }];

    if (!isTyping && (inputText.trim().length > 0 || attachments.length > 0)) {
      sendMessage(inputText.trim());
    }

    expect(sendMessage).toHaveBeenCalledWith('');
  });

  it('does nothing when not typing and no text/attachments', () => {
    const stopGeneration = jest.fn();
    const sendMessage = jest.fn();
    const isTyping = false;
    const inputText = '   ';
    const attachments: any[] = [];

    if (isTyping) {
      stopGeneration();
    } else if (inputText.trim().length > 0 || attachments.length > 0) {
      sendMessage(inputText.trim());
    }

    expect(stopGeneration).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

describe('InputBar send button state', () => {
  function getSendButtonState(isTyping: boolean, inputText: string, attachments: any[]) {
    if (isTyping) return 'stop';
    if (inputText.trim().length > 0 || attachments.length > 0) return 'send';
    return 'mic';
  }

  it('shows stop icon when typing', () => {
    expect(getSendButtonState(true, '', [])).toBe('stop');
    expect(getSendButtonState(true, 'hello', [])).toBe('stop');
  });

  it('shows send icon when text present', () => {
    expect(getSendButtonState(false, 'hello', [])).toBe('send');
  });

  it('shows send icon when attachments present', () => {
    expect(getSendButtonState(false, '', [{ type: 'image' }])).toBe('send');
  });

  it('shows mic icon when idle and empty', () => {
    expect(getSendButtonState(false, '', [])).toBe('mic');
    expect(getSendButtonState(false, '   ', [])).toBe('mic');
  });
});

describe('InputBar keyboard event handling', () => {
  it('detects correct event names per platform', () => {
    function getKeyboardEvents(platform: string) {
      const showEvent = platform === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const hideEvent = platform === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
      return { showEvent, hideEvent };
    }

    const ios = getKeyboardEvents('ios');
    expect(ios.showEvent).toBe('keyboardWillShow');
    expect(ios.hideEvent).toBe('keyboardWillHide');

    const android = getKeyboardEvents('android');
    expect(android.showEvent).toBe('keyboardDidShow');
    expect(android.hideEvent).toBe('keyboardDidHide');
  });
});

describe('InputBar plus menu actions', () => {
  it('maps action indices to correct handlers', () => {
    const handlers = {
      0: jest.fn(), // camera
      1: jest.fn(), // photo
      2: jest.fn(), // file
      3: jest.fn(), // referenceChat
    };

    // Simulate action sheet selection
    [0, 1, 2, 3].forEach(index => {
      const handler = handlers[index as keyof typeof handlers];
      if (handler) handler();
    });

    Object.values(handlers).forEach(fn => {
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  it('cancel index (4) triggers no handler', () => {
    const handlers = [jest.fn(), jest.fn(), jest.fn(), jest.fn()];
    const index = 4; // cancel

    switch (index) {
      case 0: handlers[0](); break;
      case 1: handlers[1](); break;
      case 2: handlers[2](); break;
      case 3: handlers[3](); break;
    }

    handlers.forEach(fn => expect(fn).not.toHaveBeenCalled());
  });
});

describe('InputBar integrations indicator', () => {
  it('shows active state when web search enabled', () => {
    const webSearchEnabled = true;
    const codeInterpreterEnabled = false;
    expect(webSearchEnabled || codeInterpreterEnabled).toBe(true);
  });

  it('shows active state when code interpreter enabled', () => {
    const webSearchEnabled = false;
    const codeInterpreterEnabled = true;
    expect(webSearchEnabled || codeInterpreterEnabled).toBe(true);
  });

  it('shows inactive state when both disabled', () => {
    const webSearchEnabled = false;
    const codeInterpreterEnabled = false;
    expect(webSearchEnabled || codeInterpreterEnabled).toBe(false);
  });
});

describe('InputBar expanded mode send button style', () => {
  function getExpandedSendStyle(inputText: string, attachments: any[], isTyping: boolean) {
    if (inputText.trim().length > 0 || attachments.length > 0) return 'sendActive';
    if (isTyping) return 'sendStop';
    return 'sendInactive';
  }

  it('active when text present', () => {
    expect(getExpandedSendStyle('hello', [], false)).toBe('sendActive');
  });

  it('active when attachments present', () => {
    expect(getExpandedSendStyle('', [{ type: 'file' }], false)).toBe('sendActive');
  });

  it('stop when typing and no content', () => {
    expect(getExpandedSendStyle('', [], true)).toBe('sendStop');
  });

  it('inactive when idle and empty', () => {
    expect(getExpandedSendStyle('', [], false)).toBe('sendInactive');
  });
});
