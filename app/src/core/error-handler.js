import { EventBus } from './event/bus.js';

const DEFAULT_STATUS_CODES = {
  validation: 601,
  mutation: 602,
  query: 603,
  storage: 611,
  storage_quota: 612,
  adapter: 620,
  auth: 621,
  timeout: 623,
  sync: 632,
};

function now() {
  return new Date().toISOString();
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'err-' + Math.random().toString(36).slice(2, 10);
}

export class GSError {
  constructor(type, detail, options = {}) {
    this.id = options.id || generateId();
    this.type = type;
    this.status = 'error';
    this.statusCode = DEFAULT_STATUS_CODES[type] || 600;
    this.title = options.title || type;
    this.detail = detail || '';
    this.module = options.module || 'unknown';
    this.trace = options.trace || (new Error().stack);
    this.cause = options.cause || null;
    this.recoverable = options.recoverable !== undefined ? options.recoverable : true;
    this.severity = options.severity || 'medium';
    this.timestamp = now();
    this.context = options.context || {};
  }
}

export class ErrorHandler {
  constructor(eventBus = null) {
    this.eventBus = eventBus || new EventBus();
    this._handlers = new Map();
  }

  createError(type, detail, options = {}) {
    const err = new GSError(type, detail, options);
    // Emit error.occurred
    this.eventBus.emit('error.occurred', { error: err }, { source: 'ErrorHandler' });
    return err;
  }

  recover(errorId, info = {}) {
    this.eventBus.emit('error.recovered', { errorId, info }, { source: 'ErrorHandler' });
  }

  suppress(errorId, reason = '') {
    this.eventBus.emit('error.suppressed', { errorId, reason }, { source: 'ErrorHandler' });
  }

  /**
   * Basic retry helper that runs `fn` and retries on failure according to strategy.
   * strategy: { attempts, backoffMs, multiplier }
   */
  async retry(fn, strategy = { attempts: 3, backoffMs: 200, multiplier: 2 }) {
    let attempt = 0;
    let delay = strategy.backoffMs || 200;
    while (attempt < strategy.attempts) {
      try {
        return await fn();
      } catch (err) {
        attempt += 1;
        if (attempt >= strategy.attempts) throw err;
        // wait
        await new Promise((res) => setTimeout(res, delay));
        delay = Math.floor(delay * (strategy.multiplier || 2));
      }
    }
  }
}

export default ErrorHandler;
