/**
 * Debug utility for conditional logging
 * Only logs when debug flag is enabled
 */

/**
 * DebugLogger provides conditional logging based on debug flag
 */
export class DebugLogger {
  private enabled: boolean;

  constructor(enabled: boolean = false) {
    this.enabled = enabled;
  }

  /**
   * Log warning message (only if debug enabled)
   */
  warn(...args: unknown[]): void {
    if (this.enabled) {
      console.warn(...args);
    }
  }

  /**
   * Log info message (only if debug enabled)
   */
  log(...args: unknown[]): void {
    if (this.enabled) {
      console.log(...args);
    }
  }

  /**
   * Log error message (only if debug enabled)
   */
  error(...args: unknown[]): void {
    if (this.enabled) {
      console.error(...args);
    }
  }

  /**
   * Log debug message (only if debug enabled)
   */
  debug(...args: unknown[]): void {
    if (this.enabled) {
      console.debug(...args);
    }
  }
}
