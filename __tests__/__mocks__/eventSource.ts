type EventCallback = (event: any) => void;

export class MockEventSource {
  url: string;
  options: any;
  private listeners: Record<string, EventCallback[]> = {};
  close = jest.fn();

  constructor(url: string, options?: any) {
    this.url = url;
    this.options = options;
  }

  addEventListener(event: string, callback: EventCallback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  removeEventListener(event: string, callback: EventCallback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /** Test helper: emit an event to all registered listeners */
  __emit(event: string, data: any) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }

  /** Test helper: emit [DONE] message */
  __emitDone() {
    this.__emit('message', { data: '[DONE]' });
  }

  /** Test helper: emit a SSE chunk */
  __emitChunk(content: string, taskId?: string) {
    const json: any = { choices: [{ delta: { content } }] };
    if (taskId) json.task_id = taskId;
    this.__emit('message', { data: JSON.stringify(json) });
  }

  /** Test helper: emit an error */
  __emitError(error?: any) {
    this.__emit('error', error || { message: 'Connection error' });
  }
}
